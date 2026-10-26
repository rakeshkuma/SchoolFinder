package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountApiIT extends AbstractIntegrationTest {

    private static final String PASSWORD = "plum tree by the river";
    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    private MailService mail;

    private DevOutboxMailService outbox() {
        return (DevOutboxMailService) mail;
    }

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE user_account RESTART IDENTITY CASCADE");
        jdbc.execute("DELETE FROM SPRING_SESSION");
        outbox().clear();
    }

    private ResultActions postJson(String path, Object body, Cookie... cookies) throws Exception {
        MockHttpServletRequestBuilder req = post("/api/v1/account" + path).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json(body));
        if (cookies.length > 0) req.cookie(cookies);
        return mockMvc.perform(req);
    }

    private Map<String, Object> registration(String email, String password) {
        Map<String, Object> r = new HashMap<>();
        r.put("displayName", "Asha Verma");
        r.put("email", email);
        r.put("password", password);
        r.put("acceptTerms", true);
        r.put("stateCode", "DL");
        return r;
    }

    private String lastToken(String to) {
        DevOutboxMailService.Message m = outbox().messages().stream().filter(x -> x.to().equals(to)).findFirst().orElseThrow();
        Matcher matcher = TOKEN.matcher(m.text());
        assertThat(matcher.find()).as("link in: " + m.subject()).isTrue();
        return matcher.group(1);
    }

    private void registerAndVerify(String email) throws Exception {
        postJson("/register", registration(email, PASSWORD)).andExpect(status().isAccepted());
        postJson("/verify-email", Map.of("token", lastToken(email))).andExpect(status().isOk());
    }

    private Cookie signIn(String email, String password) throws Exception {
        MvcResult result = postJson("/login", Map.of("email", email, "password", password, "rememberMe", false))
                .andExpect(status().isOk()).andReturn();
        Cookie session = result.getResponse().getCookie("ISF_SESSION");
        assertThat(session).isNotNull();
        assertThat(session.isHttpOnly()).isTrue();
        return session;
    }

    @Test
    void registrationStoresABcryptHashAndRequiresVerificationBeforeSignIn() throws Exception {
        postJson("/register", registration("Asha@Example.org", PASSWORD))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("check-email"));

        String hash = jdbc.queryForObject("SELECT password_hash FROM user_account WHERE email = 'asha@example.org'", String.class);
        assertThat(hash).startsWith("$2a$12$").doesNotContain(PASSWORD);
        assertThat(outbox().messages().get(0).subject()).contains("Confirm your email");

        // Correct password but unverified: a clear, specific answer.
        postJson("/login", Map.of("email", "asha@example.org", "password", PASSWORD))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("EMAIL_NOT_VERIFIED"));

        String token = lastToken("asha@example.org");
        postJson("/verify-email", Map.of("token", token)).andExpect(status().isOk());
        postJson("/verify-email", Map.of("token", token)) // single use
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_LINK"));

        Cookie session = signIn("ASHA@example.org", PASSWORD);
        mockMvc.perform(get("/api/v1/account/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("asha@example.org"))
                .andExpect(jsonPath("$.emailVerified").value(true))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void duplicateRegistrationLooksTheSameAndNotifiesTheOwner() throws Exception {
        registerAndVerify("asha@example.org");
        outbox().clear();
        postJson("/register", registration("asha@example.org", "another long password"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("check-email"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isEqualTo(1);
        assertThat(outbox().messages().get(0).text()).contains("already has an account").doesNotContain("token=");
    }

    @Test
    void invalidEmailWeakPasswordAndMissingConsentAreRejected() throws Exception {
        postJson("/register", registration("not-an-email", PASSWORD)).andExpect(status().isBadRequest());
        postJson("/register", registration("asha@example.org", "short"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
        postJson("/register", registration("asha@example.org", "password123"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].message").value(
                        org.hamcrest.Matchers.containsString("too common")));
        postJson("/register", registration("ashaverma@example.org", "ashaverma is my name"))
                .andExpect(status().isBadRequest());
        Map<String, Object> noConsent = registration("asha@example.org", PASSWORD);
        noConsent.put("acceptTerms", false);
        postJson("/register", noConsent).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
    }

    @Test
    void expiredVerificationLinksDoNotWork() throws Exception {
        postJson("/register", registration("asha@example.org", PASSWORD)).andExpect(status().isAccepted());
        jdbc.update("UPDATE account_token SET expires_at = now() - interval '1 minute'");
        postJson("/verify-email", Map.of("token", lastToken("asha@example.org")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_LINK"));
        // A new link can be requested; the answer never says whether the address exists.
        postJson("/resend-verification", Map.of("email", "asha@example.org")).andExpect(status().isAccepted());
        postJson("/resend-verification", Map.of("email", "nobody@example.org")).andExpect(status().isAccepted());
        postJson("/verify-email", Map.of("token", lastToken("asha@example.org"))).andExpect(status().isOk());
    }

    @Test
    void wrongCredentialsAreGenericAndRepeatedFailuresLockTheAccount() throws Exception {
        registerAndVerify("asha@example.org");
        postJson("/login", Map.of("email", "nobody@example.org", "password", PASSWORD))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("BAD_CREDENTIALS"));
        for (int i = 0; i < 5; i++) {
            postJson("/login", Map.of("email", "asha@example.org", "password", "wrong password " + i))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("BAD_CREDENTIALS"));
        }
        // Locked: even the right password is refused for now, and only the right password learns why.
        postJson("/login", Map.of("email", "asha@example.org", "password", PASSWORD))
                .andExpect(status().isLocked()).andExpect(jsonPath("$.error").value("ACCOUNT_LOCKED"));
        postJson("/login", Map.of("email", "asha@example.org", "password", "still wrong"))
                .andExpect(status().isUnauthorized());
        jdbc.update("UPDATE user_account SET locked_until = now() - interval '1 second'");
        signIn("asha@example.org", PASSWORD);
    }

    @Test
    void signOutInvalidatesTheServerSessionAndExpiresTheCookie() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie session = signIn("asha@example.org", PASSWORD);
        MvcResult out = postJson("/logout", Map.of(), session).andExpect(status().isNoContent()).andReturn();
        Cookie expired = out.getResponse().getCookie("ISF_SESSION");
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        // The old cookie no longer works: the session is gone on the server.
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM SPRING_SESSION", Integer.class)).isZero();
    }

    @Test
    void signInIssuesANewSessionId() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie first = signIn("asha@example.org", PASSWORD);
        MvcResult again = postJson("/login", Map.of("email", "asha@example.org", "password", PASSWORD), first)
                .andExpect(status().isOk()).andReturn();
        Cookie second = again.getResponse().getCookie("ISF_SESSION");
        assertThat(second).isNotNull();
        assertThat(second.getValue()).isNotEqualTo(first.getValue());
        mockMvc.perform(get("/api/v1/account/me").cookie(first)).andExpect(status().isUnauthorized());
    }

    @Test
    void stateChangingAccountRequestsNeedTheCsrfToken() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie session = signIn("asha@example.org", PASSWORD);
        mockMvc.perform(post("/api/v1/account/logout").cookie(session)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/account/login").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "asha@example.org", "password", PASSWORD)))).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/account/logout").cookie(session).header("X-XSRF-TOKEN", "made-up"))
                .andExpect(status().isForbidden());
        // (The real cookie-and-header flow is covered by AccountCookieFlowIT.)
        // Public pages are unaffected and create no session.
        MvcResult publicPage = mockMvc.perform(get("/api/v1/schools")).andExpect(status().isOk()).andReturn();
        assertThat(publicPage.getResponse().getCookie("ISF_SESSION")).isNull();
    }

    @Test
    void forgotPasswordIsGenericAndResetLinksAreSingleUseShortLivedAndEndEverySession() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie session = signIn("asha@example.org", PASSWORD);
        outbox().clear();
        postJson("/forgot-password", Map.of("email", "nobody@example.org")).andExpect(status().isAccepted());
        assertThat(outbox().messages()).isEmpty();
        postJson("/forgot-password", Map.of("email", "asha@example.org")).andExpect(status().isAccepted());
        String token = lastToken("asha@example.org");
        assertThat(jdbc.queryForObject("SELECT token_hash FROM account_token WHERE purpose = 'RESET_PASSWORD' AND used_at IS NULL",
                String.class)).isNotEqualTo(token).hasSize(64);

        postJson("/reset-password", Map.of("token", token, "newPassword", "short")).andExpect(status().isBadRequest());
        postJson("/reset-password", Map.of("token", token, "newPassword", "a brand new long password")).andExpect(status().isOk());
        postJson("/reset-password", Map.of("token", token, "newPassword", "yet another long password"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("INVALID_LINK"));
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        postJson("/login", Map.of("email", "asha@example.org", "password", PASSWORD)).andExpect(status().isUnauthorized());
        signIn("asha@example.org", "a brand new long password");

        postJson("/forgot-password", Map.of("email", "asha@example.org")).andExpect(status().isAccepted());
        jdbc.update("UPDATE account_token SET expires_at = now() - interval '1 second' WHERE used_at IS NULL");
        postJson("/reset-password", Map.of("token", lastToken("asha@example.org"), "newPassword", "one more long password"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void profileAndPasswordChangesNeedTheMemberAndSignOutOtherSessions() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie phone = signIn("asha@example.org", PASSWORD);
        Cookie laptop = signIn("asha@example.org", PASSWORD);

        mockMvc.perform(patch("/api/v1/account/me").with(csrf()).cookie(laptop).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("displayName", "Asha V.", "stateCode", "JH", "city", "Ranchi"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Asha V.")).andExpect(jsonPath("$.city").value("Ranchi"));

        postJson("/change-password", Map.of("currentPassword", "wrong one here", "newPassword", "a brand new long password"), laptop)
                .andExpect(status().isBadRequest());
        MvcResult changed = postJson("/change-password", Map.of("currentPassword", PASSWORD, "newPassword", "a brand new long password"), laptop)
                .andExpect(status().isNoContent()).andReturn();
        Cookie rotated = changed.getResponse().getCookie("ISF_SESSION");
        Cookie current = rotated != null ? rotated : laptop;
        mockMvc.perform(get("/api/v1/account/me").cookie(current)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/account/me").cookie(phone)).andExpect(status().isUnauthorized());
    }

    @Test
    void accountDeletionNeedsThePasswordAndRemovesEverything() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie session = signIn("asha@example.org", PASSWORD);
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("password", "not my password")))).andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("password", PASSWORD)))).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_token", Integer.class)).isZero();
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        postJson("/login", Map.of("email", "asha@example.org", "password", PASSWORD)).andExpect(status().isUnauthorized());
    }

    @Test
    void membersAndStaffStayInTheirOwnAreas() throws Exception {
        registerAndVerify("asha@example.org");
        Cookie session = signIn("asha@example.org", PASSWORD);
        // A member session gives no access to the staff console…
        mockMvc.perform(get("/api/v1/admin/exams").cookie(session)).andExpect(status().isUnauthorized());
        // …and a staff token is not a member session.
        mockMvc.perform(get("/api/v1/account/me").header("Authorization", adminToken())).andExpect(status().isUnauthorized());
        // Signed out, account pages are closed and public pages stay open.
        mockMvc.perform(get("/api/v1/account/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/exams")).andExpect(status().isOk());
        // Registration ignores attempts to choose a role.
        Map<String, Object> sneaky = registration("mallory@example.org", PASSWORD);
        sneaky.put("role", "ADMIN");
        postJson("/register", sneaky).andExpect(status().isBadRequest()); // unknown JSON properties are rejected
    }

    @Test
    void configSaysWhetherEmailCanBeSent() throws Exception {
        mockMvc.perform(get("/api/v1/account/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailDeliveryConfigured").value(true)) // the test profile uses the dev outbox
                .andExpect(jsonPath("$.googleSignInEnabled").value(false))
                .andExpect(jsonPath("$.passwordPolicy").exists());
    }
}
