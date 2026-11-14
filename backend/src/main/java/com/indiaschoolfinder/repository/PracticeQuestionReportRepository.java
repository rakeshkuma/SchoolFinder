package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.PracticeQuestionReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PracticeQuestionReportRepository extends JpaRepository<PracticeQuestionReport, Long> {

    Page<PracticeQuestionReport> findByStatusOrderByCreatedAtDescIdDesc(PracticeQuestionReport.Status status, Pageable pageable);

    /** Rows: set slug, number of open reports. */
    @Query("select r.setSlug, count(r) from PracticeQuestionReport r where r.status = 'OPEN' group by r.setSlug")
    List<Object[]> countOpenBySet();
}
