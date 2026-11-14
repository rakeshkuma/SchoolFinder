package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.Category;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.Facet;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * SchoolDhundo's directory of premier and boarding schools, shown on the ranking pages. It is a curated directory listed
 * A to Z: the source document's order is kept for reference only and is never shown or sorted on as a rank. A school's
 * published rank, where an independent publisher has one, comes from ranking_source with its publisher and year.
 */
@Service
public class PremierDirectoryService {

    /** Views of the directory. The predicate is SQL on {@code ps}; a view with no schools is never offered. */
    private record View(String slug, String title, String description, String where) {
    }

    private static final String BOARD = "EXISTS (SELECT 1 FROM premier_school_board pb WHERE pb.premier_school_id = ps.id AND pb.board_code IN (%s))";
    private static final String BOARDING = "ps.residence IN ('BOARDING', 'DAY_CUM_BOARDING')";
    private static final List<View> VIEWS = List.of(
            new View("top-premier-schools", "India’s Top Premier Schools",
                    "Heritage boarding schools, leading day schools and international campuses from SchoolDhundo’s premier school directory.", "TRUE"),
            new View("boarding-schools", "India’s Top Boarding Schools",
                    "Residential and day-cum-boarding schools where students can live on campus during term.", BOARDING),
            new View("boys-boarding-schools", "Best Boys Boarding Schools",
                    "All-boys residential schools, many of them more than a century old.", BOARDING + " AND ps.gender = 'BOYS'"),
            new View("girls-boarding-schools", "Best Girls Boarding Schools",
                    "All-girls residential schools with their own houses, sport and pastoral care.", BOARDING + " AND ps.gender = 'GIRLS'"),
            new View("co-ed-boarding-schools", "Best Co-Educational Boarding Schools",
                    "Residential schools for boys and girls, in the hills and on the plains.", BOARDING + " AND ps.gender = 'CO_ED'"),
            new View("international-schools", "Best International Schools",
                    "Schools offering the International Baccalaureate or Cambridge International programmes.", BOARD.formatted("'IB', 'CAMBRIDGE'")),
            new View("cbse-schools", "Best CBSE Schools",
                    "Premier schools teaching the Central Board of Secondary Education syllabus.", BOARD.formatted("'CBSE'")),
            new View("icse-schools", "Best ICSE Schools",
                    "Premier schools affiliated to the CISCE, which awards the ICSE (Class 10) and ISC (Class 12).", BOARD.formatted("'CISCE'")),
            new View("ib-schools", "Best IB Schools",
                    "Schools offering International Baccalaureate programmes, such as the IB Diploma.", BOARD.formatted("'IB'")),
            new View("cambridge-schools", "Best Cambridge Schools",
                    "Schools offering Cambridge International qualifications such as IGCSE and A Levels.", BOARD.formatted("'CAMBRIDGE'")),
            new View("alternative-schools", "Alternative Education Schools",
                    "Krishnamurti Foundation schools and others built on inquiry, nature and learning without competition.", "ps.section = 'ALTERNATIVE'"));

    private static final Map<String, String> SECTIONS = new LinkedHashMap<>();
    static {
        SECTIONS.put("BOYS_RESIDENTIAL", "Legacy boys’ residential schools");
        SECTIONS.put("GIRLS_BOARDING", "Girls’ boarding schools");
        SECTIONS.put("COED_BOARDING", "Co-educational and hill schools");
        SECTIONS.put("INTERNATIONAL", "International and IB schools");
        SECTIONS.put("ALTERNATIVE", "Holistic and alternative schools");
        SECTIONS.put("METRO", "Leading city schools");
        SECTIONS.put("REGIONAL", "Regional and specialised schools");
    }
    private static final Map<String, String> BOARD_NAMES = Map.of("CBSE", "CBSE", "CISCE", "ICSE / ISC (CISCE)", "IB", "IB",
            "CAMBRIDGE", "Cambridge (CAIE)", "STATE", "State board", "OTHER", "Other curriculum");
    private static final Map<String, String> RESIDENCE_NAMES = Map.of("BOARDING", "Boarding", "DAY_CUM_BOARDING", "Day-cum-boarding", "DAY", "Day school");
    private static final Map<String, String> GENDER_NAMES = Map.of("BOYS", "Boys", "GIRLS", "Girls", "CO_ED", "Co-educational");
    private static final String FROM = " FROM premier_school ps JOIN state st ON st.code = ps.state_code LEFT JOIN school s ON s.id = ps.school_id AND s.active";

    private final NamedParameterJdbcTemplate jdbc;
    private final SchoolImageRepository images;

    public PremierDirectoryService(NamedParameterJdbcTemplate jdbc, SchoolImageRepository images) {
        this.jdbc = jdbc;
        this.images = images;
    }

    public static Map<String, String> sections() {
        return SECTIONS;
    }

    /** Headline counts and the views that hold schools, for the rankings home page. */
    @Transactional(readOnly = true)
    public PremierDirectoryDtos.Summary summary() {
        return jdbc.getJdbcTemplate().queryForObject("""
                SELECT count(*), count(DISTINCT ps.state_code), count(DISTINCT lower(ps.city)), count(*) FILTER (WHERE %s),
                       (SELECT count(DISTINCT board_code) FROM premier_school_board WHERE board_code <> 'OTHER'), max(ps.checked_on)
                FROM premier_school ps""".formatted(BOARDING), (rs, i) -> new PremierDirectoryDtos.Summary(rs.getLong(1), rs.getLong(2),
                rs.getLong(3), rs.getLong(4), rs.getLong(5), rs.getObject(6, LocalDate.class), categories()));
    }

    @Transactional(readOnly = true)
    public List<Category> categories() {
        List<Category> out = new ArrayList<>();
        for (View v : VIEWS) {
            Long n = jdbc.getJdbcTemplate().queryForObject("SELECT count(*) FROM premier_school ps WHERE " + v.where(), Long.class);
            if (n != null && n > 0) out.add(new Category(v.slug(), v.title(), v.description(), n));
        }
        return out;
    }

    private static View view(String slug) {
        if (slug == null) return VIEWS.get(0);
        return VIEWS.stream().filter(v -> v.slug().equals(slug)).findFirst().orElseThrow(() -> new ResourceNotFoundException("Ranking category", slug));
    }

    @Transactional(readOnly = true)
    public Category category(String slug) {
        View v = view(slug);
        return categories().stream().filter(c -> c.slug().equals(v.slug())).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Ranking category", slug));
    }

    private static String where(PremierDirectoryDtos.Query f, MapSqlParameterSource p, boolean withCategory) {
        StringBuilder w = new StringBuilder(" WHERE ").append(withCategory ? view(f.category()).where() : "TRUE");
        if (f.q() != null) {
            w.append(" AND (lower(ps.name) LIKE :q OR lower(coalesce(ps.city, '')) LIKE :q OR lower(st.name) LIKE :q)");
            p.addValue("q", "%" + f.q().strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (f.state() != null) { w.append(" AND ps.state_code = :state"); p.addValue("state", f.state().toUpperCase(Locale.ROOT)); }
        if (f.city() != null) { w.append(" AND lower(ps.city) = lower(:city)"); p.addValue("city", f.city()); }
        if (f.board() != null) { w.append(" AND ").append(BOARD.formatted(":board")); p.addValue("board", f.board().toUpperCase(Locale.ROOT)); }
        if (f.residence() != null) {
            // "Boarding" includes day-cum-boarding schools: both take boarders.
            w.append("BOARDING".equalsIgnoreCase(f.residence()) ? " AND " + BOARDING : " AND ps.residence = :residence");
            p.addValue("residence", f.residence().toUpperCase(Locale.ROOT));
        }
        if (f.gender() != null) { w.append(" AND ps.gender = :gender"); p.addValue("gender", f.gender().toUpperCase(Locale.ROOT)); }
        if (f.section() != null) { w.append(" AND ps.section = :section"); p.addValue("section", f.section().toUpperCase(Locale.ROOT)); }
        if (f.cls() != null) { w.append(" AND ps.lowest_class <= :cls AND ps.highest_class >= :cls"); p.addValue("cls", f.cls()); }
        return w.toString();
    }

    /** Schools in a view, A to Z unless asked otherwise; never in the source document's order. */
    @Transactional(readOnly = true)
    public PageResponse<PremierDirectoryDtos.School> list(PremierDirectoryDtos.Query f, int page, int size) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        String where = where(f, p, true);
        Long total = jdbc.queryForObject("SELECT count(*)" + FROM + where, p, Long.class);
        String order = switch (f.sort() == null ? "NAME" : f.sort().toUpperCase(Locale.ROOT)) {
            case "STATE" -> "st.name, lower(ps.name)";
            case "CITY" -> "lower(ps.city), lower(ps.name)";
            case "FEE" -> "coalesce(ps.fee_min_inr, ps.fee_max_inr) NULLS LAST, lower(ps.name)";
            // Editorially featured schools first, then A to Z. Featured is a placement, not a rank, and is labelled.
            default -> "ps.featured DESC, regexp_replace(lower(ps.name), '^the\\s+', ''), ps.id";
        };
        p.addValue("limit", size).addValue("offset", (long) page * size);
        List<PremierDirectoryDtos.School> rows = jdbc.query("SELECT ps.*, st.name AS state_name, s.slug" + FROM + where
                + " ORDER BY " + order + " LIMIT :limit OFFSET :offset", p, (rs, n) -> row(rs));
        long count = total == null ? 0 : total;
        int pages = (int) Math.ceil((double) count / size);
        return new PageResponse<>(enrich(rows), page, size, count, pages, page == 0, page + 1 >= pages);
    }

    /** Filter choices for a view, each with how many schools it would show. */
    @Transactional(readOnly = true)
    public PremierDirectoryDtos.Facets facets(String category) {
        String where = " WHERE " + view(category).where();
        MapSqlParameterSource p = new MapSqlParameterSource();
        List<Facet> states = jdbc.query("SELECT ps.state_code, st.name, count(*)" + FROM + where + " GROUP BY ps.state_code, st.name ORDER BY st.name", p,
                (rs, i) -> new Facet(rs.getString(1), rs.getString(2), null, rs.getLong(3)));
        List<Facet> cities = jdbc.query("SELECT min(ps.city), ps.state_code, count(*)" + FROM + where + " AND ps.city IS NOT NULL GROUP BY lower(ps.city), ps.state_code ORDER BY min(ps.city)",
                p, (rs, i) -> new Facet(rs.getString(1), rs.getString(1), rs.getString(2), rs.getLong(3)));
        List<Facet> boards = jdbc.query("SELECT pb.board_code, count(*)" + FROM + " JOIN premier_school_board pb ON pb.premier_school_id = ps.id" + where
                + " GROUP BY pb.board_code", p, (rs, i) -> new Facet(rs.getString(1), BOARD_NAMES.getOrDefault(rs.getString(1), rs.getString(1)), null, rs.getLong(2)));
        boards = sortBoards(boards);
        List<Facet> residences = grouped("ps.residence", where, p, RESIDENCE_NAMES, List.of("BOARDING", "DAY_CUM_BOARDING", "DAY"));
        List<Facet> genders = grouped("ps.gender", where, p, GENDER_NAMES, List.of("BOYS", "GIRLS", "CO_ED"));
        List<Facet> sections = grouped("ps.section", where, p, SECTIONS, List.copyOf(SECTIONS.keySet()));
        // A class is offered when some school in the view teaches it.
        List<Integer> classes = jdbc.queryForList("SELECT DISTINCT g FROM premier_school ps, generate_series(ps.lowest_class::int, ps.highest_class::int) g" + where
                + " AND ps.lowest_class IS NOT NULL ORDER BY g", p, Integer.class);
        return new PremierDirectoryDtos.Facets(states, cities, boards, residences, genders, sections, classes);
    }

    private static final List<String> BOARD_ORDER = List.of("CBSE", "CISCE", "IB", "CAMBRIDGE", "STATE", "OTHER");

    private static List<Facet> sortBoards(List<Facet> boards) {
        return boards.stream().sorted(Comparator.comparingInt(f -> BOARD_ORDER.indexOf(f.code()))).toList();
    }

    private List<Facet> grouped(String column, String where, MapSqlParameterSource p, Map<String, String> names, List<String> order) {
        Map<String, Long> counts = new HashMap<>();
        jdbc.query("SELECT " + column + ", count(*)" + FROM + where + " AND " + column + " IS NOT NULL GROUP BY " + column, p,
                rs -> { counts.put(rs.getString(1), rs.getLong(2)); });
        return order.stream().filter(counts::containsKey).map(c -> new Facet(c, names.get(c), null, counts.get(c))).toList();
    }

    /** A directory school by its profile id, with the views it appears in. */
    @Transactional(readOnly = true)
    public PremierDirectoryDtos.SchoolEntry forSchool(long schoolId) {
        MapSqlParameterSource p = new MapSqlParameterSource("school", schoolId);
        List<PremierDirectoryDtos.School> rows = jdbc.query("SELECT ps.*, st.name AS state_name, s.slug" + FROM + " WHERE ps.school_id = :school", p, (rs, n) -> row(rs));
        if (rows.isEmpty()) throw new ResourceNotFoundException("Directory school", schoolId);
        PremierDirectoryDtos.School school = enrich(rows).get(0);
        List<Category> in = new ArrayList<>();
        for (Category c : categories()) {
            Long hit = jdbc.queryForObject("SELECT count(*) FROM premier_school ps WHERE ps.id = :id AND " + view(c.slug()).where(),
                    new MapSqlParameterSource("id", school.id()), Long.class);
            if (hit != null && hit > 0) in.add(c);
        }
        return new PremierDirectoryDtos.SchoolEntry(school, in);
    }

    private static PremierDirectoryDtos.School row(ResultSet rs) throws SQLException {
        return new PremierDirectoryDtos.School(rs.getLong("id"), rs.getString("entry_key"), rs.getString("name"), rs.getString("city"),
                rs.getString("state_code"), rs.getString("state_name"), rs.getString("section"), List.of(), rs.getString("curriculum_note"),
                rs.getString("gender"), rs.getBoolean("gender_confirmed"), rs.getString("residence"), rs.getBoolean("residence_confirmed"),
                rs.getString("classes_label"), rs.getBoolean("classes_confirmed"), (Integer) rs.getObject("fee_min_inr"), (Integer) rs.getObject("fee_max_inr"),
                rs.getString("fee_text"), rs.getString("website_url"), rs.getBoolean("website_checked"), (Long) rs.getObject("school_id"), rs.getString("slug"),
                rs.getString("campus_search"), null, null, rs.getBoolean("featured"), rs.getBoolean("sponsored"), rs.getString("note"),
                rs.getObject("checked_on", LocalDate.class), null);
    }

    /** Adds boards, a real photo where the profile has one, and the best verified published rank, in one query each. */
    private List<PremierDirectoryDtos.School> enrich(List<PremierDirectoryDtos.School> rows) {
        if (rows.isEmpty()) return rows;
        List<Long> ids = rows.stream().map(PremierDirectoryDtos.School::id).toList();
        Map<Long, List<PremierDirectoryDtos.Board>> boards = new HashMap<>();
        jdbc.query("SELECT premier_school_id, board_code, confirmed FROM premier_school_board WHERE premier_school_id IN (:ids)",
                new MapSqlParameterSource("ids", ids), rs -> {
                    boards.computeIfAbsent(rs.getLong(1), k -> new ArrayList<>()).add(new PremierDirectoryDtos.Board(rs.getString(2), rs.getBoolean(3)));
                });
        boards.values().forEach(l -> l.sort(Comparator.comparingInt(b -> BOARD_ORDER.indexOf(b.code()))));
        List<Long> schools = rows.stream().map(PremierDirectoryDtos.School::schoolId).filter(Objects::nonNull).toList();
        Map<Long, SchoolImage> photos = new HashMap<>();
        Map<Long, PremierDirectoryDtos.Rank> ranks = new HashMap<>();
        if (!schools.isEmpty()) {
            images.findGalleryImagesForSchools(schools, ImageType.LOGO, ImagePermission.PUBLISHABLE).stream()
                    .filter(i -> !i.isIllustrative()).forEach(i -> photos.putIfAbsent(i.getSchoolId(), i));
            jdbc.query("""
                    SELECT DISTINCT ON (r.school_id) r.school_id, p.code, p.name, e.ranking_year, e.name AS list, r.national_rank, coalesce(r.source_url, e.source_url) AS url
                    FROM ranking_source r JOIN ranking_edition e ON e.id = r.edition_id JOIN ranking_publisher p ON p.id = e.publisher_id
                    WHERE r.school_id IN (:schools) AND r.verification_status = 'VERIFIED' AND NOT r.sponsored AND p.active AND NOT e.rating_based
                      AND e.scope = 'NATIONAL' AND r.national_rank IS NOT NULL
                    ORDER BY r.school_id, e.ranking_year DESC, r.national_rank""", new MapSqlParameterSource("schools", schools), rs -> {
                ranks.put(rs.getLong(1), new PremierDirectoryDtos.Rank(rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getInt(6), rs.getString(7)));
            });
        }
        return rows.stream().map(r -> {
            SchoolImage photo = r.schoolId() == null ? null : photos.get(r.schoolId());
            return new PremierDirectoryDtos.School(r.id(), r.key(), r.name(), r.city(), r.stateCode(), r.stateName(), r.section(),
                    boards.getOrDefault(r.id(), List.of()), r.curriculumNote(), r.gender(), r.genderConfirmed(), r.residence(), r.residenceConfirmed(),
                    r.classesLabel(), r.classesConfirmed(), r.feeMinInr(), r.feeMaxInr(), r.feeText(), r.websiteUrl(), r.websiteChecked(), r.schoolId(),
                    r.slug(), r.campusSearch(), photo == null ? null : photo.getThumbnailUrl() != null ? photo.getThumbnailUrl() : photo.getUrl(),
                    photo == null ? null : photo.getCredit(), r.featured(), r.sponsored(), r.note(), r.checkedOn(),
                    r.schoolId() == null ? null : ranks.get(r.schoolId()));
        }).toList();
    }

    /**
     * Writes the seed's entries: new keys are added, known keys updated (editorial featured / sponsored flags are kept),
     * and entries no longer in the seed removed.
     */
    @Transactional
    public void load(PremierDirectoryDtos.Seed seed) {
        Set<String> keys = new HashSet<>();
        for (PremierDirectoryDtos.SeedEntry e : seed.entries()) {
            keys.add(e.key());
            MapSqlParameterSource p = new MapSqlParameterSource("key", e.key()).addValue("order", e.order()).addValue("section", e.section())
                    .addValue("name", e.name()).addValue("city", e.city()).addValue("state", e.stateCode()).addValue("slug", e.schoolSlug())
                    .addValue("campus", e.campusSearch()).addValue("curriculum", e.curriculumNote()).addValue("gender", e.gender())
                    .addValue("genderOk", e.genderConfirmed()).addValue("residence", e.residence()).addValue("residenceOk", e.residenceConfirmed())
                    .addValue("classes", e.classesLabel()).addValue("lowest", e.lowestClass()).addValue("highest", e.highestClass())
                    .addValue("classesOk", e.classesConfirmed()).addValue("feeMin", e.feeMinInr()).addValue("feeMax", e.feeMaxInr())
                    .addValue("feeText", e.feeText()).addValue("website", e.websiteUrl()).addValue("websiteOk", e.websiteChecked())
                    .addValue("note", e.note()).addValue("checked", e.checkedOn() != null ? e.checkedOn() : seed.checkedOn()).addValue("version", seed.version());
            long id = jdbc.queryForObject("""
                    INSERT INTO premier_school (entry_key, source_order, section, name, city, state_code, school_slug, campus_search, curriculum_note,
                        gender, gender_confirmed, residence, residence_confirmed, classes_label, lowest_class, highest_class, classes_confirmed,
                        fee_min_inr, fee_max_inr, fee_text, website_url, website_checked, note, checked_on, seed_version)
                    VALUES (:key, :order, :section, :name, :city, :state, :slug, :campus, :curriculum, :gender, :genderOk, :residence, :residenceOk,
                        :classes, :lowest, :highest, :classesOk, :feeMin, :feeMax, :feeText, :website, :websiteOk, :note, :checked, :version)
                    ON CONFLICT (entry_key) DO UPDATE SET source_order = :order, section = :section, name = :name, city = :city, state_code = :state,
                        school_slug = :slug, campus_search = :campus, curriculum_note = :curriculum, gender = :gender, gender_confirmed = :genderOk,
                        residence = :residence, residence_confirmed = :residenceOk, classes_label = :classes, lowest_class = :lowest,
                        highest_class = :highest, classes_confirmed = :classesOk, fee_min_inr = :feeMin, fee_max_inr = :feeMax, fee_text = :feeText,
                        website_url = :website, website_checked = :websiteOk, note = :note, checked_on = :checked, seed_version = :version
                    RETURNING id""", p, Long.class);
            jdbc.update("DELETE FROM premier_school_board WHERE premier_school_id = :id", new MapSqlParameterSource("id", id));
            for (PremierDirectoryDtos.Board b : e.boards()) {
                jdbc.update("INSERT INTO premier_school_board (premier_school_id, board_code, confirmed) VALUES (:id, :code, :ok)",
                        new MapSqlParameterSource("id", id).addValue("code", b.code()).addValue("ok", b.confirmed()));
            }
        }
        jdbc.update("DELETE FROM premier_school WHERE NOT (entry_key IN (:keys))", new MapSqlParameterSource("keys", keys));
    }

    /**
     * Links each entry to its school profile: the seed's profile address first, else the one active school with the same
     * name in the same state. Entries for several campuses stay unlinked, and no profile is linked twice.
     *
     * @return how many entries are linked
     */
    @Transactional
    public int link() {
        Map<String, Long> bySlug = new HashMap<>();
        Map<String, List<Long>> byName = new HashMap<>();
        jdbc.query("SELECT id, slug, name, state_code FROM school WHERE active", rs -> {
            bySlug.put(rs.getString(2), rs.getLong(1));
            byName.computeIfAbsent(SchoolListService.key(rs.getString(3)) + "|" + rs.getString(4), k -> new ArrayList<>()).add(rs.getLong(1));
        });
        record Entry(long id, String slug, String name, String state, String campus) {
        }
        List<Entry> entries = jdbc.query("SELECT id, school_slug, name, state_code, campus_search FROM premier_school ORDER BY source_order",
                (rs, n) -> new Entry(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)));
        // Cleared first, so a profile moving from one entry to another never meets the one-entry-per-profile index.
        jdbc.getJdbcTemplate().update("UPDATE premier_school SET school_id = NULL WHERE school_id IS NOT NULL");
        Set<Long> used = new HashSet<>();
        int linked = 0;
        for (Entry e : entries) {
            Long school = null;
            if (e.campus() == null) {
                school = e.slug() != null ? bySlug.get(e.slug()) : null;
                if (school == null) {
                    List<Long> same = byName.getOrDefault(SchoolListService.key(e.name()) + "|" + e.state(), List.of());
                    school = same.size() == 1 ? same.get(0) : null;
                }
                if (school != null && !used.add(school)) school = null;
            }
            if (school != null) {
                jdbc.update("UPDATE premier_school SET school_id = :school WHERE id = :id", new MapSqlParameterSource("school", school).addValue("id", e.id()));
                linked++;
            }
        }
        return linked;
    }
}
