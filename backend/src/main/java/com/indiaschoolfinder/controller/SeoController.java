package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.service.SeoHeadService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * Page-specific &lt;head&gt; tags for the app shell. nginx requests /api/v1/seo/head/&lt;page path&gt; as a server-side
 * include while serving index.html (see frontend/nginx.conf), so every page is delivered with its own title,
 * description, canonical URL and structured data.
 */
@Hidden
@RestController
// No transaction here: a lookup that finds nothing (an unknown slug) must not mark a surrounding transaction
// rollback-only, because SeoHeadService turns that case into a normal noindex response.
public class SeoController {

    static final String PREFIX = "/api/v1/seo/head";
    static final String BODY_PREFIX = "/api/v1/seo/body";
    private static final MediaType HTML = MediaType.parseMediaType("text/html;charset=UTF-8");

    private final SeoHeadService seoHeadService;
    private final com.indiaschoolfinder.service.SeoBodyService seoBodyService;
    private final AppProperties properties;

    public SeoController(SeoHeadService seoHeadService, com.indiaschoolfinder.service.SeoBodyService seoBodyService,
                         AppProperties properties) {
        this.seoBodyService = seoBodyService;
        this.seoHeadService = seoHeadService;
        this.properties = properties;
    }

    @GetMapping(PREFIX + "/**")
    public ResponseEntity<String> head(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length() + PREFIX.length());
        String body = seoHeadService.head(path.isEmpty() ? "/" : path, SitemapController.baseUrl(properties, request));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic())
                .contentType(HTML).body(body);
    }

    /** The page's main content as plain HTML for the app's root element (empty for private or unknown pages). */
    @GetMapping(BODY_PREFIX + "/**")
    public ResponseEntity<String> body(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length() + BODY_PREFIX.length());
        String body = seoBodyService.body(path.isEmpty() ? "/" : path, SitemapController.baseUrl(properties, request));
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic())
                .contentType(HTML).body(body);
    }
}
