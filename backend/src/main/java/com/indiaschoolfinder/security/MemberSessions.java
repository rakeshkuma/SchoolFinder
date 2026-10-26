package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.security.web.authentication.SpringSessionRememberMeServices;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Server-side member sessions (Spring Session, stored in PostgreSQL; the browser holds only an HttpOnly cookie).
 * Signing in always issues a new session id (no session fixation); signing out invalidates the session and expires
 * the cookie; a password reset or account deletion ends every session of that member.
 */
@Component
public class MemberSessions {

    private static final String SIGNED_IN_AT = "isf.signedInAt";

    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    private final FindByIndexNameSessionRepository<? extends Session> sessions;
    private final AppProperties properties;

    public MemberSessions(FindByIndexNameSessionRepository<? extends Session> sessions, AppProperties properties) {
        this.sessions = sessions;
        this.properties = properties;
    }

    public void signIn(HttpServletRequest request, HttpServletResponse response, long accountId, boolean rememberMe) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        HttpSession session = request.getSession(true);
        session.setAttribute(SIGNED_IN_AT, System.currentTimeMillis());
        if (rememberMe) {
            session.setMaxInactiveInterval((int) properties.getAccount().getRememberMe().toSeconds());
            // Tells the cookie serializer to make the cookie persistent for the same period.
            request.setAttribute(SpringSessionRememberMeServices.REMEMBER_ME_LOGIN_ATTR, true);
        }
        var authentication = UsernamePasswordAuthenticationToken.authenticated(new MemberPrincipal(accountId), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }

    /** When this browser's session signed in (re-authentication checks), or null. */
    public Instant signedInAt(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session != null && session.getAttribute(SIGNED_IN_AT) instanceof Long millis ? Instant.ofEpochMilli(millis) : null;
    }

    /** Ends this browser's session; safe to call when already signed out. */
    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
    }

    /** Issues a new id for the current session (after a password change). */
    public void rotate(HttpServletRequest request) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
    }

    /** Ends every session of the member except the one with {@code keepSessionId} (may be null to end all). */
    public void revokeAll(long accountId, String keepSessionId) {
        sessions.findByPrincipalName(MemberPrincipal.nameOf(accountId)).keySet().stream()
                .filter(id -> !id.equals(keepSessionId))
                .forEach(sessions::deleteById);
    }
}
