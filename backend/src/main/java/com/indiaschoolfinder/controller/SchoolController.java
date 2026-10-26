package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.fee.FeeDto;
import com.indiaschoolfinder.dto.location.SuggestionDto;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDetailDto;
import com.indiaschoolfinder.dto.review.ReviewDto;
import com.indiaschoolfinder.dto.review.ReviewRequest;
import com.indiaschoolfinder.dto.school.FacilityDto;
import com.indiaschoolfinder.dto.school.FactSourceDto;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.FeeService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.ReviewService;
import com.indiaschoolfinder.dto.submission.UpdateSubmissionRequest;
import com.indiaschoolfinder.service.SchoolFactService;
import com.indiaschoolfinder.service.UpdateSubmissionService;
import com.indiaschoolfinder.service.SchoolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Schools", description = "Public school directory, profiles and related data")
@RestController
@RequestMapping("/api/v1/schools")
public class SchoolController {

    private final SchoolService schoolService;
    private final FeeService feeService;
    private final AdmissionService admissionService;
    private final RankingService rankingService;
    private final ReviewService reviewService;
    private final SchoolFactService factService;
    private final UpdateSubmissionService submissionService;

    public SchoolController(SchoolService schoolService, FeeService feeService, AdmissionService admissionService,
                            RankingService rankingService, ReviewService reviewService, SchoolFactService factService,
                            UpdateSubmissionService submissionService) {
        this.factService = factService;
        this.submissionService = submissionService;
        this.schoolService = schoolService;
        this.feeService = feeService;
        this.admissionService = admissionService;
        this.rankingService = rankingService;
        this.reviewService = reviewService;
    }

    @Operation(summary = "Paginated school directory with filters",
            description = "Filters: name, locality, state (ISO code or slug), district (slug), city, pinCode, board, "
                    + "schoolType, management, network, className, stage, minAnnualFee, maxAnnualFee "
                    + "(official recurring annual fee for feeAcademicYear, default current), admissionStatus, minRating, "
                    + "hasHostel (true = boarding, false = day), hasTransport, medium, genderType, "
                    + "facility (categories, all required), latitude+longitude+radiusKm. "
                    + "sortBy: name, fee (lowest published annual fee; schools without fees last), locality, city, "
                    + "rating, reviews, newest, updated, verified, distance.")
    @GetMapping
    public PageResponse<SchoolSummaryDto> list(@Valid @ModelAttribute SchoolSearchCriteria criteria) {
        return schoolService.search(criteria);
    }

    @Operation(summary = "Free-text search (q matches name, locality, address or PIN) plus all directory filters")
    @GetMapping("/search")
    public PageResponse<SchoolSummaryDto> search(@Valid @ModelAttribute SchoolSearchCriteria criteria) {
        return schoolService.search(criteria);
    }

    @Operation(summary = "Autocomplete: schools plus matching states, districts and cities (q needs 2+ characters)")
    @GetMapping("/suggest")
    public SuggestionDto suggest(@RequestParam @Size(max = 100) String q,
                                 @RequestParam(defaultValue = "6") @Min(1) @Max(10) int limit) {
        return schoolService.suggest(q, limit);
    }

    @Operation(summary = "Featured schools: those with a real photograph cleared for publication, verified profiles first",
            description = "Not a ranking or an endorsement. state: optional ISO code or slug.")
    @GetMapping("/featured")
    public List<SchoolSummaryDto> featured(@RequestParam(required = false) @Size(max = 80) String state,
                                           @RequestParam(defaultValue = "8") @Min(1) @Max(24) int limit) {
        return schoolService.featured(state, limit);
    }

    @Operation(summary = "Schools near a point, nearest first (haversine distance in km)")
    @GetMapping("/nearby")
    public List<SchoolSummaryDto> nearby(
            @RequestParam @DecimalMin("-90") @DecimalMax("90") double latitude,
            @RequestParam @DecimalMin("-180") @DecimalMax("180") double longitude,
            @RequestParam(defaultValue = "3") @DecimalMin("0.1") @DecimalMax("50") double radiusKm,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long excludeSchoolId) {
        return schoolService.nearby(latitude, longitude, radiusKm, limit, excludeSchoolId);
    }

    @Operation(summary = "School profile by id")
    @GetMapping("/{id}")
    public SchoolDetailDto get(@PathVariable Long id) {
        return schoolService.getActiveById(id);
    }

    @Operation(summary = "School profile by URL slug")
    @GetMapping("/slug/{slug}")
    public SchoolDetailDto getBySlug(@PathVariable String slug) {
        return schoolService.getActiveBySlug(slug);
    }

    @Operation(summary = "Fee history by academic year and class")
    @GetMapping("/{id}/fees")
    public List<FeeDto> fees(@PathVariable Long id) {
        return feeService.feeHistory(id);
    }

    @Operation(summary = "Admission cycles (general, EWS/DG, CWSN) with requirements")
    @GetMapping("/{id}/admissions")
    public List<AdmissionDto> admissions(@PathVariable Long id) {
        return admissionService.bySchool(id);
    }

    @GetMapping("/{id}/facilities")
    public List<FacilityDto> facilities(@PathVariable Long id) {
        return schoolService.facilities(id);
    }

    @Operation(summary = "Suggest an update or correction, citing the official page that states it (reviewed by an editor; rate limited)")
    @PostMapping("/{id}/update-submissions")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public java.util.Map<String, String> suggestUpdate(@PathVariable Long id, @Valid @RequestBody UpdateSubmissionRequest request) {
        submissionService.submit(id, request);
        return java.util.Map.of("status", "received");
    }

    @Operation(summary = "Sources of profile facts (classes, map location, city) taken from other than the profile's main source")
    @GetMapping("/{id}/fact-sources")
    public List<FactSourceDto> factSources(@PathVariable Long id) {
        return factService.sources(id);
    }

    @GetMapping("/{id}/images")
    public List<ImageDto> images(@PathVariable Long id) {
        return schoolService.images(id);
    }

    @Operation(summary = "This site's ranking (with breakdown) and independently published rankings")
    @GetMapping("/{id}/ranking")
    public SchoolRankingDetailDto ranking(@PathVariable Long id) {
        return rankingService.forSchool(id);
    }

    @Operation(summary = "Approved parent reviews")
    @GetMapping("/{id}/reviews")
    public PageResponse<ReviewDto> reviews(@PathVariable Long id,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return reviewService.approvedReviews(id, page, size);
    }

    @Operation(summary = "Submit a review (held for moderation; rate limited; no personal contact data collected)")
    @PostMapping("/{id}/reviews")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ReviewDto submitReview(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return reviewService.submit(id, request);
    }
}
