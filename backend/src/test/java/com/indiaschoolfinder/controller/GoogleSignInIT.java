package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.security.GoogleSignIn;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Continue with Google" end to end against a local stand-in for Google's OpenID Connect endpoints: the backend
 * redirects to the authorization endpoint, exchanges the code over HTTP, and verifies a real RS256-signed ID token
 * (signature from the JWK set, issuer, audience, expiry, nonce) exactly as it would with Google. Only the endpoint
 * addresses differ from the production registration, which {@link #productionRegistrationPointsAtGoogle} checks.
 */
@TestPropertySource(properties = "app.test.context=google-sign-in")
class GoogleSignInIT extends AbstractIntegrationTest {

    private static final String CLIENT_ID = "test-client.apps.example";
    private static final RSAKey KEY;
    private static final HttpServer FAKE_GOOGLE;
    private static final String ISSUER;
    private static final ObjectMapper JSON = new ObjectMapper();

    /** Claims the fake Google returns for the next sign-in, and the nonce the backend sent. */
    private static volatile Map<String, Object> nextUser;
    private static volatile String nonce;

    static {
        try {
            KEY = new RSAKeyGenerator(2048).keyID("test-key").generate();
            FAKE_GOOGLE = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            ISSUER = "http://127.0.0.1:" + FAKE_GOOGLE.getAddress().getPort();
            FAKE_GOOGLE.createContext("/token", GoogleSignInIT::token);
            FAKE_GOOGLE.createContext("/jwks", ex -> respond(ex, new JWKSet(KEY.toPublicJWK()).toString()));
            FAKE_GOOGLE.createContext("/userinfo", ex -> respond(ex, JSON.writeValueAsString(nextUser)));
            FAKE_GOOGLE.start();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @TestConfiguration
    static class FakeGoogle {
        @Bean
        ClientRegistrationRepository fakeGoogleRegistration() {
            return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("google")
                    .clientId(CLIENT_ID).clientSecret("test-secret")
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("{baseUrl}/api/v1/account/oauth2/code/{registrationId}")
                    .scope("openid", "email", "profile")
                    .authorizationUri(ISSUER + "/auth").tokenUri(ISSUER + "/token").jwkSetUri(ISSUER + "/jwks")
                    .userInfoUri(ISSUER + "/userinfo").userNameAttributeName("sub").issuerUri(ISSUER)
                    .build());
        }
    }

    private static void token(HttpExchange ex) throws IOException {
        try {
            Instant now = Instant.now();
            JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder().issuer(ISSUER).audience(CLIENT_ID)
                    .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(300))).claim("nonce", nonce);
            nextUser.forEach(claims::claim);
            claims.subject((String) nextUser.get("sub"));
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).type(JOSEObjectType.JWT).build(),
                    claims.build());
            jwt.sign(new RSASSASigner(KEY));
            respond(ex, JSON.writeValueAsString(Map.of("access_token", "fake-access-token", "token_type", "Bearer",
                    "expires_in", 300, "scope", "openid email profile", "id_token", jwt.serialize())));
        } catch (Exception e) {
            throw new IOException(e);
        }
    }

    private static void respond(HttpExchange ex, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(200, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.close();
    }

    @Autowired
    private MailService mail;

    @Autowired
    private AppProperties properties;

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE user_account RESTART IDENTITY CASCADE");
        ((DevOutboxMailService) mail).clear();
    }

    private static Map<String, Object> user(String sub, String email, boolean verified, String name) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", sub);
        claims.put("email", email);
        claims.put("email_verified", verified);
        claims.put("name", name);
        return claims;
    }

    /** Clicks "Continue with Google", lets the fake Google approve, and returns the callback's response. */
    private MvcResult continueWithGoogle(Map<String, Object> googleUser, String next, boolean remember) throws Exception {
        var start = get("/api/v1/account/oauth2/authorization/google").param("next", next);
        if (remember) {
            start.param("remember", "1");
        }
        MvcResult redirect = mockMvc.perform(start).andExpect(status().isFound()).andReturn();
        String location = redirect.getResponse().getRedirectedUrl();
        assertThat(location).startsWith(ISSUER + "/auth?");
        var query = UriComponentsBuilder.fromUriString(location).build().getQueryParams();
        assertThat(query.getFirst("client_id")).isEqualTo(CLIENT_ID);
        assertThat(URLDecoder.decode(query.getFirst("scope"), StandardCharsets.UTF_8)).isEqualTo("openid email profile");
        assertThat(query.getFirst("prompt")).isEqualTo("select_account");
        String state = URLDecoder.decode(query.getFirst("state"), StandardCharsets.UTF_8);
        nonce = URLDecoder.decode(query.getFirst("nonce"), StandardCharsets.UTF_8);
        Cookie flowSession = redirect.getResponse().getCookie("ISF_SESSION");
        assertThat(flowSession).as("the flow's state is kept in the server-side session").isNotNull();
        nextUser = googleUser;
        return mockMvc.perform(get("/api/v1/account/oauth2/code/google").param("code", "one-time-code").param("state", state)
                .cookie(flowSession)).andReturn();
    }

    @Test
    void newGoogleUserGetsAVerifiedAccountWithoutPasswordAndASession() throws Exception {
        MvcResult callback = continueWithGoogle(user("g-100", "Meera.Iyer@Example.org", true, "Meera Iyer"), "/exams/jnvst", true);
        assertThat(callback.getResponse().getStatus()).isEqualTo(302);
        assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("/exams/jnvst");
        Cookie session = callback.getResponse().getCookie("ISF_SESSION");
        assertThat(session).isNotNull();
        assertThat(session.isHttpOnly()).isTrue();
        assertThat(session.getMaxAge()).as("keep me signed in").isGreaterThan(0);

        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("meera.iyer@example.org"))
                .andExpect(jsonPath("$.displayName").value("Meera Iyer"))
                .andExpect(jsonPath("$.emailVerified").value(true))
                .andExpect(jsonPath("$.hasPassword").value(false))
                .andExpect(jsonPath("$.googleLinked").value(true));
        assertThat(jdbc.queryForObject("SELECT password_hash IS NULL FROM user_account", Boolean.class)).isTrue();
        // No Google tokens are kept anywhere in the session store.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session_attributes "
                + "WHERE position('fake-access-token'::bytea in attribute_bytes) > 0", Integer.class)).isZero();

        // Password sign-in is not possible for this account (generic answer).
        mockMvc.perform(post("/api/v1/account/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "meera.iyer@example.org", "password", "any password at all"))))
                .andExpect(status().isUnauthorized());

        // Signing in again with the same Google account reuses the account.
        MvcResult again = continueWithGoogle(user("g-100", "meera.iyer@example.org", true, "Meera Iyer"), "/account", false);
        assertThat(again.getResponse().getRedirectedUrl()).isEqualTo("/account");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isEqualTo(1);
    }

    @Test
    void unsafeReturnAddressFallsBackToTheAccountPage() throws Exception {
        MvcResult callback = continueWithGoogle(user("g-101", "a@example.org", true, "A"), "//evil.example/x", false);
        assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("/account");
    }

    @Test
    void unverifiedGoogleEmailIsRefused() throws Exception {
        MvcResult callback = continueWithGoogle(user("g-102", "b@example.org", false, "B"), "/account", false);
        assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("/signin?google=unverified");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
        Cookie session = callback.getResponse().getCookie("ISF_SESSION");
        if (session != null) {
            mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void forgedOrMissingStateIsRejected() throws Exception {
        MvcResult start = mockMvc.perform(get("/api/v1/account/oauth2/authorization/google")).andReturn();
        nextUser = user("g-103", "c@example.org", true, "C");
        MvcResult callback = mockMvc.perform(get("/api/v1/account/oauth2/code/google").param("code", "x").param("state", "forged")
                .cookie(start.getResponse().getCookie("ISF_SESSION"))).andReturn();
        assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("/signin?google=failed");
        // A callback without any started flow (e.g. replayed from another browser) fails too.
        MvcResult noFlow = mockMvc.perform(get("/api/v1/account/oauth2/code/google").param("code", "x").param("state", "y")).andReturn();
        assertThat(noFlow.getResponse().getRedirectedUrl()).isEqualTo("/signin?google=failed");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
    }

    @Test
    void cancellingAtGoogleReturnsToSignIn() throws Exception {
        MvcResult start = mockMvc.perform(get("/api/v1/account/oauth2/authorization/google")).andReturn();
        String state = URLDecoder.decode(UriComponentsBuilder.fromUriString(start.getResponse().getRedirectedUrl()).build()
                .getQueryParams().getFirst("state"), StandardCharsets.UTF_8);
        MvcResult callback = mockMvc.perform(get("/api/v1/account/oauth2/code/google").param("error", "access_denied")
                .param("state", state).cookie(start.getResponse().getCookie("ISF_SESSION"))).andReturn();
        assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("/signin?google=cancelled");
    }

    @Test
    void verifiedPasswordAccountIsLinkedAndKeepsItsPassword() throws Exception {
        insertPasswordAccount("ravi@example.org", "mango season again", true);
        MvcResult callback = continueWithGoogle(user("g-200", "ravi@example.org", true, "Ravi K"), "/account", false);
        Cookie session = callback.getResponse().getCookie("ISF_SESSION");
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Ravi")) // the member's own name is kept
                .andExpect(jsonPath("$.hasPassword").value(true)).andExpect(jsonPath("$.googleLinked").value(true));
        mockMvc.perform(post("/api/v1/account/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "ravi@example.org", "password", "mango season again")))).andExpect(status().isOk());
        assertThat(((DevOutboxMailService) mail).messages()).anyMatch(m -> m.subject().contains("Google sign-in was added"));

        // A different Google account with the same email cannot take it over.
        MvcResult other = continueWithGoogle(user("g-999", "ravi@example.org", true, "Someone"), "/account", false);
        assertThat(other.getResponse().getRedirectedUrl()).isEqualTo("/signin?google=mismatch");
    }

    @Test
    void unverifiedPasswordAccountLosesThePasswordSetByWhoeverCreatedIt() throws Exception {
        // Someone registered this address without owning the mailbox; the real owner then signs in with Google.
        insertPasswordAccount("owner@example.org", "attacker chosen secret", false);
        continueWithGoogle(user("g-300", "owner@example.org", true, "Owner"), "/account", false);
        assertThat(jdbc.queryForObject("SELECT password_hash IS NULL AND email_verified_at IS NOT NULL FROM user_account",
                Boolean.class)).isTrue();
        mockMvc.perform(post("/api/v1/account/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "owner@example.org", "password", "attacker chosen secret"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void googleOnlyAccountDeletionNeedsTheEmailAndARecentSignIn() throws Exception {
        Cookie session = continueWithGoogle(user("g-400", "del@example.org", true, "Del"), "/account", false)
                .getResponse().getCookie("ISF_SESSION");
        mockMvc.perform(post("/api/v1/account/change-password").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("currentPassword", "x", "newPassword", "a brand new long password"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("confirmEmail", "someone@example.org")))).andExpect(status().isBadRequest());
        // A sign-in older than the allowed window needs a fresh Google sign-in first.
        Duration window = properties.getAccount().getRecentSignIn();
        properties.getAccount().setRecentSignIn(Duration.ZERO);
        try {
            mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("confirmEmail", "del@example.org"))))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("REAUTH_REQUIRED"));
        } finally {
            properties.getAccount().setRecentSignIn(window);
        }
        mockMvc.perform(delete("/api/v1/account/me").with(csrf()).cookie(session).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("confirmEmail", "Del@example.org")))).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/account/me").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_account", Integer.class)).isZero();
    }

    @Test
    void configReportsGoogleSignIn() throws Exception {
        mockMvc.perform(get("/api/v1/account/config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.googleSignInEnabled").value(true));
    }

    @Test
    void productionRegistrationPointsAtGoogle() {
        AppProperties properties = new AppProperties();
        properties.getAccount().setLinkBaseUrl("https://schools.example.in/");
        properties.getAccount().getGoogle().setClientId("id.apps.googleusercontent.com");
        properties.getAccount().getGoogle().setClientSecret("secret");
        ClientRegistration google = GoogleSignIn.googleRegistration(properties);
        assertThat(google.getProviderDetails().getAuthorizationUri()).startsWith("https://accounts.google.com/");
        assertThat(google.getProviderDetails().getIssuerUri()).isEqualTo("https://accounts.google.com");
        assertThat(google.getScopes()).containsExactlyInAnyOrder("openid", "email", "profile");
        assertThat(google.getRedirectUri()).isEqualTo("https://schools.example.in/api/v1/account/oauth2/code/{registrationId}");
        assertThat(google.getClientId()).isEqualTo("id.apps.googleusercontent.com");
    }

    private void insertPasswordAccount(String email, String password, boolean verified) {
        jdbc.update("INSERT INTO user_account (email, display_name, password_hash, email_verified_at, terms_accepted_at, "
                        + "terms_version, password_changed_at, created_at, updated_at) VALUES (?, ?, ?, "
                        + (verified ? "now()" : "NULL") + ", now(), 'test', now(), now(), now())",
                email, email.startsWith("ravi") ? "Ravi" : "Someone", passwordEncoder.encode(password));
    }
}
