package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window, per-client-IP rate limiting for sensitive public writes:
 * admin login (brute force), review submission (spam), the fee calculator and search autocomplete.
 *
 * <p>In-memory: limits apply per application instance. For a multi-instance deployment put an
 * equivalent limit on the reverse proxy / API gateway as well. Client IP is
 * request.getRemoteAddr(); behind a proxy set server.forward-headers-strategy=framework so Spring
 * resolves it from X-Forwarded-For safely.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_KEYS = 50_000;

    private record Rule(String name, int limit, Duration window) {
    }

    private static final class Window {
        long startMillis;
        int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final AppProperties.RateLimit config;
    private final JsonSecurityErrorHandler errorHandler;
    private final Clock clock;

    public RateLimitFilter(AppProperties properties, JsonSecurityErrorHandler errorHandler, Clock clock) {
        this.config = properties.getRateLimit();
        this.errorHandler = errorHandler;
        this.clock = clock;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Rule rule = config.isEnabled() ? ruleFor(request) : null;
        if (rule != null && !tryAcquire(rule, request.getRemoteAddr())) {
            response.setHeader("Retry-After", String.valueOf(rule.window().toSeconds()));
            errorHandler.write(response, request, HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
            return;
        }
        chain.doFilter(request, response);
    }

    private Rule ruleFor(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (HttpMethod.GET.matches(request.getMethod()) && path.equals("/api/v1/schools/suggest")) {
            return new Rule("suggest", config.getSuggestionsPerMinute(), Duration.ofMinutes(1));
        }
        if (path.startsWith("/api/v1/account/oauth2/")) {
            // Starting Google sign-in creates a short-lived session; returning from Google is limited the same way.
            return new Rule("google", config.getLoginPerMinute() * 2, Duration.ofMinutes(1));
        }
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return null;
        }
        if (path.equals("/api/v1/auth/login") || path.equals("/api/v1/account/login")) {
            return new Rule("login", config.getLoginPerMinute(), Duration.ofMinutes(1));
        }
        if (path.equals("/api/v1/account/register") || path.equals("/api/v1/account/resend-verification")
                || path.equals("/api/v1/account/forgot-password") || path.equals("/api/v1/account/reset-password")) {
            return new Rule("account-email", config.getAccountEmailsPerHour(), Duration.ofHours(1));
        }
        if (path.matches("^/api/v1/schools/\\d+/reviews$")) {
            return new Rule("review", config.getReviewsPerHour(), Duration.ofHours(1));
        }
        if (path.matches("^/api/v1/schools/\\d+/update-submissions$")) {
            return new Rule("submission", config.getUpdateSubmissionsPerHour(), Duration.ofHours(1));
        }
        if (path.startsWith("/api/v1/fees/")) {
            return new Rule("fees", config.getPublicWritesPerMinute(), Duration.ofMinutes(1));
        }
        if (path.matches("^/api/v1/practice-sets/[a-z0-9-]+/score$")) {
            return new Rule("practice", config.getPublicWritesPerMinute(), Duration.ofMinutes(1));
        }
        return null;
    }

    boolean tryAcquire(Rule rule, String client) {
        long now = clock.millis();
        if (windows.size() > MAX_TRACKED_KEYS) {
            evictExpired(now);
        }
        Window window = windows.computeIfAbsent(rule.name() + "|" + client, k -> new Window());
        synchronized (window) {
            if (now - window.startMillis >= rule.window().toMillis()) {
                window.startMillis = now;
                window.count = 0;
            }
            window.count++;
            return window.count <= rule.limit();
        }
    }

    private void evictExpired(long now) {
        windows.entrySet().removeIf(e -> now - e.getValue().startMillis > Duration.ofHours(1).toMillis());
    }
}
