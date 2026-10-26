package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.review.ReviewDto;
import com.indiaschoolfinder.dto.review.ReviewModerationRequest;
import com.indiaschoolfinder.dto.review.ReviewRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolReview;
import com.indiaschoolfinder.enums.ReviewStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SchoolReviewRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.ReviewService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReviewServiceImpl implements ReviewService {

    private final SchoolReviewRepository reviewRepository;
    private final SchoolRepository schoolRepository;
    private final RankingService rankingService;
    private final AuditService auditService;
    private final AuditorAware<String> auditorAware;
    private final Clock clock;

    public ReviewServiceImpl(SchoolReviewRepository reviewRepository, SchoolRepository schoolRepository,
                             RankingService rankingService, AuditService auditService,
                             AuditorAware<String> auditorAware, Clock clock) {
        this.reviewRepository = reviewRepository;
        this.schoolRepository = schoolRepository;
        this.rankingService = rankingService;
        this.auditService = auditService;
        this.auditorAware = auditorAware;
        this.clock = clock;
    }

    @Override
    public PageResponse<ReviewDto> approvedReviews(Long schoolId, int page, int size) {
        requireActiveSchool(schoolId);
        return PageResponse.of(reviewRepository.findBySchoolIdAndStatus(schoolId, ReviewStatus.APPROVED,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))), ReviewServiceImpl::toDto);
    }

    @Override
    @Transactional
    public ReviewDto submit(Long schoolId, ReviewRequest r) {
        requireActiveSchool(schoolId);
        if (!r.consentGiven()) {
            throw new BusinessValidationException("consentGiven", "consent to publish the review is required");
        }
        String title = InputSanitizer.clean(r.title());
        String comment = InputSanitizer.clean(r.comment());
        if (title == null || comment == null) {
            throw new BusinessValidationException("comment", "review text is empty after removing markup");
        }
        SchoolReview review = new SchoolReview();
        review.setSchoolId(schoolId);
        review.setReviewerName(InputSanitizer.clean(r.reviewerName()));
        review.setRelationship(r.relationship());
        review.setRating(r.rating().shortValue());
        review.setTitle(title);
        review.setComment(comment);
        review.setConsentGiven(true);
        review.setStatus(ReviewStatus.PENDING);
        return toDto(reviewRepository.save(review));
    }

    @Override
    public PageResponse<ReviewDto> byStatus(ReviewStatus status, int page, int size) {
        return PageResponse.of(reviewRepository.findByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")))), ReviewServiceImpl::toDto);
    }

    @Override
    @Transactional
    public ReviewDto moderate(Long reviewId, ReviewModerationRequest request) {
        if (request.status() == ReviewStatus.PENDING) {
            throw new BusinessValidationException("status", "moderation must approve or reject");
        }
        SchoolReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));
        ReviewStatus previous = review.getStatus();
        review.setStatus(request.status());
        review.setModerationNote(InputSanitizer.clean(request.note()));
        review.setModeratedBy(auditorAware.getCurrentAuditor().orElse("system"));
        review.setModeratedAt(Instant.now(clock));
        reviewRepository.saveAndFlush(review);

        if (previous != request.status()) {
            refreshSchoolRating(review.getSchoolId());
            rankingService.recalculate(null);
        }
        auditService.record("REVIEW_" + request.status(), "REVIEW", reviewId, "school=" + review.getSchoolId());
        return toDto(review);
    }

    /** Re-computes the denormalised average rating and count from approved reviews. */
    private void refreshSchoolRating(Long schoolId) {
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        List<Object[]> rows = reviewRepository.aggregateForSchool(schoolId, ReviewStatus.APPROVED);
        if (rows.isEmpty()) {
            school.setAverageRating(null);
            school.setReviewCount(0);
        } else {
            Object[] row = rows.get(0);
            school.setAverageRating(BigDecimal.valueOf(((Number) row[1]).doubleValue()).setScale(2, RoundingMode.HALF_UP));
            school.setReviewCount(((Number) row[2]).intValue());
        }
    }

    private void requireActiveSchool(Long schoolId) {
        schoolRepository.findByIdAndActiveTrue(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
    }

    private static ReviewDto toDto(SchoolReview r) {
        return new ReviewDto(r.getId(), r.getSchoolId(), r.getReviewerName(), r.getRelationship(), r.getRating(),
                r.getTitle(), r.getComment(), r.getStatus(), r.getCreatedAt());
    }
}
