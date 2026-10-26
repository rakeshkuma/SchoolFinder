package com.indiaschoolfinder.security;

import com.indiaschoolfinder.entity.UserAccount;
import com.indiaschoolfinder.exception.AccountException;
import com.indiaschoolfinder.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Turns a verified Google identity into a member session (the same server-side session as password sign-in, with a
 * new session id) and sends the browser back to the site. Failures return to the sign-in page with a short reason
 * code; nothing from Google (tokens, codes, claims) is logged.
 */
@Slf4j
@Component
public class GoogleSignInHandler implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private final AccountService accountService;
    private final MemberSessions sessions;

    public GoogleSignInHandler(AccountService accountService, MemberSessions sessions) {
        this.accountService = accountService;
        this.sessions = sessions;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        HttpSession session = request.getSession(false);
        String next = session != null && session.getAttribute(GoogleSignIn.NEXT) instanceof String s ? s : "/account";
        boolean remember = session != null && Boolean.TRUE.equals(session.getAttribute(GoogleSignIn.REMEMBER));
        if (!(authentication.getPrincipal() instanceof OidcUser user)) {
            fail(request, response, "failed");
            return;
        }
        UserAccount account;
        try {
            account = accountService.signInWithGoogle(user.getSubject(), user.getEmail(), user.getEmailVerified(), user.getFullName());
        } catch (AccountException e) {
            fail(request, response, switch (e.getCode()) {
                case "GOOGLE_EMAIL_UNVERIFIED" -> "unverified";
                case "GOOGLE_ACCOUNT_MISMATCH" -> "mismatch";
                default -> "failed";
            });
            return;
        }
        if (session != null) {
            session.removeAttribute(GoogleSignIn.NEXT);
            session.removeAttribute(GoogleSignIn.REMEMBER);
        }
        // Replaces Spring's Google authentication in the session with the member principal (and a new session id).
        sessions.signIn(request, response, account.getId(), remember);
        redirect(response, GoogleSignIn.safeNext(next));
    }

    /**
     * A relative redirect, so the browser stays on the address it is using. sendRedirect would make it absolute from
     * the Host header, which behind a proxy that rewrites Host (the Vite dev proxy) points at the backend itself.
     */
    private static void redirect(HttpServletResponse response, String path) {
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", path);
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        String code = exception instanceof OAuth2AuthenticationException e ? e.getError().getErrorCode() : "unknown";
        log.info("Google sign-in did not complete: {}", code);
        fail(request, response, "access_denied".equals(code) ? "cancelled" : "failed");
    }

    private void fail(HttpServletRequest request, HttpServletResponse response, String reason) throws IOException {
        sessions.signOut(request, response);
        redirect(response, "/signin?google=" + reason);
    }
}
