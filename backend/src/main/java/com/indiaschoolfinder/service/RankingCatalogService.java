package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.RankingCatalogDtos;
import com.indiaschoolfinder.entity.RankingImportJob;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.RankingImportJobRepository;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The public ranking tables. A table is always one published list, so publishers and years are never blended. Filters
 * narrow the list without renumbering it: every rank shown is the publisher's own, and national, state and city ranks are
 * kept apart. Only verified, non-sponsored entries appear.
 */
@Service
public class RankingCatalogService {

    private static final String PUBLIC = "r.verification_status = 'VERIFIED' AND NOT r.sponsored AND s.active";
    /** The group a government school falls in. Each school has one group; anything not identified more closely is OTHER. */
    private static final String GOVERNMENT_GROUP = """
            CASE WHEN s.network = 'KENDRIYA_VIDYALAYA' THEN 'KV'
                 WHEN s.network = 'JAWAHAR_NAVODAYA_VIDYALAYA' OR b.residential_system = 'NAVODAYA' THEN 'JNV'
                 WHEN s.network = 'SAINIK_SCHOOL' OR b.residential_system = 'SAINIK' THEN 'SAINIK'
                 WHEN s.management = 'CENTRAL_GOVERNMENT' OR s.network IS NOT NULL OR b.residential_system IN ('MILITARY_SCHOOL', 'MILITARY_COLLEGE') THEN 'CENTRAL'
                 WHEN s.management IN ('STATE_GOVERNMENT', 'LOCAL_BODY') OR b.residential_system = 'STATE_RESIDENTIAL' THEN 'STATE'
                 ELSE 'OTHER' END""";
    /** The group a boarding school falls in; a school with no stated gender is OTHER. */
    private static final String BOARDING_GROUP = """
            CASE WHEN b.boarding_type = 'DAY_CUM_BOARDING' THEN 'DAY_CUM_BOARDING'
                 WHEN s.gender_type IN ('BOYS', 'GIRLS', 'CO_ED') THEN s.gender_type
                 ELSE 'OTHER' END""";

    private final NamedParameterJdbcTemplate jdbc;
    private final SchoolImageRepository images;
    private final RankingImportJobRepository jobs;
    private final AuditService audit;
    private final Clock clock;

    public RankingCatalogService(NamedParameterJdbcTemplate jdbc, SchoolImageRepository images, RankingImportJobRepository jobs,
                                 AuditService audit, Clock clock) {
        this.jdbc = jdbc;
        this.images = images;
        this.jobs = jobs;
        this.audit = audit;
        this.clock = clock;
    }

    /** Whether each ranking page has anything to show, so navigation never leads to an empty page. */
    @Transactional(readOnly = true)
    public RankingCatalogDtos.Sections sections() {
        return jdbc.getJdbcTemplate().queryForObject("""
                SELECT count(*) FILTER (WHERE NOT e.rating_based), count(*) FILTER (WHERE NOT e.rating_based AND s.education_board_code <> 'OTHER'),
                       count(*) FILTER (WHERE NOT e.rating_based AND s.school_type = 'GOVERNMENT'),
                       count(*) FILTER (WHERE NOT e.rating_based AND b.school_id IS NOT NULL), count(*) FILTER (WHERE e.rating_based)
                FROM ranking_source r JOIN ranking_edition e ON e.id = r.edition_id JOIN ranking_publisher p ON p.id = e.publisher_id
                JOIN school s ON s.id = r.school_id LEFT JOIN school_boarding b ON b.school_id = s.id
                WHERE p.active AND %s""".formatted(PUBLIC), (rs, i) -> new RankingCatalogDtos.Sections(rs.getLong(1) > 0, rs.getLong(2) > 0, rs.getLong(3) > 0, rs.getLong(4) > 0, rs.getLong(5) > 0));
    }

    /** Lists with at least one public entry, newest first; a list's page is reached by its id. */
    @Transactional(readOnly = true)
    public List<RankingCatalogDtos.Edition> editions() {
        Map<Long, List<RankingCatalogDtos.Parameter>> parameters = new HashMap<>();
        jdbc.query("SELECT edition_id, name, weight, description FROM ranking_parameter ORDER BY id", rs -> {
            parameters.computeIfAbsent(rs.getLong(1), k -> new ArrayList<>())
                    .add(new RankingCatalogDtos.Parameter(rs.getString(2), rs.getBigDecimal(3), rs.getString(4)));
        });
        return jdbc.query("""
                SELECT e.id, p.code, p.name AS publisher, p.kind, e.name, e.ranking_year, c.code AS category_code,
                       coalesce(c.name, e.category_label) AS category, c.family, c.board_code, e.scope, e.region, e.rating_based,
                       e.max_score, e.methodology_summary, e.source_url, e.published_on, e.collected_on,
                       max(r.last_verified_date) AS last_verified, count(r.id) AS entries, count(r.score) AS scored
                FROM ranking_edition e JOIN ranking_publisher p ON p.id = e.publisher_id LEFT JOIN ranking_category c ON c.id = e.category_id
                JOIN ranking_source r ON r.edition_id = e.id JOIN school s ON s.id = r.school_id
                WHERE p.active AND %s
                GROUP BY e.id, p.code, p.name, p.kind, c.code, c.name, c.family, c.board_code
                ORDER BY e.ranking_year DESC, p.kind, e.id""".formatted(PUBLIC), (rs, i) -> new RankingCatalogDtos.Edition(
                rs.getLong("id"), rs.getString("code"), rs.getString("publisher"), RankingPublisherKind.valueOf(rs.getString("kind")),
                rs.getString("name"), rs.getString("ranking_year"), rs.getString("category_code"), rs.getString("category"),
                rs.getString("family"), rs.getString("board_code"), RankingScope.valueOf(rs.getString("scope")), rs.getString("region"),
                rs.getBoolean("rating_based"), rs.getLong("scored") > 0, rs.getBigDecimal("max_score"), rs.getString("methodology_summary"),
                rs.getString("source_url"), rs.getObject("published_on", LocalDate.class), rs.getObject("collected_on", LocalDate.class),
                rs.getObject("last_verified", LocalDate.class), rs.getLong("entries"), parameters.getOrDefault(rs.getLong("id"), List.of())));
    }

    @Transactional(readOnly = true)
    public PageResponse<RankingCatalogDtos.Row> table(RankingCatalogDtos.Query f, int page, int size) {
        MapSqlParameterSource p = new MapSqlParameterSource("edition", f.edition());
        StringBuilder where = new StringBuilder(" WHERE r.edition_id = :edition AND " + PUBLIC);
        if (f.state() != null) { where.append(" AND s.state_code = :state"); p.addValue("state", f.state()); }
        if (f.district() != null) { where.append(" AND d.slug = :district"); p.addValue("district", f.district()); }
        if (f.city() != null) { where.append(" AND lower(s.city) = lower(:city)"); p.addValue("city", f.city()); }
        if (f.board() != null) { where.append(" AND s.education_board_code = :board"); p.addValue("board", f.board()); }
        if (f.schoolType() != null) { where.append(" AND s.school_type = :schoolType"); p.addValue("schoolType", f.schoolType()); }
        if (f.gender() != null) { where.append(" AND s.gender_type = :gender"); p.addValue("gender", f.gender()); }
        if (f.rating() != null) { where.append(" AND r.rating = :rating"); p.addValue("rating", f.rating()); }
        if (f.maxRank() != null) { where.append(" AND r.national_rank <= :maxRank"); p.addValue("maxRank", f.maxRank()); }
        if (f.government() != null) {
            where.append(" AND s.school_type = 'GOVERNMENT' AND " + GOVERNMENT_GROUP + " = :government");
            p.addValue("government", f.government());
        }
        if (f.boarding() != null) {
            where.append(" AND b.school_id IS NOT NULL");
            if (!"ANY".equals(f.boarding())) { where.append(" AND " + BOARDING_GROUP + " = :boarding"); p.addValue("boarding", f.boarding()); }
        }
        if (f.residence() != null) {
            where.append(switch (f.residence()) {
                case "DAY" -> " AND b.school_id IS NULL";
                case "BOARDING" -> " AND b.boarding_type IN ('FULL_BOARDING', 'WEEKLY_BOARDING')";
                case "DAY_CUM_BOARDING" -> " AND b.boarding_type = 'DAY_CUM_BOARDING'";
                default -> throw new BusinessValidationException("residence", "use DAY, BOARDING or DAY_CUM_BOARDING");
            });
        }
        if (f.q() != null) {
            where.append(" AND lower(s.name) LIKE :q");
            p.addValue("q", "%" + f.q().strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        String from = " FROM ranking_source r JOIN school s ON s.id = r.school_id JOIN state st ON st.code = s.state_code"
                + " LEFT JOIN district d ON d.id = s.district_id LEFT JOIN school_boarding b ON b.school_id = s.id";
        Long total = jdbc.queryForObject("SELECT count(*)" + from + where, p, Long.class);
        // A place view follows the publisher's order for that place where it printed one; otherwise national order keeps its meaning.
        String order = (f.city() != null ? "r.city_rank NULLS LAST, " : "") + (f.state() != null ? "r.state_rank NULLS LAST, " : "")
                + "coalesce(r.national_rank, r.state_rank, r.city_rank, r.rank_position) NULLS LAST,"
                + " CASE r.rating WHEN 'GREEN' THEN 1 WHEN 'YELLOW' THEN 2 WHEN 'ORANGE' THEN 3 WHEN 'RED' THEN 4 ELSE 5 END, s.name, r.id";
        p.addValue("limit", size).addValue("offset", (long) page * size);
        record Raw(RankingCatalogDtos.Row row) {
        }
        List<RankingCatalogDtos.Row> rows = jdbc.query("""
                SELECT r.id, r.national_rank, r.state_rank, r.city_rank, r.score, r.max_score, r.score_text, r.rating, s.id AS school_id,
                       s.name AS school_name, s.slug, s.city, d.name AS district, s.state_code, st.name AS state_name,
                       s.education_board_code, s.school_type, s.gender_type, b.boarding_type, r.last_verified_date"""
                + from + where + " ORDER BY " + order + " LIMIT :limit OFFSET :offset", p, (rs, i) -> new RankingCatalogDtos.Row(
                rs.getLong("id"), (Integer) rs.getObject("national_rank"), (Integer) rs.getObject("state_rank"), (Integer) rs.getObject("city_rank"),
                rs.getBigDecimal("score"), rs.getBigDecimal("max_score"), rs.getString("score_text"), rs.getString("rating"), rs.getLong("school_id"),
                rs.getString("school_name"), rs.getString("slug"), rs.getString("city"), rs.getString("district"), rs.getString("state_code"),
                rs.getString("state_name"), rs.getString("education_board_code"), rs.getString("school_type"), rs.getString("gender_type"),
                rs.getString("boarding_type"), null, null, rs.getObject("last_verified_date", LocalDate.class)));
        Map<Long, SchoolImage> covers = new HashMap<>();
        if (!rows.isEmpty()) {
            images.findGalleryImagesForSchools(rows.stream().map(RankingCatalogDtos.Row::schoolId).toList(), ImageType.LOGO, ImagePermission.PUBLISHABLE)
                    .forEach(i -> covers.putIfAbsent(i.getSchoolId(), i));
        }
        List<RankingCatalogDtos.Row> withImages = rows.stream().map(r -> {
            SchoolImage c = covers.get(r.schoolId());
            return c == null || c.isIllustrative() ? r : new RankingCatalogDtos.Row(r.entryId(), r.nationalRank(), r.stateRank(), r.cityRank(), r.score(),
                    r.maxScore(), r.scoreText(), r.rating(), r.schoolId(), r.schoolName(), r.slug(), r.city(), r.district(), r.stateCode(), r.stateName(),
                    r.board(), r.schoolType(), r.genderType(), r.boardingType(), c.getThumbnailUrl() != null ? c.getThumbnailUrl() : c.getUrl(), c.getCredit(),
                    r.lastVerified());
        }).toList();
        long count = total == null ? 0 : total;
        int pages = (int) Math.ceil((double) count / size);
        return new PageResponse<>(withImages, page, size, count, pages, page == 0, page + 1 >= pages);
    }

    @Transactional(readOnly = true)
    public RankingCatalogDtos.Places places(long edition) {
        MapSqlParameterSource p = new MapSqlParameterSource("edition", edition);
        String from = " FROM ranking_source r JOIN school s ON s.id = r.school_id JOIN state st ON st.code = s.state_code"
                + " LEFT JOIN school_boarding b ON b.school_id = s.id LEFT JOIN district d ON d.id = s.district_id WHERE r.edition_id = :edition AND " + PUBLIC;
        org.springframework.jdbc.core.RowMapper<RankingCatalogDtos.Group> group = (rs, i) -> new RankingCatalogDtos.Group(rs.getString(1), rs.getLong(2));
        return new RankingCatalogDtos.Places(
                jdbc.query("SELECT st.code, st.name, st.slug, count(*)" + from + " GROUP BY st.code, st.name, st.slug ORDER BY st.name", p,
                        (rs, i) -> new RankingCatalogDtos.StatePlace(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4))),
                jdbc.query("SELECT s.city, s.state_code, count(*)" + from + " AND s.city IS NOT NULL GROUP BY s.city, s.state_code ORDER BY s.city", p,
                        (rs, i) -> new RankingCatalogDtos.CityPlace(rs.getString(1), rs.getString(2), rs.getLong(3))),
                jdbc.query("SELECT d.slug, d.name, s.state_code, count(*)" + from + " AND d.id IS NOT NULL GROUP BY d.slug, d.name, s.state_code ORDER BY d.name", p,
                        (rs, i) -> new RankingCatalogDtos.DistrictPlace(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4))),
                jdbc.query("SELECT s.education_board_code, count(*)" + from + " AND s.education_board_code <> 'OTHER' GROUP BY 1 ORDER BY 2 DESC", p, group),
                jdbc.query("SELECT " + GOVERNMENT_GROUP + ", count(*)" + from + " AND s.school_type = 'GOVERNMENT' GROUP BY 1 ORDER BY 2 DESC", p, group),
                jdbc.query("SELECT " + BOARDING_GROUP + ", count(*)" + from + " AND b.school_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC", p, group));
    }

    // --- import review ----------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<RankingCatalogDtos.ImportJob> jobs(int page, int size) {
        Page<RankingImportJob> p = jobs.findAllByOrderByImportedAtDesc(PageRequest.of(page, size));
        Map<Long, Long> waiting = new HashMap<>();
        jdbc.query("SELECT import_job_id, count(*) FROM ranking_source WHERE verification_status = 'UNVERIFIED' AND import_job_id IS NOT NULL GROUP BY import_job_id",
                rs -> { waiting.put(rs.getLong(1), rs.getLong(2)); });
        return PageResponse.of(p, j -> new RankingCatalogDtos.ImportJob(j.getId(), j.getFileName(), j.getMode(), j.getTotalRows(), j.getValidRows(), j.getCreated(),
                j.getUpdated(), j.isCommitted(), j.getErrors(), j.getImportedBy(), j.getImportedAt(), j.getApprovedBy(), j.getApprovedAt(),
                waiting.getOrDefault(j.getId(), 0L)));
    }

    /** An administrator approves a whole import after checking it; nothing an import brings in is published before this. */
    @Transactional
    public int approve(long jobId, String note) {
        RankingImportJob job = jobs.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Ranking import", jobId));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String who = auth == null ? "system" : auth.getName();
        Instant now = Instant.now(clock);
        MapSqlParameterSource p = new MapSqlParameterSource("job", jobId).addValue("note", note).addValue("who", who).addValue("now", Timestamp.from(now))
                .addValue("today", LocalDate.now(clock));
        jdbc.update("""
                INSERT INTO ranking_verification (ranking_source_id, status, note, verified_by, verified_at)
                SELECT id, 'VERIFIED', :note, :who, :now FROM ranking_source WHERE import_job_id = :job AND verification_status = 'UNVERIFIED'""", p);
        int approved = jdbc.update("""
                UPDATE ranking_source SET verification_status = 'VERIFIED', last_verified_date = :today, updated_at = :now
                WHERE import_job_id = :job AND verification_status = 'UNVERIFIED'""", p);
        job.setApprovedBy(who);
        job.setApprovedAt(now);
        jobs.save(job);
        audit.record("RANKING_IMPORT_APPROVED", "RANKING_IMPORT_JOB", jobId, "entries=" + approved + (note == null ? "" : ", note=" + note));
        return approved;
    }
}
