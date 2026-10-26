package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The browser's view of member sign-in: a CSRF token from the cookie echoed in the header, the HttpOnly session
 * cookie, and sign-out. Runs in its own application context (distinct property) and never uses Spring Security's
 * csrf() test helper, which replaces the CSRF token repository of the shared context.
 */
@TestPropertySource(properties = "app.test.context=account-cookie-flow")
class AccountCookieFlowIT extends AbstractIntegrationTest {

    @Autowired
    private MailService mail;

    private Cookie xsrf;

    private void refreshCsrf() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/account/csrf")).andExpect(status().isOk()).andReturn();
        Cookie c = r.getResponse().getCookie("XSRF-TOKEN");
        if (c != null) {
            xsrf = c;
        }
        assertThat(xsrf).as("XSRF-TOKEN cookie").isNotNull();
        assertThat(xsrf.isHttpOnly()).isFalse(); // the page must be able to read it
    }

    private MvcResult post(String path, Object body, Cookie... extra) throws Exception {
        Cookie[] cookies = new Cookie[extra.length + 1];
        cookies[0] = xsrf;
        System.arraycopy(extra, 0, cookies, 1, extra.length);
        return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/account" + path)
                        .cookie(cookies).header("X-XSRF-TOKEN", xsrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andReturn();
    }

    @Test
    void registerVerifySignInAndSignOutLikeABrowser() throws Exception {
        jdbc.execute("TRUNCATE user_account RESTART IDENTITY CASCADE");
        DevOutboxMailService outbox = (DevOutboxMailService) mail;
        outbox.clear();
        refreshCsrf();

        assertThat(post("/register", Map.of("displayName", "Ravi", "email", "ravi@example.org", "password", "mango season again",
                "acceptTerms", true)).getResponse().getStatus()).isEqualTo(202);
        Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(outbox.messages().get(0).text());
        assertThat(m.find()).isTrue();
        assertThat(post("/verify-email", Map.of("token", m.group(1))).getResponse().getStatus()).isEqualTo(200);

        MvcResult login = post("/login", Map.of("email", "ravi@example.org", "password", "mango season again", "rememberMe", true));
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        Cookie session = login.getResponse().getCookie("ISF_SESSION");
        assertThat(session).isNotNull();
        assertThat(session.isHttpOnly()).isTrue();
        assertThat(session.getMaxAge()).as("keep me signed in → persistent cookie").isGreaterThan(0);
        assertThat(login.getResponse().getContentAsString()).doesNotContain("passwordHash").doesNotContain(session.getValue());

        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isOk());
        // Without the matching header, a forged request from another site fails even with the cookies.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/account/logout")
                .cookie(session, xsrf)).andExpect(status().isForbidden());
        refreshCsrf();
        assertThat(post("/logout", Map.of(), session).getResponse().getStatus()).isEqualTo(204);
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
    }
}
