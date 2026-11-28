package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.seo.IndexNowService;
import com.indiaschoolfinder.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: SEO", description = "Search engine notifications")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin/seo")
public class AdminSeoController {

    private final IndexNowService indexNow;
    private final AuditService auditService;

    public AdminSeoController(IndexNowService indexNow, AuditService auditService) {
        this.indexNow = indexNow;
        this.auditService = auditService;
    }

    @Operation(summary = "Submit sitemap addresses to IndexNow (ADMIN)",
            description = "all=true submits every sitemap address once (after IndexNow is first switched on); otherwise the "
                    + "addresses whose lastmod is within app.indexnow.look-back-days, as the 7:30 AM daily run does. Nothing is "
                    + "sent unless app.indexnow.enabled is true and {site}/{key}.txt serves the key.")
    @PostMapping("/indexnow")
    public IndexNowService.Result indexNow(@RequestParam(defaultValue = "false") boolean all) {
        IndexNowService.Result result = all ? indexNow.submitAll() : indexNow.submitChanged();
        auditService.record("INDEXNOW_SUBMIT", "SITE", null, "all=" + all + ", urls=" + result.urls() + ", submitted=" + result.submitted()
                + ", statuses=" + result.statuses());
        return result;
    }
}
