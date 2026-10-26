package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolFactSource;
import com.indiaschoolfinder.enums.SchoolFact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchoolFactSourceRepository extends JpaRepository<SchoolFactSource, Long> {

    List<SchoolFactSource> findBySchoolId(Long schoolId);

    Optional<SchoolFactSource> findBySchoolIdAndFact(Long schoolId, SchoolFact fact);
}
