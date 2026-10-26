package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.review.ReviewDto;
import com.indiaschoolfinder.dto.review.ReviewModerationRequest;
import com.indiaschoolfinder.dto.review.ReviewRequest;
import com.indiaschoolfinder.enums.ReviewStatus;

public interface ReviewService {

    PageResponse<ReviewDto> approvedReviews(Long schoolId, int page, int size);

    /** Stores the review as PENDING; it is published only after moderation. */
    ReviewDto submit(Long schoolId, ReviewRequest request);

    PageResponse<ReviewDto> byStatus(ReviewStatus status, int page, int size);

    ReviewDto moderate(Long reviewId, ReviewModerationRequest request);
}
