package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.District;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DistrictRepository extends JpaRepository<District, Long> {

    Optional<District> findByStateCodeAndNameIgnoreCase(String stateCode, String name);

    Optional<District> findByStateCodeAndSlug(String stateCode, String slug);

    boolean existsByStateCodeAndSlug(String stateCode, String slug);

    List<District> findByIdIn(Collection<Long> ids);

    /** Rows: id, name, slug, active school count. Includes districts that currently have no active school. */
    @Query("""
            select d.id, d.name, d.slug, count(s.id) from District d
            left join School s on s.districtId = d.id and s.active = true
            where d.stateCode = :stateCode
            group by d.id, d.name, d.slug
            order by d.name""")
    List<Object[]> findWithSchoolCounts(@Param("stateCode") String stateCode);

    @Query("select d from District d where lower(d.name) like :pattern escape '\\' order by d.name")
    List<District> search(@Param("pattern") String pattern, Pageable pageable);
}
