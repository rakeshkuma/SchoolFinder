package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolReview;
import com.indiaschoolfinder.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SchoolReviewRepository extends JpaRepository<SchoolReview, Long> {

    Page<SchoolReview> findBySchoolIdAndStatus(Long schoolId, ReviewStatus status, Pageable pageable);

    Page<SchoolReview> findByStatus(ReviewStatus status, Pageable pageable);

    long countByStatus(ReviewStatus status);

    /** [schoolId, avg(rating), count] for approved reviews. */
    @Query("select r.schoolId, avg(r.rating), count(r) from SchoolReview r where r.status = :status and r.schoolId = :schoolId group by r.schoolId")
    List<Object[]> aggregateForSchool(@Param("schoolId") Long schoolId, @Param("status") ReviewStatus status);
}
