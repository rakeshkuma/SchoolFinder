package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.ExternalRankingDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingListItemDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingRequest;
import com.indiaschoolfinder.dto.ranking.ExternalRankingVerifyRequest;
import com.indiaschoolfinder.dto.ranking.RankingPublisherDto;
import com.indiaschoolfinder.dto.ranking.RankingPublisherRequest;
import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.CsvImportService;
import com.indiaschoolfinder.service.ExternalRankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Tag(name = "Admin: published rankings", description = "Requires ADMIN or EDITOR (import requires ADMIN)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin")
public class AdminExternalRankingController {

    private final ExternalRankingService service;

    public AdminExternalRankingController(ExternalRankingService service) {
        this.service = service;
    }

    @GetMapping("/ranking-publishers")
    public List<RankingPublisherDto> publishers() {
        return service.publishers(true);
    }

    @Operation(summary = "Add or update a publisher (code e.g. EDUCATIONWORLD), described from its own website")
    @PutMapping("/ranking-publishers/{code}")
    public RankingPublisherDto savePublisher(@PathVariable String code, @Valid @RequestBody RankingPublisherRequest request) {
        return service.savePublisher(code, request);
    }

    @Operation(summary = "All recorded entries, including unverified, disputed and sponsored ones")
    @GetMapping("/external-rankings")
    public PageResponse<ExternalRankingListItemDto> list(@RequestParam(required = false) @Size(max = 40) String publisher,
                                                         @RequestParam(required = false) RankingPublisherKind kind,
                                                         @RequestParam(required = false) @Size(max = 20) String year,
                                                         @RequestParam(required = false) @Size(max = 200) String category,
                                                         @RequestParam(required = false) RankingScope scope,
                                                         @RequestParam(required = false) @Size(max = 100) String region,
                                                         @RequestParam(required = false) VerificationStatus status,
                                                         @RequestParam(required = false) Long schoolId,
                                                         @RequestParam(defaultValue = "0") @Min(0) int page,
                                                         @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return service.adminList(new ExternalRankingService.Filter(publisher, kind, year, category, scope, region, status,
                true, schoolId), page, size);
    }

    @Operation(summary = "Record a school's entry in a published ranking, exactly as printed (saved as UNVERIFIED)")
    @PostMapping("/schools/{schoolId}/external-rankings")
    @ResponseStatus(HttpStatus.CREATED)
    public ExternalRankingDto add(@PathVariable Long schoolId, @Valid @RequestBody ExternalRankingRequest request) {
        return service.add(schoolId, request);
    }

    @Operation(summary = "Correct an entry; it goes back to UNVERIFIED")
    @PutMapping("/external-rankings/{id}")
    public ExternalRankingDto update(@PathVariable Long id, @Valid @RequestBody ExternalRankingRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Record the result of checking an entry against the publisher's page")
    @PostMapping("/external-rankings/{id}/verify")
    public ExternalRankingDto verify(@PathVariable Long id, @Valid @RequestBody ExternalRankingVerifyRequest request) {
        return service.verify(id, request);
    }

    @DeleteMapping("/external-rankings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @Operation(summary = "Import entries from CSV (ADMIN). Every imported or changed entry is UNVERIFIED.",
            description = "mode: VALIDATE_ONLY | ALL_OR_NOTHING (default) | VALID_ROWS_ONLY. Required columns: "
                    + ExternalRankingService.REQUIRED_HEADERS + ". Optional: category, scope, region, rank_position, "
                    + "score_text, sponsored, notes.")
    @PostMapping(value = "/import/external-rankings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CsvImportResult importCsv(@RequestPart("file") MultipartFile file,
                                     @RequestParam(defaultValue = "ALL_OR_NOTHING") CsvImportService.Mode mode) throws IOException {
        if (file.isEmpty()) {
            throw new BusinessValidationException("file", "the CSV file is empty");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".csv")) {
            throw new BusinessValidationException("file", "only .csv files are accepted");
        }
        try (InputStream in = file.getInputStream()) {
            return service.importCsv(in, mode);
        }
    }
}
