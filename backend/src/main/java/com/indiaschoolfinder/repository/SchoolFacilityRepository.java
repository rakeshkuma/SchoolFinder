package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SchoolFacilityRepository extends JpaRepository<SchoolFacility, Long> {

    List<SchoolFacility> findBySchoolIdOrderByCategoryAscNameAsc(Long schoolId);

    List<SchoolFacility> findBySchoolIdInOrderByCategoryAscNameAsc(Collection<Long> schoolIds);

    boolean existsBySchoolIdAndCategoryAndNameIgnoreCase(Long schoolId, FacilityCategory category, String name);

    /** Facility statements in the given categories that state availability, for the ranking checklists. */
    List<SchoolFacility> findByCategoryInAndAvailableIsNotNullAndVerificationStatusIn(
            Collection<FacilityCategory> categories, Collection<VerificationStatus> statuses);

    /** Active schools (optionally in one state; '' = all) that have facility records with the given status, by name. */
    @Query(value = """
            select s.id from School s
            where s.active = true and (:stateCode = '' or s.stateCode = :stateCode)
              and exists (select 1 from SchoolFacility f where f.schoolId = s.id and f.verificationStatus = :status)
            order by s.name, s.id""",
            countQuery = """
            select count(s) from School s
            where s.active = true and (:stateCode = '' or s.stateCode = :stateCode)
              and exists (select 1 from SchoolFacility f where f.schoolId = s.id and f.verificationStatus = :status)""")
    Page<Long> findSchoolIdsWithFacilityStatus(@Param("stateCode") String stateCode,
                                               @Param("status") VerificationStatus status, Pageable pageable);
}
