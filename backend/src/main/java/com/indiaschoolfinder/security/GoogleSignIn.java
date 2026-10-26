package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * "Continue with Google" (OpenID Connect authorization code flow, handled by Spring Security: state and nonce are
 * checked and the ID token's signature, issuer, audience and expiry are verified against Google's published keys).
 * Nothing here exists unless GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, so the site never offers a Google
 * button that cannot work. The endpoints live under the account API so they pass through the same proxy as the rest
 * of the API; the redirect URI to register with Google is {@link #redirectUri}.
 */
@Configuration
public class GoogleSignIn {

    public static final String AUTHORIZATION_BASE = "/api/v1/account/oauth2/authorization";
    public static final String CALLBACK_PATTERN = "/api/v1/account/oauth2/code/*";
    static final String NEXT = "isf.google.next";
    static final String REMEMBER = "isf.google.remember";

    /** The redirect URI Google sends the browser back to; must be registered in the Google Cloud console. */
    public static String redirectUri(AppProperties properties) {
        String base = properties.getAccount().getLinkBaseUrl();
        if (base == null || base.isBlank()) {
            base = properties.getPublicSiteUrl();
        }
        // Without a configured site address, use the address the request came in on.
        String prefix = base == null || base.isBlank() ? "{baseUrl}" : base.trim().replaceAll("/+$", "");
        return prefix + "/api/v1/account/oauth2/code/{registrationId}";
    }

    public static ClientRegistration googleRegistration(AppProperties properties) {
        AppProperties.Account.Google google = properties.getAccount().getGoogle();
        return CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(google.getClientId().trim())
                .clientSecret(google.getClientSecret().trim())
                .scope("openid", "email", "profile")
                .redirectUri(redirectUri(properties))
                .build();
    }

    @Bean
    @Conditional(Configured.class)
    public ClientRegistrationRepository googleClientRegistrations(AppProperties properties) {
        return new InMemoryClientRegistrationRepository(googleRegistration(properties));
    }

    /** True when both the Google client id and secret are set (blank values from Docker Compose count as unset). */
    static class Configured implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            Binder binder = Binder.get(context.getEnvironment());
            String id = binder.bind("app.account.google.client-id", String.class).orElse("");
            String secret = binder.bind("app.account.google.client-secret", String.class).orElse("");
            return !id.isBlank() && !secret.isBlank();
        }
    }

    /**
     * Starts the flow. Remembers (in the server-side session, which also holds Spring's state and nonce) where to
     * return afterwards — only a path on this site — and whether "keep me signed in" was chosen. Google is asked to
     * show its account chooser so a shared computer does not silently reuse someone else's Google account.
     */
    static OAuth2AuthorizationRequestResolver resolver(ClientRegistrationRepository registrations) {
        DefaultOAuth2AuthorizationRequestResolver delegate =
                new DefaultOAuth2AuthorizationRequestResolver(registrations, AUTHORIZATION_BASE);
        delegate.setAuthorizationRequestCustomizer(b -> b.additionalParameters(p -> p.put("prompt", "select_account")));
        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                return remember(request, delegate.resolve(request));
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
                return remember(request, delegate.resolve(request, clientRegistrationId));
            }
        };
    }

    private static OAuth2AuthorizationRequest remember(HttpServletRequest request, OAuth2AuthorizationRequest authorization) {
        if (authorization != null) {
            var session = request.getSession(true);
            session.setAttribute(NEXT, safeNext(request.getParameter("next")));
            session.setAttribute(REMEMBER, "1".equals(request.getParameter("remember")));
        }
        return authorization;
    }

    /** A path on this site, or /account. Rejects other origins, "//host", backslashes and control characters. */
    static String safeNext(String next) {
        if (next == null || next.isEmpty() || next.length() > 512 || !next.startsWith("/") || next.startsWith("//")
                || next.contains("\\") || next.chars().anyMatch(c -> c < 0x20 || c == 0x7f)) {
            return "/account";
        }
        return next;
    }

    /** Google access and refresh tokens are not needed after sign-in, so they are never stored. */
    static final class NoStoredTokens implements OAuth2AuthorizedClientRepository {
        @Override
        public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String id, Authentication principal, HttpServletRequest request) {
            return null;
        }

        @Override
        public void saveAuthorizedClient(OAuth2AuthorizedClient client, Authentication principal, HttpServletRequest request,
                                         HttpServletResponse response) {
        }

        @Override
        public void removeAuthorizedClient(String id, Authentication principal, HttpServletRequest request, HttpServletResponse response) {
        }
    }
}
