package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.LeaderboardDtos;
import com.indiaschoolfinder.dto.practice.LeaderboardDtos.Filter;
import com.indiaschoolfinder.dto.practice.LeaderboardDtos.Period;
import com.indiaschoolfinder.dto.practice.LeaderboardDtos.Row;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Rankings, computed from points_ledger on every request (no stored copy that could drift). Order: points, then
 * accuracy, then whoever reached their points first. Tied students share a rank. Everyone with points in the view is
 * ranked, so positions are honest, but only publicly listed students show a nickname or place.
 */
@Service
public class LeaderboardService {

    static final int MAX_SIZE = 100;
    private static final String LISTED = "(p.public_listing AND NOT p.hidden AND (p.age_band = 'ADULT' "
            + "OR (p.age_band = 'MINOR' AND p.guardian_consent_at IS NOT NULL)))";
    /** A test that counts towards streaks and badges: at least half answered, and not flagged as too fast or untimed. */
    static final String COUNTED = "(attempted > 0 AND attempted * 2 >= total AND (review_flag IS NULL OR review_flag = 'DAILY_REPEAT'))";

    /** A student's all-time place among everyone ranked. */
    public record Position(int rank, long participants) {
    }

    static final long SLOW_POSITION_MILLIS = 300;
    static final java.time.Duration POSITION_LIST_AGE = java.time.Duration.ofMinutes(1);

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final java.util.concurrent.locks.ReentrantLock positionsLock = new java.util.concurrent.locks.ReentrantLock();
    private volatile boolean usePositionList;
    private volatile Map<Long, Position> positions;
    private volatile Instant positionsTakenAt;

    public LeaderboardService(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Start of the period in the site's time zone (weeks start on Monday); the epoch for ALL. */
    public Instant from(Period period) {
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        return switch (period) {
            case TODAY -> today.atStartOfDay(zone).toInstant();
            case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay(zone).toInstant();
            case MONTH -> today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
            case ALL -> Instant.EPOCH;
        };
    }

    public LeaderboardDtos.Page page(Filter f, int page, int size, Long meParticipantId) {
        Instant from = from(f.period());
        MapSqlParameterSource params = new MapSqlParameterSource("from", Timestamp.from(from));
        return render(rankedSql(f, params), params, f.period(), from, f.q(), page, size, meParticipantId);
    }

    /**
     * One challenge's ranking: each student's best valid attempt, by score, then accuracy, then the shorter time, then
     * the earlier submission. Flagged and voided attempts are left out; "points" here are the challenge score.
     */
    public LeaderboardDtos.Page challenge(long challengeId, Instant startsAt, int page, int size, Long meParticipantId) {
        String best = "ca.score DESC, (ca.correct::numeric / NULLIF(ca.attempted, 0)) DESC NULLS LAST, ca.duration_seconds ASC, ca.submitted_at ASC";
        String order = "b.score DESC, (b.correct::numeric / NULLIF(b.attempted, 0)) DESC NULLS LAST, b.duration_seconds ASC, b.submitted_at ASC";
        String ranked = "WITH b AS (SELECT DISTINCT ON (ca.participant_id) ca.participant_id, ca.score, ca.correct, ca.attempted,"
                + " ca.duration_seconds, ca.submitted_at FROM challenge_attempt ca JOIN practice_attempt a ON a.id = ca.practice_attempt_id"
                + " WHERE ca.challenge_id = :challenge AND a.review_flag IS NULL ORDER BY ca.participant_id, " + best + "),"
                + " ranked AS (SELECT p.id, p.nickname, p.state_code, p.city, p.show_city, p.track, " + LISTED + " AS listed,"
                + " b.score AS points, 1 AS tests, b.correct, b.attempted,"
                + " RANK() OVER (ORDER BY " + order + ") AS rnk, ROW_NUMBER() OVER (ORDER BY " + order + ", p.id) AS pos"
                + " FROM b JOIN participant p ON p.id = b.participant_id)";
        return render(ranked, new MapSqlParameterSource("challenge", challengeId), Period.ALL, startsAt, null, page, size, meParticipantId);
    }

    private LeaderboardDtos.Page render(String ranked, MapSqlParameterSource params, Period period, Instant from, String q,
                                        int page, int size, Long meParticipantId) {
        int pageSize = Math.max(1, Math.min(MAX_SIZE, size));
        int pageNo = Math.max(0, page);
        boolean searching = q != null && !q.isBlank();
        if (searching) {
            params.addValue("q", "%" + q.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        params.addValue("limit", pageSize).addValue("offset", (long) pageNo * pageSize).addValue("me", meParticipantId == null ? -1L : meParticipantId);
        // One statement: the ranking is worked out once, for the total, the page, and the student with their neighbours.
        String sql = ranked + ", mine AS (SELECT pos FROM ranked WHERE id = :me)"
                + (searching ? ", found AS (SELECT id, ROW_NUMBER() OVER (ORDER BY pos) AS n, count(*) OVER () AS matches FROM ranked WHERE listed AND lower(nickname) LIKE :q)" : "")
                + " SELECT r.*, (SELECT count(*) FROM ranked) AS total, "
                + (searching ? "(SELECT coalesce(max(matches), 0) FROM found)" : "0::bigint") + " AS matches,"
                + (searching ? " EXISTS (SELECT 1 FROM found f WHERE f.id = r.id AND f.n > :offset AND f.n <= :offset + :limit)"
                        : " (r.pos > :offset AND r.pos <= :offset + :limit)") + " AS on_page"
                + " FROM ranked r WHERE " + (searching ? "r.id IN (SELECT id FROM found WHERE n > :offset AND n <= :offset + :limit)"
                        : "(r.pos > :offset AND r.pos <= :offset + :limit)")
                + " OR r.pos IN (SELECT pos - 1 FROM mine UNION ALL SELECT pos FROM mine UNION ALL SELECT pos + 1 FROM mine) ORDER BY r.pos";
        long[] totals = new long[2];
        List<Raw> rows = new ArrayList<>();
        List<Raw> fetched = jdbc.query(sql, params, (rs, i) -> {
            totals[0] = rs.getLong("total");
            totals[1] = rs.getLong("matches");
            Raw r = raw(rs, i);
            if (rs.getBoolean("on_page")) rows.add(r);
            return r;
        });
        // Past the last page nothing comes back, so the totals need asking for on their own.
        Long participants = !fetched.isEmpty() ? (Long) totals[0] : jdbc.queryForObject(ranked + " SELECT count(*) FROM ranked", params, Long.class);
        Long matches = !searching ? participants : !fetched.isEmpty() ? (Long) totals[1]
                : jdbc.queryForObject(ranked + " SELECT count(*) FROM ranked WHERE listed AND lower(nickname) LIKE :q", params, Long.class);

        Raw me = meParticipantId == null ? null : fetched.stream().filter(r -> r.id == meParticipantId).findFirst().orElse(null);
        List<Raw> around = me == null ? List.of() : aroundOf(fetched, me.pos);
        Set<Long> ids = new HashSet<>();
        rows.forEach(r -> ids.add(r.id));
        around.forEach(r -> ids.add(r.id));
        if (me != null) ids.add(me.id);
        Map<Long, Integer> streaks = streaks(ids);

        List<Row> out = new ArrayList<>();
        for (Raw r : rows) out.add(r.toRow(streaks, meParticipantId));
        LeaderboardDtos.MyRank mine = null;
        if (me != null) {
            long myPos = me.pos;
            Raw above = around.stream().filter(r -> r.pos < myPos).findFirst().orElse(null);
            Raw below = around.stream().filter(r -> r.pos > myPos).findFirst().orElse(null);
            mine = new LeaderboardDtos.MyRank(me.toRow(streaks, meParticipantId),
                    above == null ? null : above.toRow(streaks, meParticipantId),
                    below == null ? null : below.toRow(streaks, meParticipantId));
        }
        return new LeaderboardDtos.Page(period, from, participants == null ? 0 : participants, matches == null ? 0 : matches,
                pageNo, pageSize, out, mine);
    }

    private static List<Raw> aroundOf(List<Raw> fetched, long pos) {
        return fetched.stream().filter(r -> r.pos == pos - 1 || r.pos == pos + 1).toList();
    }

    /**
     * The student's all-time position; null until they have points. It is asked for on every submission, so once the
     * exact query becomes slow the answer comes from a list of everyone's positions, refreshed at most once a minute.
     * A small site always gets the exact figure; a large one can be up to a minute behind.
     */
    public Position position(long participantId) {
        if (!usePositionList) {
            long started = System.nanoTime();
            MapSqlParameterSource params = new MapSqlParameterSource();
            String ranked = allTime(params);
            Position exact = jdbc.query(ranked + " SELECT rnk, (SELECT count(*) FROM ranked) AS total FROM ranked WHERE id = :me",
                    params.addValue("me", participantId), (rs, i) -> new Position(rs.getInt("rnk"), rs.getLong("total"))).stream().findFirst().orElse(null);
            if (elapsedMillis(started) > SLOW_POSITION_MILLIS) usePositionList = true;
            return exact;
        }
        return positionList().get(participantId);
    }

    /** One caller refreshes the list; the others carry on with the one they have rather than wait. */
    private Map<Long, Position> positionList() {
        Instant now = Instant.now(clock);
        Map<Long, Position> current = positions;
        if (current != null && !positionsTakenAt.plus(POSITION_LIST_AGE).isBefore(now)) return current;
        if (current == null) positionsLock.lock();
        else if (!positionsLock.tryLock()) return current;
        try {
            if (positions != null && !positionsTakenAt.plus(POSITION_LIST_AGE).isBefore(now)) return positions;
            long started = System.nanoTime();
            MapSqlParameterSource params = new MapSqlParameterSource();
            Map<Long, Position> all = new HashMap<>();
            List<long[]> rows = jdbc.query(allTime(params) + " SELECT id, rnk FROM ranked", params, (rs, i) -> new long[]{rs.getLong(1), rs.getLong(2)});
            rows.forEach(r -> all.put(r[0], new Position((int) r[1], rows.size())));
            positionsTakenAt = now;
            positions = all;
            usePositionList = elapsedMillis(started) > SLOW_POSITION_MILLIS / 2; // the site has become quick again
            return all;
        } finally {
            positionsLock.unlock();
        }
    }

    private static String allTime(MapSqlParameterSource params) {
        params.addValue("from", Timestamp.from(Instant.EPOCH));
        return rankedSql(new Filter(Period.ALL, null, null, null, false, null, null, null, null), params);
    }

    private static long elapsedMillis(long startedNanos) {
        return (System.nanoTime() - startedNanos) / 1_000_000;
    }

    /** The ranked view as a CTE named "ranked"; every value from the request is a bound parameter. */
    private static String rankedSql(Filter f, MapSqlParameterSource params) {
        StringBuilder scope = new StringBuilder();
        if (f.exam() != null) { scope.append(" AND l.exam_slug = :exam"); params.addValue("exam", f.exam()); }
        if (f.category() != null) { scope.append(" AND l.category = :category"); params.addValue("category", f.category()); }
        if (f.section() != null) { scope.append(" AND l.section = :section"); params.addValue("section", f.section()); }
        if (f.daily()) scope.append(" AND l.source = 'DAILY'");
        boolean scoped = !scope.isEmpty();
        StringBuilder who = new StringBuilder();
        if (f.state() != null) { who.append(" AND p.state_code = :state"); params.addValue("state", f.state()); }
        if (f.track() != null) { who.append(" AND p.track = :track"); params.addValue("track", f.track()); }
        if (f.city() != null) { who.append(" AND p.show_city AND lower(p.city) = lower(:city)"); params.addValue("city", f.city().strip()); }
        // Tests and accuracy count the period's attempts that earned points in this view (or, for an exam, were for it).
        String testScope = !scoped ? "" : " AND (EXISTS (SELECT 1 FROM points_ledger l WHERE l.attempt_id = a.id" + scope + ")"
                + (f.exam() != null ? " OR a.exam_slug = :exam" : "") + ")";
        String order = "pts.points DESC, (att.correct::numeric / NULLIF(att.attempted, 0)) DESC NULLS LAST, pts.last_at ASC";
        return "WITH pts AS (SELECT l.participant_id, sum(l.points) AS points, max(l.earned_at) AS last_at FROM points_ledger l"
                + " WHERE l.earned_at >= :from" + scope + " GROUP BY l.participant_id),"
                + " att AS (SELECT a.participant_id, count(*) AS tests, sum(a.correct) AS correct, sum(a.attempted) AS attempted"
                + " FROM practice_attempt a WHERE a.participant_id IN (SELECT participant_id FROM pts) AND a.created_at >= :from"
                + testScope + " GROUP BY a.participant_id),"
                + " ranked AS (SELECT p.id, p.nickname, p.state_code, p.city, p.show_city, p.track, " + LISTED + " AS listed,"
                + " pts.points, coalesce(att.tests, 0) AS tests, att.correct, att.attempted,"
                + " RANK() OVER (ORDER BY " + order + ") AS rnk,"
                + " ROW_NUMBER() OVER (ORDER BY " + order + ", p.id) AS pos"
                + " FROM pts JOIN participant p ON p.id = pts.participant_id LEFT JOIN att ON att.participant_id = pts.participant_id"
                + " WHERE TRUE" + who + ")";
    }

    /** Consecutive days with at least one counted test, ending today or yesterday, in the site's time zone. */
    private Map<Long, Integer> streaks(Set<Long> ids) {
        Map<Long, Integer> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        MapSqlParameterSource params = new MapSqlParameterSource("ids", ids)
                .addValue("zone", clock.getZone().getId())
                .addValue("since", Timestamp.from(Instant.now(clock).minusSeconds(400L * 86400)));
        Map<Long, Set<LocalDate>> days = new HashMap<>();
        jdbc.query("SELECT DISTINCT participant_id, (created_at AT TIME ZONE :zone)::date AS d FROM practice_attempt"
                + " WHERE participant_id IN (:ids) AND created_at >= :since AND " + COUNTED, params,
                rs -> { days.computeIfAbsent(rs.getLong(1), k -> new HashSet<>()).add(rs.getDate(2).toLocalDate()); });
        LocalDate today = LocalDate.now(clock);
        days.forEach((id, set) -> out.put(id, streak(set, today)));
        return out;
    }

    static int streak(Set<LocalDate> days, LocalDate today) {
        LocalDate d = days.contains(today) ? today : today.minusDays(1);
        int n = 0;
        while (days.contains(d)) {
            n++;
            d = d.minusDays(1);
        }
        return n;
    }

    private record Raw(long id, long pos, int rank, boolean listed, String nickname, String stateCode, String city, boolean showCity,
                       String track, long points, int tests, Long correct, Long attempted) {

        Row toRow(Map<Long, Integer> streaks, Long me) {
            Integer accuracy = attempted == null || attempted == 0 ? null : (int) Math.round(100.0 * correct / attempted);
            boolean isMe = me != null && me == id;
            boolean show = listed || isMe; // you always see your own details
            return new Row(rank, listed, show ? nickname : null, show ? initials(nickname) : null, show ? stateCode : null,
                    show && showCity ? city : null, show ? track : null, points, tests, accuracy, streaks.getOrDefault(id, 0), isMe);
        }
    }

    private static Raw raw(ResultSet rs, int i) throws SQLException {
        long correct = rs.getLong("correct");
        Long c = rs.wasNull() ? null : correct;
        long attempted = rs.getLong("attempted");
        Long a = rs.wasNull() ? null : attempted;
        return new Raw(rs.getLong("id"), rs.getLong("pos"), rs.getInt("rnk"), rs.getBoolean("listed"), rs.getString("nickname"),
                rs.getString("state_code"), rs.getString("city"), rs.getBoolean("show_city"), rs.getString("track"),
                rs.getLong("points"), rs.getInt("tests"), c, a);
    }

    static String initials(String nickname) {
        if (nickname == null || nickname.isBlank()) return null;
        String[] words = nickname.strip().split("\\s+");
        String first = words[0].substring(0, words[0].offsetByCodePoints(0, 1));
        String second = words.length > 1 ? words[1].substring(0, words[1].offsetByCodePoints(0, 1)) : "";
        return (first + second).toUpperCase(Locale.ROOT);
    }
}
