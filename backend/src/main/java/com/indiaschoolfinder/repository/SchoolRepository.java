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

    Optional<School> findByIdAndActiveTrue(Long id);

    /** Board codes that have at least one active school (board directory pages listed in the sitemap). */
    @Query("select distinct s.educationBoardCode from School s where s.active = true and s.educationBoardCode is not null "
            + "order by s.educationBoardCode")
    List<String> boardCodesWithSchools();

    /** Rows of (school id, class name, class sort order) for the cards' "Classes" line, in one query per page. */
    @Query("select s.id, c.name, c.sortOrder from School s join s.classesOffered c where s.id in :ids")
    List<Object[]> findClassesForSchools(@Param("ids") Collection<Long> ids);

    boolean existsBySlug(String slug);

    Optional<School> findBySlug(String slug);

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

    /**
     * A profile worth offering to search engines: one holding something beyond the bare board listing (board, affiliation
     * number, address, website), which thousands of other directories repeat word for word. Bare listings stay on the
     * site for visitors but are noindex and left out of the sitemap until an editor adds more.
     */
    String INDEXABLE = """
            (length(coalesce(s.description, '')) >= 300
             or exists (select 1 from school_fee f where f.school_id = s.id)
             or exists (select 1 from admission_schedule a where a.school_id = s.id)
             or exists (select 1 from school_facility f where f.school_id = s.id)
             or exists (select 1 from school_image i where i.school_id = s.id and i.image_type <> 'LOGO' and not i.illustrative
                        and i.permission_status not in ('PENDING', 'REVOKED'))
             or exists (select 1 from school_ranking r where r.school_id = s.id)
             or exists (select 1 from school_list_item l where l.school_id = s.id)
             or exists (select 1 from premier_school p where p.school_id = s.id)
             or exists (select 1 from school_boarding b where b.school_id = s.id)
             or exists (select 1 from school_review r where r.school_id = s.id and r.status = 'APPROVED'))""";

    /** Sitemap rows: slug, last update; indexable active schools in id order (stable paging). */
    @Query(value = "select s.slug, s.updated_at from school s where s.active and " + INDEXABLE + " order by s.id", nativeQuery = true)
    List<Object[]> findIndexableSlugs(org.springframework.data.domain.Pageable page);

    @Query(value = "select count(*) from school s where s.active and " + INDEXABLE, nativeQuery = true)
    long countIndexable();

    @Query(value = "select count(*) > 0 from school s where s.id = :id and s.active and " + INDEXABLE, nativeQuery = true)
    boolean isIndexable(@Param("id") long id);

    /**
     * Whether another active school in the same state and town has the same name, ignoring case and punctuation
     * ("St. John's School" and "St Johns School"). Separate branches such as Loreto Day School's in Kolkata are real
     * schools with their own affiliation numbers; their page titles need the PIN code to tell them apart.
     */
    @Query(value = """
            select count(*) > 0 from school o where o.active and o.id <> :id and o.state_code = :state
              and regexp_replace(lower(o.name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(:name), '[^a-z0-9]', '', 'g')
              and coalesce(lower(o.city), '') = coalesce(lower(:city), '')""", nativeQuery = true)
    boolean hasNamesake(@Param("id") long id, @Param("name") String name, @Param("state") String stateCode, @Param("city") String city);

    /**
     * The schools of one place: a state, optionally narrowed to one district (id, 0 for any) or one town (the stored
     * city name, '' for any). Sentinels instead of nulls, so no parameter is ever bound without a type. A plain string with
     * spaces at both ends: a text block would drop the space after the "where" before it.
     */
    String IN_PLACE = " s.active and s.state_code = :state and (:district = 0 or s.district_id = :district)"
            + " and (:city = '' or s.city = :city) ";

    /** Rows: kind, key, count. Boards, management types, genders, networks, and boarding / Class XII / admission-date counts. */
    @Query(value = """
            with p as (select s.id, s.education_board_code, s.school_type, s.gender_type, s.network from school s where """ + IN_PLACE + """
            )
            select 'board', coalesce(p.education_board_code, 'OTHER'), count(*) from p group by 2
            union all select 'type', p.school_type, count(*) from p group by 2
            union all select 'gender', p.gender_type, count(*) from p where p.gender_type is not null group by 2
            union all select 'network', p.network, count(*) from p where p.network is not null group by 2
            union all select 'flag', 'BOARDING', count(*) from p where exists (select 1 from school_boarding b where b.school_id = p.id)
            union all select 'flag', 'SENIOR_SECONDARY', count(*) from p where exists (select 1 from school_class_offered o
                      join school_class c on c.id = o.class_id where o.school_id = p.id and c.stage = 'SENIOR_SECONDARY')
            union all select 'flag', 'ADMISSION_DATES', count(*) from p where exists (select 1 from admission_schedule a where a.school_id = p.id)
            """, nativeQuery = true)
    List<Object[]> placeBreakdown(@Param("state") String state, @Param("district") long district, @Param("city") String city);

    /** Rows: kind ('oldest' or 'government'), name, slug, founding year; three of each, for the place's introduction. */
    @Query(value = """
            (select 'oldest', s.name, s.slug, s.established_year from school s where """ + IN_PLACE + """
              and s.established_year >= 1800 order by s.established_year, s.name limit 3)
            union all
            (select 'government', s.name, s.slug, s.established_year from school s where """ + IN_PLACE + """
              and s.school_type = 'GOVERNMENT' order by s.name limit 3)
            """, nativeQuery = true)
    List<Object[]> placeExamples(@Param("state") String state, @Param("district") long district, @Param("city") String city);

    /** Sitemap rows: state slug, district slug, for districts with at least {@code min} active schools. */
    @Query(value = """
            select st.slug, d.slug from district d join state st on st.code = d.state_code
             where (select count(*) from school s where s.district_id = d.id and s.active) >= :min
             order by st.slug, d.slug
            """, nativeQuery = true)
    List<Object[]> districtsWithSchools(@org.springframework.data.repository.query.Param("min") int min);

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
