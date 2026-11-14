package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.admin.BatchVerifyRequest;
import com.indiaschoolfinder.dto.admin.FacilityQueueItemDto;
import com.indiaschoolfinder.dto.admin.VerificationHistoryDto;
import com.indiaschoolfinder.dto.admin.VerifyRequest;
import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.admission.AdmissionRequest;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.fee.FeeDto;
import com.indiaschoolfinder.dto.fee.FeeRequest;
import com.indiaschoolfinder.dto.ranking.CriterionScoreDto;
import com.indiaschoolfinder.dto.ranking.CriterionScoreRequest;
import com.indiaschoolfinder.dto.school.BoardingProfileDto;
import com.indiaschoolfinder.dto.school.BoardingProfileRequest;
import com.indiaschoolfinder.dto.school.FacilityDto;
import com.indiaschoolfinder.dto.school.FacilityRequest;
import com.indiaschoolfinder.dto.school.ImageAdminDtos;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.ImageRequest;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolFactsRequest;
import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.dto.school.SchoolStatusRequest;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.BoardingService;
import com.indiaschoolfinder.service.FeeService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.SchoolFactService;
import com.indiaschoolfinder.service.SchoolImageService;
import com.indiaschoolfinder.service.SchoolService;
import com.indiaschoolfinder.service.VerificationService;
import com.indiaschoolfinder.validation.AcademicYear;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

@Tag(name = "Admin: schools", description = "Requires ADMIN or EDITOR (status changes require ADMIN)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin/schools")
public class AdminSchoolController {

    private final SchoolService schoolService;
    private final FeeService feeService;
    private final AdmissionService admissionService;
    private final SchoolImageService imageService;
    private final VerificationService verificationService;
    private final RankingService rankingService;
    private final Validator validator;
    private final BoardingService boardingService;
    private final SchoolFactService factService;

    public AdminSchoolController(SchoolService schoolService, FeeService feeService, AdmissionService admissionService,
                                 SchoolImageService imageService, VerificationService verificationService,
                                 RankingService rankingService, Validator validator, BoardingService boardingService,
                                 SchoolFactService factService) {
        this.boardingService = boardingService;
        this.factService = factService;
        this.schoolService = schoolService;
        this.feeService = feeService;
        this.admissionService = admissionService;
        this.imageService = imageService;
        this.verificationService = verificationService;
        this.rankingService = rankingService;
        this.validator = validator;
    }

    @GetMapping
    public PageResponse<SchoolSummaryDto> list(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) Boolean active,
                                               @RequestParam(defaultValue = "0") @Min(0) int page,
                                               @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return schoolService.adminList(q, active, page, size);
    }

    @Operation(summary = "Full profile including inactive schools; ETag carries the optimistic-lock version")
    @GetMapping("/{id}")
    public ResponseEntity<SchoolDetailDto> get(@PathVariable Long id) {
        SchoolDetailDto dto = schoolService.getById(id);
        return ResponseEntity.ok().eTag(String.valueOf(dto.version())).body(dto);
    }

    @PostMapping
    public ResponseEntity<SchoolDetailDto> create(@Valid @RequestBody SchoolRequest request) {
        SchoolDetailDto created = schoolService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/schools/" + created.id()))
                .eTag(String.valueOf(created.version())).body(created);
    }

    @Operation(summary = "Replace a school profile. Send If-Match with the ETag to prevent lost updates (409 on conflict)")
    @PutMapping("/{id}")
    public ResponseEntity<SchoolDetailDto> update(@PathVariable Long id, @Valid @RequestBody SchoolRequest request,
                                                  @RequestHeader(value = "If-Match", required = false) String ifMatch) {
        SchoolDetailDto updated = schoolService.update(id, request, parseVersion(ifMatch));
        return ResponseEntity.ok().eTag(String.valueOf(updated.version())).body(updated);
    }

    @Operation(summary = "Add or correct classes, map location or city, each citing its own source; other fields are kept")
    @PatchMapping("/{id}/facts")
    public SchoolDetailDto updateFacts(@PathVariable Long id, @Valid @RequestBody SchoolFactsRequest request) {
        return factService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public SchoolDetailDto updateStatus(@PathVariable Long id, @Valid @RequestBody SchoolStatusRequest request) {
        return schoolService.updateStatus(id, request);
    }

    @PostMapping("/{id}/fees")
    @ResponseStatus(HttpStatus.CREATED)
    public FeeDto upsertFee(@PathVariable Long id, @Valid @RequestBody FeeRequest request) {
        return feeService.upsert(id, request);
    }

    @PostMapping("/{id}/admissions")
    @ResponseStatus(HttpStatus.CREATED)
    public AdmissionDto upsertAdmission(@PathVariable Long id, @Valid @RequestBody AdmissionRequest request) {
        return admissionService.upsert(id, request);
    }

    @PostMapping("/{id}/facilities")
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityDto addFacility(@PathVariable Long id, @Valid @RequestBody FacilityRequest request) {
        return schoolService.addFacility(id, request);
    }

    @Operation(summary = "All images of a school, including those whose permission is PENDING or REVOKED")
    @GetMapping("/{id}/images")
    public List<ImageDto> images(@PathVariable Long id) {
        return imageService.listAll(id);
    }

    @Operation(summary = "Register an officially hosted or licensed image by URL (metadata only)")
    @PostMapping(value = "/{id}/images", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageDto registerImage(@PathVariable Long id, @Valid @RequestBody ImageRequest request) {
        return imageService.register(id, request);
    }

    @Operation(summary = "Upload an image to the configured storage provider (Cloudinary). "
            + "Part 'file' is the image; part 'metadata' is the ImageRequest JSON (its url is ignored).")
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageDto uploadImage(@PathVariable Long id, @RequestPart("file") MultipartFile file,
                                @RequestPart("metadata") ImageRequest metadata) {
        // The url is produced by storage, so validate everything except it.
        ImageRequest withPlaceholder = metadata.withUrl("https://upload.pending");
        List<ConstraintViolation<ImageRequest>> violations = List.copyOf(validator.validate(withPlaceholder));
        if (!violations.isEmpty()) {
            throw new BusinessValidationException("Validation failed", violations.stream()
                    .map(v -> new com.indiaschoolfinder.dto.common.ApiError.FieldViolation(v.getPropertyPath().toString(), v.getMessage()))
                    .toList());
        }
        return imageService.upload(id, file, withPlaceholder);
    }

    @Operation(summary = "Possible photographs from Wikimedia Commons and Wikipedia with their stated licences. "
            + "Nothing is stored: add a candidate with POST /images as PENDING, then approve it after checking it.")
    @GetMapping("/{id}/images/candidates")
    public List<ImageAdminDtos.ImageCandidate> imageCandidates(@PathVariable Long id,
                                                                @RequestParam(required = false) @jakarta.validation.constraints.Size(max = 200) String q,
                                                                @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return imageService.candidates(id, q, limit);
    }

    @Operation(summary = "Edit an image's details; a changed licence or permission sends a published image back to PENDING")
    @PutMapping("/{id}/images/{imageId}")
    public ImageDto updateImage(@PathVariable Long id, @PathVariable Long imageId,
                                @Valid @RequestBody ImageAdminDtos.UpdateRequest request) {
        return imageService.update(id, imageId, request);
    }

    @Operation(summary = "Publish an image after checking it shows this school and that the permission is right")
    @PostMapping("/{id}/images/{imageId}/approve")
    public ImageDto approveImage(@PathVariable Long id, @PathVariable Long imageId,
                                 @Valid @RequestBody ImageAdminDtos.ApproveRequest request) {
        return imageService.approve(id, imageId, request);
    }

    @Operation(summary = "Take an image down (wrong school or branch, unclear licence, out of date)")
    @PostMapping("/{id}/images/{imageId}/reject")
    public ImageDto rejectImage(@PathVariable Long id, @PathVariable Long imageId,
                                @Valid @RequestBody ImageAdminDtos.RejectRequest request) {
        return imageService.reject(id, imageId, request);
    }

    @Operation(summary = "Show this image first (card and gallery cover); returns the new order")
    @PostMapping("/{id}/images/{imageId}/primary")
    public List<ImageDto> makePrimaryImage(@PathVariable Long id, @PathVariable Long imageId) {
        return imageService.makePrimary(id, imageId);
    }

    @Operation(summary = "Re-read a Wikimedia Commons image's size, thumbnail, author and licence from Commons")
    @PostMapping("/{id}/images/{imageId}/refresh")
    public ImageDto refreshImage(@PathVariable Long id, @PathVariable Long imageId) {
        return imageService.refreshFromSource(id, imageId);
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        imageService.delete(id, imageId);
    }

    @Operation(summary = "Record a verification decision for the school or one of its records, citing a source")
    @PostMapping("/{id}/verify")
    public VerificationHistoryDto verify(@PathVariable Long id, @Valid @RequestBody VerifyRequest request) {
        return verificationService.verify(id, request);
    }

    @Operation(summary = "Create or replace the school's boarding profile (unverified until checked against its source)")
    @PutMapping("/{id}/boarding")
    public BoardingProfileDto upsertBoarding(@PathVariable Long id, @Valid @RequestBody BoardingProfileRequest request) {
        return boardingService.upsert(id, request);
    }

    @Operation(summary = "Apply one verification decision to several records of the school, citing one source")
    @PostMapping("/{id}/verify/batch")
    public List<VerificationHistoryDto> verifyBatch(@PathVariable Long id, @Valid @RequestBody BatchVerifyRequest request) {
        return verificationService.verifyBatch(id, request);
    }

    @Operation(summary = "Schools with facility records awaiting verification, by name")
    @GetMapping("/facility-verification-queue")
    public PageResponse<FacilityQueueItemDto> facilityQueue(@RequestParam(required = false) @jakarta.validation.constraints.Size(max = 60) String state,
                                                            @RequestParam(defaultValue = "0") @Min(0) int page,
                                                            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return verificationService.facilityQueue(state, page, size);
    }

    @GetMapping("/{id}/verification-history")
    public List<VerificationHistoryDto> verificationHistory(@PathVariable Long id) {
        return verificationService.history(id);
    }

    @Operation(summary = "Add or replace evidence for a ranking criterion (counts only after verification)")
    @PostMapping("/{id}/criterion-scores")
    @ResponseStatus(HttpStatus.CREATED)
    public CriterionScoreDto upsertCriterionScore(@PathVariable Long id, @Valid @RequestBody CriterionScoreRequest request) {
        return rankingService.upsertCriterionScore(id, request);
    }

    @GetMapping("/{id}/criterion-scores")
    public List<CriterionScoreDto> criterionScores(@PathVariable Long id,
                                                   @RequestParam(required = false) @AcademicYear String academicYear) {
        return rankingService.criterionScores(id, academicYear);
    }

    /** Accepts 3, "3" or W/"3". */
    static Long parseVersion(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank() || ifMatch.trim().equals("*")) {
            return null;
        }
        String cleaned = ifMatch.trim().replaceFirst("^W/", "").replace("\"", "");
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            throw new BusinessValidationException("If-Match", "If-Match must contain the ETag returned by GET");
        }
    }
}
