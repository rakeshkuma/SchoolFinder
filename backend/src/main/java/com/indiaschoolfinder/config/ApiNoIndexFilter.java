package com.indiaschoolfinder.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Marks every API answer "noindex". robots.txt lets search engines fetch the public API, because the pages need it when
 * Google renders them (a blocked request leaves the rendered page empty or showing an error); this header keeps the
 * JSON itself out of search results. Set before the request is handled, so error answers carry it too.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiNoIndexFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("X-Robots-Tag", "noindex");
        chain.doFilter(request, response);
    }
}
