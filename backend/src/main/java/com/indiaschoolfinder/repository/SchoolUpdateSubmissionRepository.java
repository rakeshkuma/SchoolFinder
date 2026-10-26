package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolUpdateSubmission;
import com.indiaschoolfinder.enums.SubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolUpdateSubmissionRepository extends JpaRepository<SchoolUpdateSubmission, Long> {

    /** Oldest first, so the queue is worked in the order people wrote in. */
    Page<SchoolUpdateSubmission> findByStatusOrderByCreatedAtAscIdAsc(SubmissionStatus status, Pageable pageable);

    long countByStatus(SubmissionStatus status);
}
