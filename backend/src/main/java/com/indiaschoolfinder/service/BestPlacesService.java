package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.location.IndiaCityDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.util.SlugUtil;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * "Best schools in {place}" pages (/rankings/best-schools-in-{slug}) for states and cities. A page reports only what
 * exists for the place: schools holding a rank in a verified, non-sponsored published ranking, schools named in the
 * site's compiled A-to-Z lists, and schools in the directory. A place is offered to search engines only when at least
 * {@link #MIN_TO_INDEX} schools are ranked or listed there, so no thin page is indexed.
 */
@Service
public class BestPlacesService {

    public static final int MIN_TO_INDEX = 3;
    private static final String PUBLIC = "r.verification_status = 'VERIFIED' AND NOT r.sponsored AND s.active AND r.rating IS NULL";

    public enum Kind { STATE, CITY }

    /** One place: what is ranked and listed there, the latest ranking that covers it, and nearby places with data. */
    public record Place(Kind kind, String slug, String name, String stateCode, String stateName, String stateSlug, String city,
                        long ranked, long listed, long schools, String rankingSource, LocalDate checkedOn, boolean indexable,
                        List<Related> related) {
    }

    public record Related(String slug, String name, Kind kind, long ranked, long listed) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final LocationService locations;

    public BestPlacesService(NamedParameterJdbcTemplate jdbc, LocationService locations) {
        this.jdbc = jdbc;
        this.locations = locations;
    }

    private record Counts(long ranked, long listed) {
        long total() {
            return ranked + listed;
        }
    }

    private static String cityKey(String stateCode, String city) {
        return stateCode + "|" + SlugUtil.toSlug(city);
    }

    /** Ranked and listed counts per state code and per state|city-slug. */
    private Map<String, Counts> counts() {
        Map<String, long[]> c = new HashMap<>();
        jdbc.query("SELECT s.state_code, s.city, count(DISTINCT r.school_id) FROM ranking_source r JOIN school s ON s.id = r.school_id"
                + " WHERE " + PUBLIC + " GROUP BY s.state_code, s.city", rs -> {
            long n = rs.getLong(3);
            c.computeIfAbsent(rs.getString(1), k -> new long[2])[0] += n;
            if (rs.getString(2) != null) {
                c.computeIfAbsent(cityKey(rs.getString(1), rs.getString(2)), k -> new long[2])[0] += n;
            }
        });
        // List places read "Patna, Bihar" or "Noida, UP": the town is the part before the comma.
        jdbc.query("SELECT i.state_code, trim(split_part(i.place, ',', 1)) AS town, count(DISTINCT lower(i.name)) FROM school_list_item i"
                + " WHERE i.state_code IS NOT NULL GROUP BY i.state_code, town", rs -> {
            long n = rs.getLong(3);
            c.computeIfAbsent(rs.getString(1), k -> new long[2])[1] += n;
            if (rs.getString(2) != null && !rs.getString(2).isBlank()) {
                c.computeIfAbsent(cityKey(rs.getString(1), rs.getString(2)), k -> new long[2])[1] += n;
            }
        });
        Map<String, Counts> out = new HashMap<>();
        c.forEach((k, v) -> out.put(k, new Counts(v[0], v[1])));
        return out;
    }

    /** Every state and city with at least one ranked or listed school, most first (for the index and the sitemap). */
    @Transactional(readOnly = true)
    public List<Related> all() {
        Map<String, Counts> counts = counts();
        List<Related> out = new ArrayList<>();
        for (StateDto s : locations.states()) {
            Counts n = counts.getOrDefault(s.code(), new Counts(0, 0));
            if (n.total() > 0) out.add(new Related(s.slug(), s.name(), Kind.STATE, n.ranked(), n.listed()));
        }
        Map<String, IndiaCityDto> cities = cityBySlug(counts);
        cities.values().forEach(c -> {
            Counts n = counts.get(cityKey(c.stateCode(), c.name()));
            out.add(new Related(c.slug(), c.name(), Kind.CITY, n.ranked(), n.listed()));
        });
        out.sort(Comparator.comparingLong((Related r) -> -(r.ranked() + r.listed())).thenComparing(Related::name));
        return out;
    }

    /**
     * Cities with ranked or listed schools, by slug. A city slug that is also a state slug ("delhi") belongs to the state;
     * where two states have a city of the same name, the one with more schools ranked or listed wins.
     */
    private Map<String, IndiaCityDto> cityBySlug(Map<String, Counts> counts) {
        java.util.Set<String> stateSlugs = new java.util.HashSet<>();
        locations.states().forEach(s -> stateSlugs.add(s.slug()));
        Map<String, IndiaCityDto> bySlug = new LinkedHashMap<>();
        for (IndiaCityDto c : locations.citiesAcrossIndia()) {
            Counts n = counts.get(cityKey(c.stateCode(), c.name()));
            if (n == null || n.total() == 0 || stateSlugs.contains(c.slug())) continue;
            IndiaCityDto prev = bySlug.get(c.slug());
            if (prev == null || counts.get(cityKey(prev.stateCode(), prev.name())).total() < n.total()) bySlug.put(c.slug(), c);
        }
        return bySlug;
    }

    @Transactional(readOnly = true)
    public Place place(String slug) {
        String wanted = slug == null ? "" : slug.toLowerCase(Locale.ROOT);
        Map<String, Counts> counts = counts();
        String source = latestSource();
        for (StateDto s : locations.states()) {
            if (!s.slug().equals(wanted)) continue;
            Counts n = counts.getOrDefault(s.code(), new Counts(0, 0));
            List<Related> related = new ArrayList<>();
            // The state's cities with data first, then other states with the most.
            cityBySlug(counts).values().stream().filter(c -> c.stateCode().equals(s.code()))
                    .map(c -> { Counts k = counts.get(cityKey(c.stateCode(), c.name())); return new Related(c.slug(), c.name(), Kind.CITY, k.ranked(), k.listed()); })
                    .sorted(Comparator.comparingLong((Related r) -> -(r.ranked() + r.listed()))).limit(8).forEach(related::add);
            locations.states().stream().filter(o -> !o.code().equals(s.code()) && counts.containsKey(o.code()))
                    .map(o -> new Related(o.slug(), o.name(), Kind.STATE, counts.get(o.code()).ranked(), counts.get(o.code()).listed()))
                    .sorted(Comparator.comparingLong((Related r) -> -(r.ranked() + r.listed()))).limit(6).forEach(related::add);
            return new Place(Kind.STATE, s.slug(), s.name(), s.code(), s.name(), s.slug(), null, n.ranked(), n.listed(), s.schoolCount(),
                    n.ranked() > 0 ? source : null, n.ranked() > 0 ? checkedOn(s.code(), null) : null, n.total() >= MIN_TO_INDEX, related);
        }
        IndiaCityDto city = cityBySlug(counts).get(wanted);
        if (city == null) {
            throw new ResourceNotFoundException("Place", slug);
        }
        Counts n = counts.get(cityKey(city.stateCode(), city.name()));
        List<Related> related = new ArrayList<>();
        Counts st = counts.getOrDefault(city.stateCode(), new Counts(0, 0));
        related.add(new Related(city.stateSlug(), city.stateName(), Kind.STATE, st.ranked(), st.listed()));
        cityBySlug(counts).values().stream().filter(c -> c.stateCode().equals(city.stateCode()) && !c.slug().equals(city.slug()))
                .map(c -> { Counts k = counts.get(cityKey(c.stateCode(), c.name())); return new Related(c.slug(), c.name(), Kind.CITY, k.ranked(), k.listed()); })
                .sorted(Comparator.comparingLong((Related r) -> -(r.ranked() + r.listed()))).limit(8).forEach(related::add);
        return new Place(Kind.CITY, city.slug(), city.name(), city.stateCode(), city.stateName(), city.stateSlug(), city.name(),
                n.ranked(), n.listed(), city.schoolCount(), n.ranked() > 0 ? source : null,
                n.ranked() > 0 ? checkedOn(city.stateCode(), city.name()) : null, n.total() >= MIN_TO_INDEX, related);
    }

    /** "IIRF 2026": the latest verified academic ranking, as the page's heading year and attribution. */
    private String latestSource() {
        List<String> rows = jdbc.queryForList("""
                SELECT p.code || ' ' || e.ranking_year FROM ranking_edition e JOIN ranking_publisher p ON p.id = e.publisher_id
                WHERE p.active AND NOT e.rating_based AND EXISTS (SELECT 1 FROM ranking_source r JOIN school s ON s.id = r.school_id
                      WHERE r.edition_id = e.id AND %s)
                ORDER BY e.ranking_year DESC, e.id LIMIT 1""".formatted(PUBLIC), new MapSqlParameterSource(), String.class);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private LocalDate checkedOn(String stateCode, String city) {
        MapSqlParameterSource p = new MapSqlParameterSource("state", stateCode);
        String where = " WHERE " + PUBLIC + " AND s.state_code = :state";
        if (city != null) {
            where += " AND lower(s.city) = lower(:city)";
            p.addValue("city", city);
        }
        return jdbc.queryForObject("SELECT max(r.last_verified_date) FROM ranking_source r JOIN school s ON s.id = r.school_id" + where,
                p, LocalDate.class);
    }
}
