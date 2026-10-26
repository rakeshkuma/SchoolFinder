package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolRanking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SchoolRankingRepository extends JpaRepository<SchoolRanking, Long>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<SchoolRanking> {

    Optional<SchoolRanking> findBySchoolIdAndAcademicYear(Long schoolId, String academicYear);

    // Scoped lists use RankingSpecifications.inScope (filters, order and positions share one definition).

    @Query("select max(r.academicYear) from SchoolRanking r")
    Optional<String> findLatestAcademicYear();

    @Modifying
    @Query("delete from SchoolRanking r where r.academicYear = :academicYear")
    void deleteByAcademicYear(@Param("academicYear") String academicYear);

    long countByAcademicYearAndProvisionalTrue(String academicYear);

    long countByAcademicYearAndProvisionalFalse(String academicYear);
}
