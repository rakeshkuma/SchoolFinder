package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.AdmissionSchedule;
import com.indiaschoolfinder.enums.AdmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface AdmissionScheduleRepository extends JpaRepository<AdmissionSchedule, Long>,
        JpaSpecificationExecutor<AdmissionSchedule> {

    List<AdmissionSchedule> findBySchoolIdOrderByAcademicYearDescClassIdAsc(Long schoolId);

    List<AdmissionSchedule> findBySchoolIdInAndStatusIn(java.util.Collection<Long> schoolIds,
                                                        java.util.Collection<com.indiaschoolfinder.enums.AdmissionStatus> statuses);

    List<AdmissionSchedule> findByStatusOverriddenFalse();

    /** Upcoming or currently open cycles at active schools, soonest deadline first. */
    @Query("""
            select a from AdmissionSchedule a
            where a.status in :statuses
              and (a.applicationEndDate is null or a.applicationEndDate >= :today)
              and exists (select 1 from School s where s.id = a.schoolId and s.active = true)
            order by coalesce(a.applicationEndDate, a.applicationStartDate) asc nulls last, a.id asc
            """)
    Page<AdmissionSchedule> findUpcoming(@Param("statuses") Collection<AdmissionStatus> statuses,
                                         @Param("today") LocalDate today, Pageable pageable);

    long countByApplicationStartDateIsNullAndApplicationEndDateIsNull();
}
