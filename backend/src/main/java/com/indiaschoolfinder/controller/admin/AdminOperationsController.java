package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.admin.AuditLogDto;
import com.indiaschoolfinder.dto.admin.CoverageReport;
import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.admin.DataQualityReport;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.CriterionWeightsRequest;
import com.indiaschoolfinder.dto.ranking.RankingMethodologyDto;
import com.indiaschoolfinder.dto.review.ReviewDto;
import com.indiaschoolfinder.dto.review.ReviewModerationRequest;
import com.indiaschoolfinder.enums.ReviewStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.CsvImportService;
import com.indiaschoolfinder.service.DataQualityService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.ReviewService;
import com.indiaschoolfinder.validation.AcademicYear;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

@Tag(name = "Admin: operations", description = "Import, data quality, moderation, ranking configuration and audit")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin")
public class AdminOperationsController {

    private final CsvImportService importService;
    private final DataQualityService dataQualityService;
    private final ReviewService reviewService;
    private final RankingService rankingService;
    private final AdmissionService admissionService;
    private final AuditService auditService;

    public AdminOperationsController(CsvImportService importService, DataQualityService dataQualityService,
                                     ReviewService reviewService, RankingService rankingService,
                                     AdmissionService admissionService, AuditService auditService) {
        this.importService = importService;
        this.dataQualityService = dataQualityService;
        this.reviewService = reviewService;
        this.rankingService = rankingService;
        this.admissionService = admissionService;
        this.auditService = auditService;
    }

    @Operation(summary = "Import schools from CSV (ADMIN). Every row is validated before anything is saved.",
            description = "mode: VALIDATE_ONLY | ALL_OR_NOTHING (default) | VALID_ROWS_ONLY. Required columns: "
                    + CsvImportService.REQUIRED_HEADERS)
    @PostMapping(value = "/import/csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CsvImportResult importCsv(@RequestPart("file") MultipartFile file,
                                     @RequestParam(defaultValue = "ALL_OR_NOTHING") CsvImportService.Mode mode,
                                     @RequestParam(defaultValue = "false") boolean updateExisting) throws IOException {
        if (file.isEmpty()) {
            throw new BusinessValidationException("file", "the CSV file is empty");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".csv")) {
            throw new BusinessValidationException("file", "only .csv files are accepted");
        }
        try (InputStream in = file.getInputStream()) {
            return importService.importSchools(in, mode, updateExisting);
        }
    }

    @Operation(summary = "Import schools from JSON (ADMIN). Same columns, modes and checks as the CSV import.",
            description = "A JSON array of objects (or {\"schools\": [...]}) keyed by the CSV column names; list values "
                    + "such as class_codes may be arrays. Error rows are 1-based positions in the array.")
    @PostMapping(value = "/import/json", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CsvImportResult importJson(@RequestPart("file") MultipartFile file,
                                      @RequestParam(defaultValue = "ALL_OR_NOTHING") CsvImportService.Mode mode,
                                      @RequestParam(defaultValue = "false") boolean updateExisting) throws IOException {
        if (file.isEmpty()) {
            throw new BusinessValidationException("file", "the JSON file is empty");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".json")) {
            throw new BusinessValidationException("file", "only .json files are accepted");
        }
        try (InputStream in = file.getInputStream()) {
            return importService.importJson(in, mode, updateExisting);
        }
    }

    @GetMapping("/data-quality")
    public DataQualityReport dataQuality() {
        return dataQualityService.report();
    }

    @Operation(summary = "Per-state coverage: schools imported, verified, and missing photos, fees, contacts or locations",
            description = "Counts only what this database holds; it does not claim a state is completely covered.")
    @GetMapping("/coverage")
    public CoverageReport coverage() {
        return dataQualityService.coverage();
    }

    @GetMapping("/reviews")
    public PageResponse<ReviewDto> reviews(@RequestParam(defaultValue = "PENDING") ReviewStatus status,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return reviewService.byStatus(status, page, size);
    }

    @PatchMapping("/reviews/{id}")
    public ReviewDto moderate(@PathVariable Long id, @Valid @RequestBody ReviewModerationRequest request) {
        return reviewService.moderate(id, request);
    }

    @Operation(summary = "Change ranking criterion weights (ADMIN); active weights must sum to 100")
    @PutMapping("/ranking-criteria")
    public RankingMethodologyDto updateWeights(@Valid @RequestBody CriterionWeightsRequest request) {
        return rankingService.updateWeights(request);
    }

    @PostMapping("/rankings/recalculate")
    public Map<String, Object> recalculate(@RequestParam(required = false) @AcademicYear String academicYear) {
        int rows = rankingService.recalculate(academicYear);
        auditService.record("RANKINGS_RECALCULATED", "RANKING", null, "year=" + academicYear + ", rows=" + rows);
        return Map.of("scoredSchools", rows);
    }

    @PostMapping("/admissions/refresh-status")
    public Map<String, Object> refreshAdmissionStatuses() {
        return Map.of("changed", admissionService.refreshStatuses());
    }

    @GetMapping("/audit-log")
    public PageResponse<AuditLogDto> auditLog(@RequestParam(defaultValue = "0") @Min(0) int page,
                                              @RequestParam(defaultValue = "50") @Min(1) @Max(200) int size) {
        return auditService.recent(page, size);
    }
}
