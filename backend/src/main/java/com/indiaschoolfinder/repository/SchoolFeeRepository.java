package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SchoolFeeRepository extends JpaRepository<SchoolFee, Long> {

    List<SchoolFee> findBySchoolIdOrderByAcademicYearDescClassIdAsc(Long schoolId);

    List<SchoolFee> findBySchoolIdInAndRecurringAnnualOfficialIsNotNull(Collection<Long> schoolIds);

    Optional<SchoolFee> findBySchoolIdAndClassIdAndAcademicYear(Long schoolId, Long classId, String academicYear);

    List<SchoolFee> findBySchoolIdInAndClassIdAndAcademicYear(Collection<Long> schoolIds, Long classId, String academicYear);

    @Query("select max(f.academicYear) from SchoolFee f where f.schoolId in :schoolIds and f.classId = :classId")
    Optional<String> findLatestAcademicYear(@Param("schoolIds") Collection<Long> schoolIds, @Param("classId") Long classId);

    @Query("select count(distinct f.schoolId) from SchoolFee f where f.academicYear = :academicYear")
    long countSchoolsWithFees(@Param("academicYear") String academicYear);

    @Query("select distinct f.schoolId from SchoolFee f where f.academicYear = :academicYear")
    List<Long> findSchoolIdsWithFees(@Param("academicYear") String academicYear);
}
