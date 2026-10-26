package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.enums.AdminRole;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = "app.rate-limit.login-per-minute=5")
class AuthIT extends AbstractIntegrationTest {

    @Test
    void loginIssuesShortLivedBearerTokenThatGrantsAdminAccess() throws Exception {
        String response = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", ADMIN, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInSeconds").value(900))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(response).get("accessToken").asText();

        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void wrongPasswordAndUnknownUserGetTheSameGeneric401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", ADMIN, "password", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "nobody", "password", "whatever-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void expiredAndTamperedTokensAreRejected() throws Exception {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("test-only-secret-key-that-is-long-enough-0123456789");
        props.getJwt().setAccessTokenTtl(Duration.ofMinutes(15));
        JwtService pastService = new JwtService(props, Clock.fixed(Instant.now().minus(Duration.ofHours(1)), ZoneOffset.UTC));
        String expired = pastService.issue(ADMIN, AdminRole.ADMIN).value();
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());

        String valid = jwtService.issue(ADMIN, AdminRole.ADMIN).value();
        String tampered = valid.substring(0, valid.length() - 4) + "AAAA";
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());

        AppProperties other = new AppProperties();
        other.getJwt().setSecret("a-completely-different-secret-key-0123456789abcdef");
        String forged = new JwtService(other, Clock.systemUTC()).issue(ADMIN, AdminRole.ADMIN).value();
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenClaimingAHigherRoleThanTheAccountHasIsRejected() throws Exception {
        String escalated = jwtService.issue(EDITOR, AdminRole.ADMIN).value();
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer " + escalated))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginIsRateLimited() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login").with(r -> { r.setRemoteAddr("10.9.9.9"); return r; })
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("username", "attacker", "password", "guess-" + i))));
        }
        mockMvc.perform(post("/api/v1/auth/login").with(r -> { r.setRemoteAddr("10.9.9.9"); return r; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", ADMIN, "password", PASSWORD))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    void corsAllowsOnlyConfiguredOrigins() throws Exception {
        mockMvc.perform(get("/api/v1/boards").header("Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mockMvc.perform(get("/api/v1/boards").header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden());
    }
}
