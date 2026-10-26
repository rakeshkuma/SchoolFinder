package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.enums.ResidentialSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface SchoolBoardingRepository extends JpaRepository<SchoolBoarding, Long> {

    List<SchoolBoarding> findBySchoolIdIn(Collection<Long> schoolIds);

    /** Boarding schools per residential system, among active schools (for directory facets). */
    @Query("""
            select b.residentialSystem, count(b) from SchoolBoarding b, School s
            where s.id = b.schoolId and s.active = true
            group by b.residentialSystem""")
    List<Object[]> countActiveBySystem();

    long countByResidentialSystem(ResidentialSystem system);
}
