package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.common.SchoolListDtos;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * School lists shown beside the published rankings. They are listed A to Z and carry no rank. An item links to a
 * school profile only when exactly one directory school fits, so a look-alike name never opens the wrong school.
 */
@Service
public class SchoolListService {

    private final NamedParameterJdbcTemplate jdbc;
    private final SchoolImageRepository images;

    public SchoolListService(NamedParameterJdbcTemplate jdbc, SchoolImageRepository images) {
        this.jdbc = jdbc;
        this.images = images;
    }

    @Transactional(readOnly = true)
    public List<SchoolListDtos.Summary> lists() {
        return jdbc.query("""
                SELECT l.list_key, l.kind, l.code, l.title, count(i.id), count(s.id)
                FROM school_list l JOIN school_list_item i ON i.list_id = l.id LEFT JOIN school s ON s.id = i.school_id AND s.active
                GROUP BY l.id ORDER BY l.id""", (rs, n) -> new SchoolListDtos.Summary(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4),
                rs.getLong(5), rs.getLong(6)));
    }

    @Transactional(readOnly = true)
    public PageResponse<SchoolListDtos.Item> items(String key, String q, int page, int size) {
        MapSqlParameterSource p = new MapSqlParameterSource("key", key);
        Long id = jdbc.query("SELECT id FROM school_list WHERE list_key = :key", p, rs -> rs.next() ? rs.getLong(1) : null);
        if (id == null) throw new ResourceNotFoundException("School list", key);
        p.addValue("list", id);
        String where = " WHERE i.list_id = :list";
        if (q != null) {
            where += " AND (lower(i.name) LIKE :q OR lower(i.place) LIKE :q)";
            p.addValue("q", "%" + q.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        Long total = jdbc.queryForObject("SELECT count(*) FROM school_list_item i" + where, p, Long.class);
        p.addValue("limit", size).addValue("offset", (long) page * size);
        List<SchoolListDtos.Item> rows = jdbc.query("""
                SELECT i.id, i.name, i.place, i.board_label, i.type_label, coalesce(i.website_url, s.website_url) AS website, s.id AS school_id, s.slug
                FROM school_list_item i LEFT JOIN school s ON s.id = i.school_id AND s.active"""
                + where + " ORDER BY lower(i.name), i.id LIMIT :limit OFFSET :offset", p, (rs, n) -> new SchoolListDtos.Item(rs.getLong("id"), rs.getString("name"),
                rs.getString("place"), rs.getString("board_label"), rs.getString("type_label"), rs.getString("website"), (Long) rs.getObject("school_id"),
                rs.getString("slug"), null, null));
        List<Long> ids = rows.stream().map(SchoolListDtos.Item::schoolId).filter(java.util.Objects::nonNull).toList();
        Map<Long, SchoolImage> covers = new HashMap<>();
        if (!ids.isEmpty()) {
            images.findGalleryImagesForSchools(ids, ImageType.LOGO, ImagePermission.PUBLISHABLE).forEach(i -> covers.putIfAbsent(i.getSchoolId(), i));
        }
        List<SchoolListDtos.Item> withImages = rows.stream().map(r -> {
            SchoolImage c = r.schoolId() == null ? null : covers.get(r.schoolId());
            return c == null || c.isIllustrative() ? r : new SchoolListDtos.Item(r.id(), r.name(), r.place(), r.board(), r.type(), r.websiteUrl(), r.schoolId(), r.slug(),
                    c.getThumbnailUrl() != null ? c.getThumbnailUrl() : c.getUrl(), c.getCredit());
        }).toList();
        long count = total == null ? 0 : total;
        int pages = (int) Math.ceil((double) count / size);
        return new PageResponse<>(withImages, page, size, count, pages, page == 0, page + 1 >= pages);
    }

    /** Replaces a list's items with the seed's; school links are set again by {@link #match()}. */
    @Transactional
    public void replace(SchoolListDtos.SeedList list, int version) {
        MapSqlParameterSource p = new MapSqlParameterSource("key", list.key()).addValue("kind", list.kind()).addValue("code", list.code())
                .addValue("title", list.title()).addValue("version", version);
        jdbc.update("""
                INSERT INTO school_list (list_key, kind, code, title, seed_version) VALUES (:key, :kind, :code, :title, :version)
                ON CONFLICT (list_key) DO UPDATE SET kind = :kind, code = :code, title = :title, seed_version = :version""", p);
        long id = jdbc.queryForObject("SELECT id FROM school_list WHERE list_key = :key", p, Long.class);
        jdbc.update("DELETE FROM school_list_item WHERE list_id = :id", new MapSqlParameterSource("id", id));
        List<SchoolListDtos.SeedItem> items = list.items();
        jdbc.getJdbcTemplate().batchUpdate("""
                INSERT INTO school_list_item (list_id, source_order, name, place, state_code, board_label, type_label, website_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                SchoolListDtos.SeedItem it = items.get(i);
                ps.setLong(1, id);
                ps.setInt(2, i + 1);
                ps.setString(3, it.name());
                ps.setString(4, it.place());
                ps.setString(5, it.stateCode());
                ps.setString(6, it.board());
                ps.setString(7, it.type());
                ps.setString(8, it.website());
            }

            @Override
            public int getBatchSize() {
                return items.size();
            }
        });
    }

    private record Candidate(long id, String state, String city, String district, String host) {
    }

    private record Item(long id, String name, String place, String state, String website) {
    }

    /**
     * Links each item to a directory school when exactly one fits: the full name in the same state, then the same
     * website in the same state, then the name before a comma in the same state and town. Anything else stays unlinked.
     *
     * @return how many items are linked
     */
    @Transactional
    public int match() {
        Map<String, List<Candidate>> byName = new HashMap<>();
        Map<String, List<Candidate>> byHost = new HashMap<>();
        jdbc.query("""
                SELECT s.id, s.name, s.state_code, s.city, d.name AS district, s.website_url FROM school s LEFT JOIN district d ON d.id = s.district_id
                WHERE s.active""", rs -> {
            Candidate c = new Candidate(rs.getLong("id"), rs.getString("state_code"), lower(rs.getString("city")), lower(rs.getString("district")), host(rs.getString("website_url")));
            byName.computeIfAbsent(key(rs.getString("name")), k -> new ArrayList<>()).add(c);
            if (c.host() != null) byHost.computeIfAbsent(c.host(), k -> new ArrayList<>()).add(c);
        });
        List<Item> items = jdbc.query("SELECT id, name, place, state_code, website_url FROM school_list_item", (rs, n) -> new Item(rs.getLong(1), rs.getString(2),
                rs.getString(3), rs.getString(4), rs.getString(5)));
        List<Long[]> links = new ArrayList<>();
        for (Item item : items) {
            Long school = match(item, byName, byHost);
            links.add(new Long[]{school, item.id()});
        }
        jdbc.getJdbcTemplate().batchUpdate("UPDATE school_list_item SET school_id = ? WHERE id = ?", links, 500, (ps, link) -> {
            ps.setObject(1, link[0]);
            ps.setLong(2, link[1]);
        });
        return (int) links.stream().filter(l -> l[0] != null).count();
    }

    private static Long match(Item item, Map<String, List<Candidate>> byName, Map<String, List<Candidate>> byHost) {
        if (item.state() == null) return null;
        Long found = single(byName.getOrDefault(key(item.name()), List.of()).stream().filter(c -> item.state().equals(c.state())).toList());
        if (found != null) return found;
        String site = host(item.website());
        if (site != null) {
            found = single(byHost.getOrDefault(site, List.of()).stream().filter(c -> item.state().equals(c.state())).toList());
            if (found != null) return found;
        }
        int comma = item.name().indexOf(',');
        if (comma < 0) return null;
        String town = lower(item.place().split(",")[0]);
        return single(byName.getOrDefault(key(item.name().substring(0, comma)), List.of()).stream()
                .filter(c -> item.state().equals(c.state()) && (town.equals(c.city()) || town.equals(c.district()))).toList());
    }

    private static Long single(List<Candidate> candidates) {
        return candidates.size() == 1 ? candidates.get(0).id() : null;
    }

    private static String lower(String s) {
        return s == null ? null : s.strip().toLowerCase(Locale.ROOT);
    }

    /** "The St. Mary's School" and "ST MARYS SCHOOL" are the same name. */
    static String key(String name) {
        return name.toLowerCase(Locale.ROOT).replace("&", "and").replaceAll("^the\\s+", "").replaceAll("[^a-z0-9]", "");
    }

    static String host(String url) {
        if (url == null || url.isBlank()) return null;
        String h = url.strip().toLowerCase(Locale.ROOT).replaceAll("^https?://", "").replaceAll("^www\\.", "").split("[/?#]", 2)[0];
        return h.isEmpty() ? null : h;
    }
}
