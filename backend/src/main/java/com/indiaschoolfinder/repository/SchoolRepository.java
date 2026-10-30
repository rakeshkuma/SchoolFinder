package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.School;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SchoolRepository extends JpaRepository<School, Long>, JpaSpecificationExecutor<School> {

    @EntityGraph(attributePaths = "classesOffered")
    Optional<School> findWithClassesById(Long id);

    @EntityGraph(attributePaths = "classesOffered")
    Optional<School> findWithClassesBySlugAndActiveTrue(String slug);

    @EntityGraph(attributePaths = "classesOffered")
    List<School> findWithClassesByIdIn(Collection<Long> ids);

    Optional<School> findByIdAndActiveTrue(Long id);

    /** Board codes that have at least one active school (board directory pages listed in the sitemap). */
    @Query("select distinct s.educationBoardCode from School s where s.active = true and s.educationBoardCode is not null "
            + "order by s.educationBoardCode")
    List<String> boardCodesWithSchools();

    /** Rows of (school id, class name, class sort order) for the cards' "Classes" line, in one query per page. */
    @Query("select s.id, c.name, c.sortOrder from School s join s.classesOffered c where s.id in :ids")
    List<Object[]> findClassesForSchools(@Param("ids") Collection<Long> ids);

    boolean existsBySlug(String slug);

    /** Same name and PIN in the same state, among schools with no UDISE code or board affiliation (see uk_school_name_pin). */
    @Query("""
            select s from School s where s.udiseCode is null
            and (s.educationBoardCode is null or s.affiliationNumber is null) and s.stateCode = :stateCode
            and lower(s.name) = lower(:name) and coalesce(s.pinCode, '') = coalesce(:pinCode, '')""")
    Optional<School> findDuplicate(@Param("name") String name, @Param("pinCode") String pinCode,
                                   @Param("stateCode") String stateCode);

    Optional<School> findByUdiseCode(String udiseCode);

    Optional<School> findByEducationBoardCodeAndAffiliationNumber(String educationBoardCode, String affiliationNumber);

    List<School> findAllByActiveTrue();

    @Query("select distinct s.locality from School s where s.active = true and s.locality is not null order by s.locality")
    List<String> findDistinctLocalities();

    @Query("""
            select distinct s.locality from School s where s.active = true and s.locality is not null
            and s.stateCode = :stateCode order by s.locality""")
    List<String> findDistinctLocalities(@Param("stateCode") String stateCode);

    /**
     * Coverage per state over active schools. Rows: state code, total, private, verified, with a publishable photo,
     * with any fee schedule, with an admission cycle, with phone or e-mail, with coordinates, with classes, last update.
     */
    @Query(value = """
            select s.state_code,
                   count(*),
                   count(*) filter (where s.school_type = 'PRIVATE'),
                   count(*) filter (where s.verification_status = 'VERIFIED'),
                   count(*) filter (where exists (select 1 from school_image i where i.school_id = s.id
                         and i.image_type <> 'LOGO' and not i.illustrative
                         and i.permission_status not in ('PENDING', 'REVOKED'))),
                   count(*) filter (where exists (select 1 from school_fee f where f.school_id = s.id)),
                   count(*) filter (where exists (select 1 from admission_schedule a where a.school_id = s.id)),
                   count(*) filter (where s.phone is not null or s.email is not null),
                   count(*) filter (where s.latitude is not null),
                   count(*) filter (where exists (select 1 from school_class_offered c where c.school_id = s.id)),
                   max(s.updated_at)
              from school s
             where s.active
             group by s.state_code
            """, nativeQuery = true)
    List<Object[]> coverageByState();

    /** Sitemap rows: slug, last update; active schools in id order (stable paging). */
    @Query("select s.slug, s.updatedAt from School s where s.active = true order by s.id")
    List<Object[]> findActiveSlugs(org.springframework.data.domain.Pageable page);

    /** Sitemap rows: state slug, district slug, for districts that have active schools. */
    @Query(value = """
            select st.slug, d.slug from district d join state st on st.code = d.state_code
             where exists (select 1 from school s where s.district_id = d.id and s.active)
             order by st.slug, d.slug
            """, nativeQuery = true)
    List<Object[]> districtsWithSchools();

    /** Rows: state code, active school count. */
    @Query("select s.stateCode, count(s) from School s where s.active = true group by s.stateCode")
    List<Object[]> countActiveByState();

    /** Rows: city, active school count. */
    @Query("""
            select s.city, count(s) from School s where s.active = true and s.stateCode = :stateCode
            and s.city is not null group by s.city order by s.city""")
    List<Object[]> countActiveByCity(@Param("stateCode") String stateCode);

    /** Rows: city, state code, active school count — every city in India with listed schools, largest first. */
    @Query("""
            select s.city, s.stateCode, count(s) from School s where s.active = true and s.city is not null
            group by s.city, s.stateCode order by count(s) desc, s.city""")
    List<Object[]> countActiveByCityAcrossIndia();

    /** Rows: city, state code. */
    @Query("""
            select distinct s.city, s.stateCode from School s where s.active = true and s.city is not null
            and lower(s.city) like :pattern escape '\\' order by s.city""")
    List<Object[]> searchCities(@Param("pattern") String pattern, org.springframework.data.domain.Pageable pageable);

    @Query("select count(distinct s.stateCode) from School s where s.active = true")
    long countStatesWithActiveSchools();

    @Query("select count(distinct s.districtId) from School s where s.active = true")
    long countDistrictsWithActiveSchools();

    long countByActiveTrue();

    long countByActiveTrueAndVerificationStatus(com.indiaschoolfinder.enums.VerificationStatus status);

    /**
     * Exact great-circle distance (haversine, km) for schools inside a bounding box.
     * The bounding box prefilter keeps the trigonometry off most rows.
     */
    @Query(value = """
            SELECT id, distance_km FROM (
                SELECT s.id,
                       6371 * 2 * asin(sqrt(
                           power(sin(radians(s.latitude - :lat) / 2), 2) +
                           cos(radians(:lat)) * cos(radians(s.latitude)) *
                           power(sin(radians(s.longitude - :lon) / 2), 2))) AS distance_km
                FROM school s
                WHERE s.active = TRUE
                  AND s.latitude BETWEEN :minLat AND :maxLat
                  AND s.longitude BETWEEN :minLon AND :maxLon
            ) d
            WHERE distance_km <= :radiusKm
            ORDER BY distance_km
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findNearby(@Param("lat") double lat, @Param("lon") double lon,
                              @Param("minLat") double minLat, @Param("maxLat") double maxLat,
                              @Param("minLon") double minLon, @Param("maxLon") double maxLon,
                              @Param("radiusKm") double radiusKm, @Param("limit") int limit);
}
