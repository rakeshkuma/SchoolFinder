package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.notice.NoticeDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admission and job notices from official sources: lists with filters (the Jobs page) and each notice's own page.
 * Read-only and public; the notices come from the daily check of official websites and from editors.
 */
@Tag(name = "Notices")
@Validated
@RestController
public class NoticeController {

    private final NoticeService notices;

    public NoticeController(NoticeService notices) {
        this.notices = notices;
    }

    @Operation(summary = "Current admission or job notices (category ADMISSION or JOB), open opportunities first, with filters "
            + "and the choices each filter offers. past=true lists those that expired in the last 90 days instead")
    @GetMapping("/api/v1/notices")
    public NoticeDtos.NoticeList list(@RequestParam SiteUpdate.Category category,
                                      @RequestParam(required = false) @Size(max = 2) String state,
                                      @RequestParam(required = false) @Size(max = 12) String sector,
                                      @RequestParam(required = false) @Size(max = 14) String staff,
                                      @RequestParam(required = false) @Size(max = 20) String post,
                                      @RequestParam(required = false) @Size(max = 40) String subject,
                                      @RequestParam(required = false) @Size(max = 20) String status,
                                      @RequestParam(required = false) @Size(max = 12) String classes,
                                      @RequestParam(required = false) @Size(max = 9) String session,
                                      @RequestParam(required = false) @Size(max = 80) String q,
                                      @RequestParam(defaultValue = "false") boolean past,
                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        if (category != SiteUpdate.Category.ADMISSION && category != SiteUpdate.Category.JOB) {
            throw new BusinessValidationException("category must be ADMISSION or JOB");
        }
        return notices.list(category, new NoticeService.Filter(state, sector, staff, post, subject, status, classes, session, q),
                past, page, size);
    }

    @Operation(summary = "One admission or job notice: its facts as the official source states them, its status today, the "
            + "official notice and application links, answers to common questions, and related notices")
    @GetMapping("/api/v1/notices/{slug}")
    public NoticeDtos.NoticeDetail detail(@PathVariable @Pattern(regexp = "^[a-z0-9-]{1,170}$") String slug) {
        return notices.detail(slug);
    }
}
