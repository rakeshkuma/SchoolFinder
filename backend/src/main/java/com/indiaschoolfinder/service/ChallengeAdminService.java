package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.ChallengeDtos;
import com.indiaschoolfinder.entity.Challenge;
import com.indiaschoolfinder.entity.Participant;
import com.indiaschoolfinder.entity.PracticeAttempt;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.ChallengeRepository;
import com.indiaschoolfinder.repository.ParticipantRepository;
import com.indiaschoolfinder.repository.PracticeAttemptRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Editors' side of challenges and fair play: scheduling over existing questions, the queue of flagged attempts, and
 * hiding nicknames. Every change is in the audit log. Moderators see nicknames and public ids, never accounts or emails.
 */
@Service
public class ChallengeAdminService {

    private static final String LISTED = "(p.public_listing AND NOT p.hidden AND (p.age_band = 'ADULT' "
            + "OR (p.age_band = 'MINOR' AND p.guardian_consent_at IS NOT NULL)))";
    private static final int MAX_PARTICIPANT_ROWS = 50;

    private final ChallengeRepository challenges;
    private final ChallengeService service;
    private final PracticeService practice;
    private final PracticeAttemptRepository attempts;
    private final ParticipantRepository participants;
    private final PointsService points;
    private final AchievementService achievements;
    private final AuditService audit;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ChallengeAdminService(ChallengeRepository challenges, ChallengeService service, PracticeService practice,
                                 PracticeAttemptRepository attempts, ParticipantRepository participants, PointsService points,
                                 AchievementService achievements, AuditService audit, JdbcTemplate jdbc, Clock clock) {
        this.challenges = challenges;
        this.service = service;
        this.practice = practice;
        this.attempts = attempts;
        this.participants = participants;
        this.points = points;
        this.achievements = achievements;
        this.audit = audit;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public List<ChallengeDtos.AdminRow> list() {
        Instant now = Instant.now(clock);
        Map<Long, Long> people = service.participantCounts();
        Map<Long, long[]> counts = new HashMap<>(); // attempts, flagged
        jdbc.query("""
                SELECT ca.challenge_id, count(ca.id), count(a.id) FILTER (WHERE a.review_flag = 'TOO_FAST')
                FROM challenge_attempt ca LEFT JOIN practice_attempt a ON a.id = ca.practice_attempt_id GROUP BY ca.challenge_id""",
                rs -> { counts.put(rs.getLong(1), new long[]{rs.getLong(2), rs.getLong(3)}); });
        return challenges.findAllByOrderByStartsAtDesc().stream().map(c -> {
            long[] n = counts.getOrDefault(c.getId(), new long[2]);
            return new ChallengeDtos.AdminRow(c.getId(), service.summary(c, people.getOrDefault(c.getId(), 0L), now), c.getRules(),
                    c.getQuestionIds(), c.getPointsPerCorrect(), c.getCompletionBonus(), c.isLeaderboardEnabled(), c.isPublished(), n[0], n[1]);
        }).toList();
    }

    public void create(ChallengeDtos.SaveRequest r) {
        if (challenges.existsBySlug(r.slug())) throw new BusinessValidationException("slug", "this address is already used by another challenge");
        Challenge c = new Challenge();
        apply(c, r);
        c = challenges.save(c);
        audit.record("CHALLENGE_CREATED", "CHALLENGE", c.getId(), c.getSlug());
    }

    /** Once anyone has started, the questions and scoring stay fixed so that every attempt is judged alike. */
    public void update(long id, ChallengeDtos.SaveRequest r) {
        Challenge c = find(id);
        if (!c.getSlug().equals(r.slug()) && challenges.existsBySlug(r.slug())) {
            throw new BusinessValidationException("slug", "this address is already used by another challenge");
        }
        boolean fixed = !c.getQuestionIds().equals(r.questionIds()) || c.getPointsPerCorrect() != r.pointsPerCorrect()
                || c.getCompletionBonus() != r.completionBonus() || c.getDurationMinutes() != r.durationMinutes();
        if (fixed && attemptCount(id) > 0) {
            throw new BusinessValidationException("questionIds", "students have already started: questions, scoring and duration can no longer change");
        }
        apply(c, r);
        challenges.save(c);
        audit.record("CHALLENGE_UPDATED", "CHALLENGE", id, c.getSlug());
    }

    public void publish(long id, boolean published) {
        Challenge c = find(id);
        c.setPublished(published);
        challenges.save(c);
        audit.record(published ? "CHALLENGE_PUBLISHED" : "CHALLENGE_UNPUBLISHED", "CHALLENGE", id, c.getSlug());
    }

    /** Only a challenge nobody has started; otherwise it can be unpublished, which keeps the results. */
    public void delete(long id) {
        Challenge c = find(id);
        if (attemptCount(id) > 0) throw new BusinessValidationException("id", "students have taken this challenge: unpublish it instead");
        challenges.delete(c);
        audit.record("CHALLENGE_DELETED", "CHALLENGE", id, c.getSlug());
    }

    // --- review -----------------------------------------------------------------------------------------------------

    public PageResponse<ChallengeDtos.ReviewItem> reviewQueue(int page, int size) {
        Long total = jdbc.queryForObject("SELECT count(*) FROM practice_attempt WHERE review_flag = 'TOO_FAST'", Long.class);
        long count = total == null ? 0 : total;
        List<ChallengeDtos.ReviewItem> rows = jdbc.query("""
                SELECT a.id, p.public_id, p.nickname, a.title, a.mode, c.slug, a.total, a.attempted, a.correct, a.duration_seconds,
                       a.review_flag, a.created_at
                FROM practice_attempt a JOIN participant p ON p.id = a.participant_id LEFT JOIN challenge c ON c.id = a.challenge_id
                WHERE a.review_flag = 'TOO_FAST' ORDER BY a.created_at DESC LIMIT ? OFFSET ?""",
                (rs, i) -> new ChallengeDtos.ReviewItem(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getInt(7), rs.getInt(8), rs.getInt(9), (Integer) rs.getObject(10), rs.getString(11),
                        rs.getTimestamp(12).toInstant()), size, (long) page * size);
        int pages = (int) Math.ceil((double) count / size);
        return new PageResponse<>(rows, page, size, count, pages, page == 0, page + 1 >= pages);
    }

    /** CLEAR gives the attempt the points it was refused; VOID removes it from rankings, points and badges. */
    public void decide(long attemptId, ChallengeDtos.ReviewDecision d) {
        PracticeAttempt a = attempts.findById(attemptId).orElseThrow(() -> new ResourceNotFoundException("Practice attempt", attemptId));
        if (a.getParticipantId() == null) throw new ResourceNotFoundException("Practice attempt", attemptId);
        if (d.decision() == ChallengeDtos.Decision.CLEAR) {
            if (!"TOO_FAST".equals(a.getReviewFlag())) throw new BusinessValidationException("decision", "only a flagged attempt can be cleared");
            if (a.getChallengeId() != null) points.awardChallenge(a, find(a.getChallengeId()), true);
            else points.clearFlag(a);
            achievements.evaluate(a.getParticipantId());
        } else {
            points.voidAttempt(a);
            achievements.reconcile(a.getParticipantId());
        }
        audit.record(d.decision() == ChallengeDtos.Decision.CLEAR ? "ATTEMPT_CLEARED" : "ATTEMPT_VOIDED", "PRACTICE_ATTEMPT", attemptId, d.note());
    }

    // --- participants -----------------------------------------------------------------------------------------------

    public List<ChallengeDtos.ParticipantRow> participants(String q) {
        String like = q == null || q.isBlank() ? "%" : "%" + q.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return jdbc.query("""
                SELECT p.public_id, p.nickname, p.state_code, p.account_id IS NULL AS guest, %s AS listed, p.hidden,
                       (SELECT coalesce(sum(l.points), 0) FROM points_ledger l WHERE l.participant_id = p.id) AS points,
                       (SELECT count(*) FROM practice_attempt a WHERE a.participant_id = p.id) AS attempts,
                       (SELECT count(*) FROM practice_attempt a WHERE a.participant_id = p.id AND a.review_flag = 'TOO_FAST') AS flagged
                FROM participant p WHERE lower(p.nickname) LIKE ? OR lower(p.public_id) LIKE ?
                ORDER BY p.hidden DESC, flagged DESC, points DESC LIMIT ?""".formatted(LISTED),
                (rs, i) -> new ChallengeDtos.ParticipantRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getBoolean(4), rs.getBoolean(5),
                        rs.getBoolean(6), rs.getLong(7), rs.getLong(8), rs.getLong(9)), like, like, MAX_PARTICIPANT_ROWS);
    }

    /** Hidden students stay ranked but never appear by name, whatever their own settings say. */
    public void hide(String publicId, ChallengeDtos.HideRequest r) {
        Participant p = participants.findByPublicId(publicId).orElseThrow(() -> new ResourceNotFoundException("Participant", publicId));
        p.setHidden(r.hidden());
        participants.save(p);
        audit.record(r.hidden() ? "PARTICIPANT_HIDDEN" : "PARTICIPANT_SHOWN", "PARTICIPANT", p.getId(), r.note());
    }

    public ChallengeDtos.Overview overview() {
        Instant now = Instant.now(clock);
        return new ChallengeDtos.Overview(count("SELECT count(*) FROM participant"),
                count("SELECT count(*) FROM participant p WHERE " + LISTED),
                jdbc.queryForObject("SELECT count(*) FROM practice_attempt WHERE participant_id IS NOT NULL AND created_at >= ?", Long.class,
                        Timestamp.from(now.minus(Duration.ofDays(7)))),
                count("SELECT count(*) FROM practice_attempt WHERE review_flag = 'TOO_FAST'"),
                challenges.findByPublishedTrueOrderByStartsAtDesc().stream().filter(c -> ChallengeService.status(c, now) == ChallengeDtos.Status.ACTIVE).count());
    }

    private long count(String sql) {
        Long n = jdbc.queryForObject(sql, Long.class);
        return n == null ? 0 : n;
    }

    private void apply(Challenge c, ChallengeDtos.SaveRequest r) {
        if (!r.endsAt().isAfter(r.startsAt())) throw new BusinessValidationException("endsAt", "the end must be after the start");
        Set<String> known = practice.bankIndex().keySet();
        if (new HashSet<>(r.questionIds()).size() != r.questionIds().size()) {
            throw new BusinessValidationException("questionIds", "a question appears more than once");
        }
        for (String id : r.questionIds()) {
            if (!known.contains(id)) throw new BusinessValidationException("questionIds", "'" + id + "' is not a published question");
        }
        c.setSlug(r.slug());
        c.setTitle(r.title().strip());
        c.setDescription(r.description().strip());
        c.setRules(r.rules() == null || r.rules().isBlank() ? null : r.rules().strip());
        c.setKind(r.kind());
        c.setExamSlug(r.examSlug() == null || r.examSlug().isBlank() ? null : r.examSlug());
        c.setCategory(r.category());
        c.setDifficulty(r.difficulty());
        c.setQuestionIds(List.copyOf(r.questionIds()));
        c.setDurationMinutes(r.durationMinutes());
        c.setStartsAt(r.startsAt());
        c.setEndsAt(r.endsAt());
        c.setPointsPerCorrect(r.pointsPerCorrect());
        c.setCompletionBonus(r.completionBonus());
        c.setMaxAttempts(r.maxAttempts());
        c.setResultRelease(r.resultRelease());
        c.setLeaderboardEnabled(r.leaderboardEnabled());
    }

    private Challenge find(long id) {
        return challenges.findById(id).orElseThrow(() -> new ResourceNotFoundException("Challenge", id));
    }

    private long attemptCount(long challengeId) {
        Long n = jdbc.queryForObject("SELECT count(*) FROM challenge_attempt WHERE challenge_id = ?", Long.class, challengeId);
        return n == null ? 0 : n;
    }
}
