package com.indiaschoolfinder.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Authenticates "Authorization: Bearer &lt;jwt&gt;" requests. The account is re-loaded on each request
 * so disabling an administrator or changing their role takes effect immediately rather than at
 * token expiry. Invalid tokens simply leave the request unauthenticated (→ 401 on protected paths).
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final AdminUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, AdminUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER) && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtService.parse(header.substring(BEARER.length()).trim()).ifPresent(principal -> {
                try {
                    UserDetails user = userDetailsService.loadUserByUsername(principal.username());
                    if (user.isEnabled() && user.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_" + principal.role().name()))) {
                        var auth = UsernamePasswordAuthenticationToken.authenticated(user.getUsername(), null, user.getAuthorities());
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                } catch (UsernameNotFoundException ignored) {
                    // Account deleted after the token was issued: stay unauthenticated.
                }
            });
        }
        chain.doFilter(request, response);
    }
}
