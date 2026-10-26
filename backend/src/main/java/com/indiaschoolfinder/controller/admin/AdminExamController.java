package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.exam.ExamDetailDto;
import com.indiaschoolfinder.dto.exam.ExamImportRequest;
import com.indiaschoolfinder.dto.exam.ExamImportResult;
import com.indiaschoolfinder.dto.exam.ExamReviewDto;
import com.indiaschoolfinder.dto.exam.ExamVerifyRequest;
import com.indiaschoolfinder.service.ExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Admin: exams", description = "Import, verify and publish exam records (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin/exams")
public class AdminExamController {

    private final ExamService examService;

    public AdminExamController(ExamService examService) {
        this.examService = examService;
    }

    @Operation(summary = "Every exam record with review flags (stale verification, passed tentative dates, missing notice …)")
    @GetMapping
    public List<ExamReviewDto> review() {
        return examService.review();
    }

    @GetMapping("/{slug}")
    public ExamDetailDto get(@PathVariable String slug) {
        return examService.adminGet(slug);
    }

    @Operation(summary = "Create or replace exam records from the JSON import format; each record replaces its dates and notices")
    @PostMapping("/import")
    public ExamImportResult importExams(@Valid @RequestBody ExamImportRequest request) {
        return examService.importExams(request);
    }

    @Operation(summary = "Record that the exam was re-checked against its official sources")
    @PatchMapping("/{slug}/verification")
    public ExamReviewDto verify(@PathVariable String slug, @Valid @RequestBody ExamVerifyRequest request) {
        return examService.verify(slug, request);
    }

    @PatchMapping("/{slug}/published")
    public ExamReviewDto publish(@PathVariable String slug, @RequestParam boolean value) {
        return examService.setPublished(slug, value);
    }
}
