package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {

    Optional<SchoolClass> findByCodeIgnoreCase(String code);

    List<SchoolClass> findByCodeIn(Collection<String> codes);

    List<SchoolClass> findAllByOrderBySortOrderAsc();
}
