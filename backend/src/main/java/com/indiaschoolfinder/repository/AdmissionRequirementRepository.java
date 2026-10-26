package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.AdmissionRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AdmissionRequirementRepository extends JpaRepository<AdmissionRequirement, Long> {

    List<AdmissionRequirement> findByAdmissionScheduleIdInOrderByAdmissionScheduleIdAscSortOrderAsc(Collection<Long> scheduleIds);

    @Modifying
    @Query("delete from AdmissionRequirement r where r.admissionScheduleId = :scheduleId")
    void deleteByScheduleId(@Param("scheduleId") Long scheduleId);
}
