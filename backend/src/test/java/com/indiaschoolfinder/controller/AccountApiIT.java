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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The member account API once signed in. Members sign in with Google only; GoogleSignInIT covers that flow. */
class AccountApiIT extends AbstractIntegrationTest {

    @Autowired
    private MailService mail;

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE user_account RESTART IDENTITY CASCADE");
        jdbc.execute("DELETE FROM SPRING_SESSION");
        ((DevOutboxMailService) mail).clear();
    }

    @Test
    void emailAndPasswordSignUpAndSignInNoLongerExist() throws Exception {
        for (String path : new String[]{"/register", "/login", "/verify-email", "/resend-verification", "/forgot-password",
                "/reset-password", "/change-password"}) {
            int code = mockMvc.perform(post("/api/v1/account" + path).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("email", "asha@example.org", "password", "plum tree by the river"))))
                    .andReturn().getResponse().getStatus();
            assertThat(code).as(path).isIn(401, 403, 404, 405);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
    }

    @Test
    void signOutInvalidatesTheServerSessionAndExpiresTheCookie() throws Exception {
        Cookie session = memberSession("asha@example.org");
        MvcResult out = mockMvc.perform(post("/api/v1/account/logout").with(csrf()).cookie(session)).andExpect(status().isNoContent()).andReturn();
        Cookie expired = out.getResponse().getCookie("ISF_SESSION");
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        // The old cookie no longer works: the session is gone on the server.
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM SPRING_SESSION", Integer.class)).isZero();
    }

    @Test
    void stateChangingAccountRequestsNeedTheCsrfToken() throws Exception {
        Cookie session = memberSession("asha@example.org");
        mockMvc.perform(post("/api/v1/account/logout").cookie(session)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/account/logout").cookie(session).header("X-XSRF-TOKEN", "made-up"))
                .andExpect(status().isForbidden());
        // (The real cookie-and-header flow is covered by AccountCookieFlowIT.)
        // Public pages are unaffected and create no session.
        MvcResult publicPage = mockMvc.perform(get("/api/v1/schools")).andExpect(status().isOk()).andReturn();
        assertThat(publicPage.getResponse().getCookie("ISF_SESSION")).isNull();
    }

    @Test
    void theProfileCanBeUpdatedByTheMember() throws Exception {
        Cookie session = memberSession("asha@example.org");
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("asha@example.org")).andExpect(jsonPath("$.googleLinked").value(true))
                .andExpect(jsonPath("$.hasPassword").doesNotExist());
        mockMvc.perform(patch("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("displayName", "Asha V.", "stateCode", "JH", "city", "Ranchi", "mobile", "+91 9876543210"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value("Asha V.")).andExpect(jsonPath("$.city").value("Ranchi"))
                .andExpect(jsonPath("$.mobile").value("9876543210"));
    }

    @Test
    void accountDeletionNeedsTheEmailAndRemovesEverything() throws Exception {
        Cookie session = memberSession("asha@example.org");
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("confirmEmail", "someone@example.org")))).andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("confirmEmail", "Asha@Example.org")))).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void membersAndStaffStayInTheirOwnAreas() throws Exception {
        Cookie session = memberSession("asha@example.org");
        // A member session gives no access to the staff console…
        mockMvc.perform(get("/api/v1/admin/exams").cookie(session)).andExpect(status().isUnauthorized());
        // …and a staff token is not a member session.
        mockMvc.perform(get("/api/v1/account/me").header("Authorization", adminToken())).andExpect(status().isUnauthorized());
        // Signed out, account pages are closed and public pages stay open.
        mockMvc.perform(get("/api/v1/account/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/exams")).andExpect(status().isOk());
    }

    @Test
    void configSaysWhetherGoogleSignInIsAvailable() throws Exception {
        mockMvc.perform(get("/api/v1/account/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.googleSignInEnabled").value(false))
                .andExpect(jsonPath("$.termsVersion").exists())
                .andExpect(jsonPath("$.passwordPolicy").doesNotExist());
    }
}
