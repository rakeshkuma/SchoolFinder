package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolCriterionScore;
import com.indiaschoolfinder.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolCriterionScoreRepository extends JpaRepository<SchoolCriterionScore, Long> {

    List<SchoolCriterionScore> findByAcademicYearAndVerificationStatus(String academicYear, VerificationStatus status);

    List<SchoolCriterionScore> findBySchoolIdAndAcademicYear(Long schoolId, String academicYear);

    Optional<SchoolCriterionScore> findBySchoolIdAndCriterionIdAndAcademicYear(Long schoolId, Long criterionId, String academicYear);
}
