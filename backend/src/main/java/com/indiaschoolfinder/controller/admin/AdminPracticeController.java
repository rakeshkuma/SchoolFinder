package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.PracticeAdminDtos;
import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.entity.PracticeQuestionReport;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.PracticeAdminService;
import com.indiaschoolfinder.service.PracticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Tag(name = "Admin: practice", description = "Practice sets and question reports (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin")
public class AdminPracticeController {

    /** A question bank file is small; anything larger is a mistake. */
    private static final long MAX_CSV_BYTES = 1024 * 1024;

    private final PracticeService practiceService;
    private final PracticeAdminService adminService;

    public AdminPracticeController(PracticeService practiceService, PracticeAdminService adminService) {
        this.practiceService = practiceService;
        this.adminService = adminService;
    }

    @Operation(summary = "Create or replace practice sets from the JSON import format")
    @PostMapping("/practice-sets/import")
    public Map<String, List<String>> importSets(@Valid @RequestBody PracticeImportRequest request) {
        return Map.of("slugs", practiceService.importSets(request));
    }

    @Operation(summary = "Every practice set, published or not, with what needs checking")
    @GetMapping("/practice-sets")
    public List<PracticeAdminDtos.SetRow> sets() {
        return adminService.sets();
    }

    @PatchMapping("/practice-sets/{slug}/published")
    public PracticeAdminDtos.SetRow publish(@PathVariable String slug, @Valid @RequestBody PracticeAdminDtos.PublishRequest request) {
        return adminService.publish(slug, request);
    }

    @Operation(summary = "Record that every question, answer and explanation of the set was re-checked today")
    @PostMapping("/practice-sets/{slug}/review")
    public PracticeAdminDtos.SetRow review(@PathVariable String slug,
                                           @Valid @RequestBody(required = false) PracticeAdminDtos.ReviewRequest request) {
        return adminService.review(slug, request);
    }

    @Operation(summary = "The set in the JSON import format, answers included, to edit and import again")
    @GetMapping("/practice-sets/{slug}/export")
    public ResponseEntity<PracticeImportRequest> export(@PathVariable String slug) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"practice-" + slug.replaceAll("[^a-z0-9-]", "") + ".json\"")
                .body(adminService.export(slug));
    }

    @Operation(summary = "Replace a set's questions from CSV; the set is unpublished until it is reviewed again")
    @PostMapping(value = "/practice-sets/{slug}/questions/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PracticeAdminDtos.CsvImportResult importCsv(@PathVariable String slug, @RequestPart("file") MultipartFile file)
            throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(java.util.Locale.ROOT);
        if (file.isEmpty() || !name.endsWith(".csv")) {
            throw new BusinessValidationException("file", "choose a .csv file");
        }
        if (file.getSize() > MAX_CSV_BYTES) {
            throw new BusinessValidationException("file", "the file is larger than 1 MB");
        }
        return adminService.importCsv(slug, file.getInputStream());
    }

    @GetMapping("/practice-reports")
    public PageResponse<PracticeAdminDtos.ReportRow> reports(
            @RequestParam(defaultValue = "OPEN") PracticeQuestionReport.Status status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return adminService.reports(status, page, size);
    }

    @PatchMapping("/practice-reports/{id}")
    public PracticeAdminDtos.ReportRow resolve(@PathVariable long id, @Valid @RequestBody PracticeAdminDtos.ResolveRequest request) {
        return adminService.resolve(id, request);
    }
}
