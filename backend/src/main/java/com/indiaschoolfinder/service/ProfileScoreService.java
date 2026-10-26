package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.util.AcademicYears;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Maintains school.profile_score, the key of the directory's default "recommended" order: schools with a definitive
 * evidence-based rank first, then the best-documented profiles. Every point comes from a published, sourced fact, so
 * the order rewards information parents can check, not fees, popularity or review counts. It is not a quality ranking.
 * Within a tier of equal scores, states take turns (school.recommended_turn) so one state never fills whole pages.
 */
@Service
public class ProfileScoreService {

    /** Published rule (shown to users); points add up per school. */
    public record Rule(int points, String fact) {
    }

    public static final List<Rule> RULES = List.of(
            new Rule(40, "Definitive India School Finder rank from verified evidence"),
            new Rule(15, "School profile verified by an editor against its official source"),
            new Rule(15, "Campus photograph cleared for publication (licence or permission recorded)"),
            new Rule(10, "Official annual fee schedule for this or last academic year"),
            new Rule(5, "Official admission cycle for this or next academic year"),
            new Rule(5, "Boarding profile from an official source"),
            new Rule(5, "At least three facilities documented by a cited source"),
            new Rule(5, "Official website"),
            new Rule(5, "Official phone number or e-mail"),
            new Rule(5, "Confirmed map location"),
            new Rule(5, "Classes offered published"),
            new Rule(5, "Full postal address with PIN code"));

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final AppProperties properties;

    public ProfileScoreService(JdbcTemplate jdbc, Clock clock, AppProperties properties) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.properties = properties;
    }

    /** Brings scores and turns up to date after a deploy (new rules or columns) without waiting for the nightly job. */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void recomputeOnStartup() {
        recompute();
    }

    /** Recomputes every school's score in one statement; returns the number of rows changed. */
    @Transactional
    public int recompute() {
        return recompute(null);
    }

    /** Recomputes one school's score (null = all schools); returns the number of rows changed. */
    @Transactional
    public int recompute(Long schoolId) {
        LocalDate today = LocalDate.now(clock.withZone(ZoneId.of(properties.getTimezone())));
        String previous = AcademicYears.of(today.minusYears(1));
        String current = AcademicYears.of(today);
        String next = AcademicYears.of(today.plusYears(1));
        String publishable = ImagePermission.PUBLISHABLE.stream().map(p -> "'" + p.name() + "'").collect(Collectors.joining(","));
        String sql = """
                UPDATE school s SET profile_score = sub.score
                FROM (
                  SELECT s2.id,
                    (CASE WHEN EXISTS (SELECT 1 FROM school_ranking r WHERE r.school_id = s2.id AND NOT r.provisional
                                       AND r.academic_year = (SELECT max(academic_year) FROM school_ranking)) THEN 40 ELSE 0 END
                   + CASE WHEN s2.verification_status = 'VERIFIED' THEN 15 ELSE 0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM school_image i WHERE i.school_id = s2.id AND i.image_type <> 'LOGO'
                                       AND NOT i.illustrative AND i.permission_status IN (%s)) THEN 15 ELSE 0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM school_fee f WHERE f.school_id = s2.id
                                       AND f.recurring_annual_official IS NOT NULL AND f.academic_year IN (?, ?)) THEN 10 ELSE 0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM admission_schedule a WHERE a.school_id = s2.id
                                       AND a.academic_year IN (?, ?)) THEN 5 ELSE 0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM school_boarding b WHERE b.school_id = s2.id) THEN 5 ELSE 0 END
                   + CASE WHEN (SELECT count(DISTINCT f.category) FROM school_facility f WHERE f.school_id = s2.id
                                AND f.available AND f.verification_status IN ('VERIFIED', 'UNVERIFIED')) >= 3 THEN 5 ELSE 0 END
                   + CASE WHEN s2.website_url IS NOT NULL THEN 5 ELSE 0 END
                   + CASE WHEN s2.phone IS NOT NULL OR s2.email IS NOT NULL THEN 5 ELSE 0 END
                   + CASE WHEN s2.latitude IS NOT NULL THEN 5 ELSE 0 END
                   + CASE WHEN EXISTS (SELECT 1 FROM school_class_offered c WHERE c.school_id = s2.id) THEN 5 ELSE 0 END
                   + CASE WHEN s2.address_line IS NOT NULL AND s2.pin_code IS NOT NULL THEN 5 ELSE 0 END) AS score
                  FROM school s2 %s
                ) sub
                WHERE s.id = sub.id AND s.profile_score <> sub.score"""
                .formatted(publishable, schoolId == null ? "" : "WHERE s2.id = ?");
        int changed = schoolId == null
                ? jdbc.update(sql, previous, current, current, next)
                : jdbc.update(sql, previous, current, current, next, schoolId);
        // A changed score moves schools between tiers, which shifts their peers' turns, so turns are always recomputed.
        jdbc.update("""
                UPDATE school s SET recommended_turn = t.turn
                FROM (
                  SELECT id, row_number() OVER (PARTITION BY profile_score, state_code ORDER BY name, id) AS turn
                  FROM school WHERE active
                ) t
                WHERE s.id = t.id AND s.recommended_turn IS DISTINCT FROM t.turn""");
        return changed;
    }
}
