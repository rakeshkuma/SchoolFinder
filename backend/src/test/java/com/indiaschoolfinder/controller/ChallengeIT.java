package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.service.PracticeService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static java.time.temporal.ChronoUnit.HOURS;
import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Challenges over the existing bank: schedule, attempt limits, server timing and scoring, ranking, release and moderation. */
class ChallengeIT extends AbstractIntegrationTest {

    private static final String TOKEN = "X-Participant-Token";

    @Autowired
    private PracticeService practice;

    @BeforeEach
    void clean() throws Exception {
        jdbc.execute("TRUNCATE challenge RESTART IDENTITY CASCADE");
        jdbc.execute("TRUNCATE participant RESTART IDENTITY CASCADE");
        jdbc.execute("TRUNCATE practice_set RESTART IDENTITY");
        jdbc.execute("TRUNCATE exam RESTART IDENTITY CASCADE");
        for (String[] seed : new String[][]{{"seed/practice.json", "practice-sets"}, {"seed/exams.json", "exams"}}) {
            JsonNode catalogue = objectMapper.readTree(new ClassPathResource(seed[0]).getInputStream());
            mockMvc.perform(post("/api/v1/admin/" + seed[1] + "/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json(catalogue))).andExpect(status().isOk());
        }
    }

    private List<String> ids(int n) {
        return practice.bankIndex().keySet().stream().filter(id -> id.startsWith("jnvst-")).sorted().limit(n).toList();
    }

    private Map<String, Object> request(String slug, Instant start, Instant end, String release, int attempts) {
        Map<String, Object> r = new HashMap<>();
        r.put("slug", slug);
        r.put("title", "JNVST weekly");
        r.put("description", "Five JNVST questions.");
        r.put("kind", "WEEKLY");
        r.put("examSlug", "jnvst");
        r.put("difficulty", "MIXED");
        r.put("questionIds", ids(5));
        r.put("durationMinutes", 10);
        r.put("startsAt", start.toString());
        r.put("endsAt", end.toString());
        r.put("pointsPerCorrect", 20);
        r.put("completionBonus", 5);
        r.put("maxAttempts", attempts);
        r.put("resultRelease", release);
        r.put("leaderboardEnabled", true);
        return r;
    }

    private long create(Map<String, Object> r) throws Exception {
        mockMvc.perform(post("/api/v1/admin/challenges").header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(r))).andExpect(status().isCreated());
        long id = jdbc.queryForObject("SELECT id FROM challenge WHERE slug = ?", Long.class, r.get("slug"));
        mockMvc.perform(patch("/api/v1/admin/challenges/" + id + "/published").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("published", true)))).andExpect(status().isOk());
        return id;
    }

    private String join(String nickname) throws Exception {
        Map<String, Object> p = new HashMap<>(Map.of("nickname", nickname, "stateCode", "BR", "showCity", false, "age", "ADULT", "publicListing", true));
        return body(mockMvc.perform(post("/api/v1/participants").contentType(MediaType.APPLICATION_JSON).content(json(p)))
                .andExpect(status().isCreated()).andReturn()).get("token").asText();
    }

    private long start(String slug, String token) throws Exception {
        return body(mockMvc.perform(post("/api/v1/challenges/" + slug + "/attempts").header(TOKEN, token)).andExpect(status().isOk()).andReturn())
                .get("attemptId").asLong();
    }

    private Map<String, Integer> answers(int right) {
        List<String> ids = ids(5);
        Map<String, Integer> a = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) {
            int answer = practice.bankIndex().get(ids.get(i)).question().answer();
            a.put(ids.get(i), i < right ? answer : (answer + 1) % 2);
        }
        return a;
    }

    private org.springframework.test.web.servlet.ResultActions submit(String slug, long attempt, String token, Map<String, Integer> answers) throws Exception {
        return mockMvc.perform(post("/api/v1/challenges/" + slug + "/attempts/" + attempt + "/submit").header(TOKEN, token)
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("answers", answers))));
    }

    /** As if the attempt started this long ago, so the server's clock sees a plausible time. */
    private void startedAgo(long attempt, int minutes) {
        Instant at = Instant.now().minus(minutes, MINUTES);
        jdbc.update("UPDATE challenge_attempt SET started_at = ? WHERE id = ?", Timestamp.from(at), attempt);
    }

    @Test
    void aChallengeIsScoredByTheServerOnceAndRanksByScoreAccuracyThenTime() throws Exception {
        Instant now = Instant.now();
        create(request("weekly", now.minus(1, HOURS), now.plus(1, HOURS), "IMMEDIATE", 1));
        mockMvc.perform(get("/api/v1/challenges")).andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].maxScore").value(105)).andExpect(jsonPath("$[0].participants").value(0))
                .andExpect(jsonPath("$[0].questions").value(5));

        String asha = join("Asha Star");
        String esha = join("Esha Bright");
        String dev = join("Dev Rising");
        long a = start("weekly", asha);
        assertThat(start("weekly", asha)).as("a reload resumes the same attempt").isEqualTo(a);
        // The questions come without answers.
        String session = mockMvc.perform(post("/api/v1/challenges/weekly/attempts").header(TOKEN, asha)).andReturn().getResponse().getContentAsString();
        assertThat(session).doesNotContain("\"answer\"").doesNotContain("explanation");

        long e = start("weekly", esha);
        long d = start("weekly", dev);
        startedAgo(a, 5);
        startedAgo(e, 3);
        startedAgo(d, 2);
        submit("weekly", a, asha, answers(4)).andExpect(jsonPath("$.released").value(true))
                .andExpect(jsonPath("$.score.correct").value(4))
                .andExpect(jsonPath("$.points.earned").value(85)); // 4 × 20 + bonus 5
        submit("weekly", a, asha, answers(5)).andExpect(jsonPath("$.points.earned").value(85))
                .andExpect(jsonPath("$.score.correct").value(4)); // a second submission changes nothing
        submit("weekly", e, esha, answers(4)); // same score, faster
        submit("weekly", d, dev, answers(5));

        mockMvc.perform(get("/api/v1/challenges/weekly/leaderboard"))
                .andExpect(jsonPath("$.participants").value(3))
                .andExpect(jsonPath("$.rows[0].nickname").value("Dev Rising")).andExpect(jsonPath("$.rows[0].points").value(105))
                .andExpect(jsonPath("$.rows[1].nickname").value("Esha Bright"))
                .andExpect(jsonPath("$.rows[2].nickname").value("Asha Star"));
        // Limit reached; raw marks and points stay apart; the challenge shows in the student's history.
        mockMvc.perform(post("/api/v1/challenges/weekly/attempts").header(TOKEN, asha)).andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/challenges/weekly").header(TOKEN, asha))
                .andExpect(jsonPath("$.mine.attemptsLeft").value(0)).andExpect(jsonPath("$.mine.best.score").value(85));
        mockMvc.perform(get("/api/v1/participants/me/history").header(TOKEN, asha)).andExpect(jsonPath("$[0].attempt.mode").value("CHALLENGE"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM points_ledger WHERE source = 'CHALLENGE' AND question_id = 'bonus'", Integer.class)).isEqualTo(3);
    }

    @Test
    void simultaneousSubmissionsCountOnce() throws Exception {
        Instant now = Instant.now();
        create(request("race", now.minus(1, HOURS), now.plus(1, HOURS), "IMMEDIATE", 1));
        String asha = join("Asha Star");
        ExecutorService pool = Executors.newFixedThreadPool(6);
        // Starting several times at once (a double tap) gives one attempt, and nobody is told they have used it up.
        List<Future<Long>> starts = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) starts.add(pool.submit(() -> start("race", asha)));
        java.util.Set<Long> started = new java.util.HashSet<>();
        for (Future<Long> f : starts) started.add(f.get());
        assertThat(started).hasSize(1);
        long a = started.iterator().next();
        startedAgo(a, 5);
        List<Future<Integer>> runs = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) runs.add(pool.submit(() -> submit("race", a, asha, answers(5)).andReturn().getResponse().getStatus()));
        for (Future<Integer> f : runs) assertThat(f.get()).isEqualTo(200);
        pool.shutdown();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM practice_attempt WHERE challenge_id IS NOT NULL", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT sum(points) FROM points_ledger", Integer.class)).isEqualTo(105);
    }

    @Test
    void onlyOpenChallengesCanBeStartedAndLateAnswersAreRefused() throws Exception {
        Instant now = Instant.now();
        create(request("later", now.plus(1, HOURS), now.plus(2, HOURS), "IMMEDIATE", 1));
        long past = create(request("past", now.minus(3, HOURS), now.minus(1, HOURS), "IMMEDIATE", 1));
        String asha = join("Asha Star");
        mockMvc.perform(get("/api/v1/challenges/later")).andExpect(jsonPath("$.summary.status").value("UPCOMING"));
        mockMvc.perform(post("/api/v1/challenges/later/attempts").header(TOKEN, asha)).andExpect(status().isConflict());
        mockMvc.perform(post("/api/v1/challenges/past/attempts").header(TOKEN, asha)).andExpect(status().isConflict());
        mockMvc.perform(post("/api/v1/challenges/later/attempts")).andExpect(status().isUnauthorized());

        create(request("open", now.minus(1, HOURS), now.plus(1, HOURS), "IMMEDIATE", 2));
        long a = start("open", asha);
        jdbc.update("UPDATE challenge_attempt SET deadline_at = ? WHERE id = ?", Timestamp.from(now.minus(5, MINUTES)), a);
        submit("open", a, asha, answers(5)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM points_ledger", Integer.class)).isZero();
        // Someone else's attempt does not exist for this student; the used attempt counts, the second is still theirs.
        long second = start("open", asha);
        assertThat(second).isNotEqualTo(a);
        submit("open", second, join("Other One"), answers(5)).andExpect(status().isNotFound());
        assertThat(past).isPositive();
    }

    @Test
    void resultsHeldUntilTheEndRevealNothingBefore() throws Exception {
        Instant now = Instant.now();
        long id = create(request("held", now.minus(1, HOURS), now.plus(1, HOURS), "AFTER_END", 1));
        String asha = join("Asha Star");
        long a = start("held", asha);
        startedAgo(a, 5);
        submit("held", a, asha, answers(5)).andExpect(jsonPath("$.released").value(false))
                .andExpect(jsonPath("$.score").doesNotExist()).andExpect(jsonPath("$.points").doesNotExist());
        mockMvc.perform(get("/api/v1/participants/me/history").header(TOKEN, asha)).andExpect(jsonPath("$.length()").value(0));
        Long attempt = jdbc.queryForObject("SELECT id FROM practice_attempt", Long.class);
        mockMvc.perform(get("/api/v1/participants/me/attempts/" + attempt).header(TOKEN, asha)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/challenges/held/leaderboard")).andExpect(jsonPath("$.participants").value(0));
        mockMvc.perform(get("/api/v1/challenges/held").header(TOKEN, asha)).andExpect(jsonPath("$.mine.best").doesNotExist());

        // When the challenge ends, everything appears.
        Timestamp ended = Timestamp.from(now.minus(1, MINUTES));
        jdbc.update("UPDATE challenge SET ends_at = ? WHERE id = ?", ended, id);
        jdbc.update("UPDATE practice_attempt SET results_hidden_until = ? WHERE id = ?", ended, attempt);
        mockMvc.perform(get("/api/v1/challenges/held/leaderboard")).andExpect(jsonPath("$.rows[0].points").value(105));
        mockMvc.perform(get("/api/v1/participants/me/attempts/" + attempt).header(TOKEN, asha)).andExpect(status().isOk());
    }

    @Test
    void moderatorsReviewFlaggedAttemptsWithAnAuditTrail() throws Exception {
        Instant now = Instant.now();
        create(request("mod", now.minus(1, HOURS), now.plus(1, HOURS), "IMMEDIATE", 1));
        String fast = join("Fast One");
        String other = join("Slow One");
        submit("mod", start("mod", fast), fast, answers(5)).andExpect(jsonPath("$.points.earned").value(0))
                .andExpect(jsonPath("$.points.reviewFlag").value("TOO_FAST"));
        long o = start("mod", other);
        submit("mod", o, other, answers(5)); // also instant: flagged
        mockMvc.perform(get("/api/v1/challenges/mod/leaderboard")).andExpect(jsonPath("$.participants").value(0));

        JsonNode queue = body(mockMvc.perform(get("/api/v1/admin/moderation/attempts").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.content[0].challengeSlug").value("mod")).andReturn());
        assertThat(queue.toString()).doesNotContain("email").doesNotContain("accountId");
        long first = queue.at("/content/0/attemptId").asLong();
        long second = queue.at("/content/1/attemptId").asLong();
        mockMvc.perform(patch("/api/v1/admin/moderation/attempts/" + first).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("decision", "CLEAR", "note", "Checked: a short, easy set")))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/challenges/mod/leaderboard")).andExpect(jsonPath("$.participants").value(1))
                .andExpect(jsonPath("$.rows[0].points").value(105));
        assertThat(jdbc.queryForObject("SELECT sum(points) FROM points_ledger", Integer.class)).isEqualTo(105);

        mockMvc.perform(patch("/api/v1/admin/moderation/attempts/" + first).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("decision", "VOID", "note", "Second look: shared answers")))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/challenges/mod/leaderboard")).andExpect(jsonPath("$.participants").value(0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM points_ledger", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participant_achievement", Integer.class)).isZero();
        mockMvc.perform(patch("/api/v1/admin/moderation/attempts/" + first).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("decision", "CLEAR", "note", "x")))).andExpect(status().isBadRequest());
        assertThat(second).isPositive();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admin_audit_log WHERE action IN ('ATTEMPT_CLEARED', 'ATTEMPT_VOIDED')", Integer.class)).isEqualTo(2);

        // A hidden student stays ranked without a name, and the moderation list shows no contact details.
        String publicId = jdbc.queryForObject("SELECT public_id FROM participant WHERE nickname = 'Slow One'", String.class);
        mockMvc.perform(patch("/api/v1/admin/moderation/participants/" + publicId).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("hidden", true, "note", "Offensive nickname")))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/moderation/participants").param("q", "slow").header("Authorization", editorToken()))
                .andExpect(jsonPath("$[0].hidden").value(true)).andExpect(jsonPath("$[0].listed").value(false))
                .andExpect(jsonPath("$[0].email").doesNotExist());
        mockMvc.perform(get("/api/v1/admin/moderation/overview").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.participants").value(2)).andExpect(jsonPath("$.awaitingReview").value(1));
    }

    @Test
    void editorsCannotChangeAChallengeOnceStudentsHaveStartedOrUseUnknownQuestions() throws Exception {
        Instant now = Instant.now();
        Map<String, Object> bad = request("bad", now, now.plus(1, HOURS), "IMMEDIATE", 1);
        bad.put("questionIds", List.of("jnvst-nope/q1"));
        mockMvc.perform(post("/api/v1/admin/challenges").header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(bad))).andExpect(status().isBadRequest());
        Map<String, Object> r = request("fixed", now.minus(1, HOURS), now.plus(1, HOURS), "IMMEDIATE", 1);
        long id = create(r);
        Map<String, Object> changed = new HashMap<>(r);
        changed.put("title", "A clearer title");
        mockMvc.perform(put("/api/v1/admin/challenges/" + id).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(changed))).andExpect(status().isOk());
        start("fixed", join("Asha Star"));
        changed.put("pointsPerCorrect", 50);
        mockMvc.perform(put("/api/v1/admin/challenges/" + id).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(changed))).andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/admin/challenges/" + id).header("Authorization", editorToken())).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/admin/challenges")).andExpect(status().isUnauthorized());
        // Browsers cannot claim a practice attempt is a challenge one.
        Map<String, Object> forged = new HashMap<>(Map.of("clientId", java.util.UUID.randomUUID().toString(), "title", "x", "mode", "CHALLENGE",
                "questionIds", ids(1), "answers", Map.of(), "durationSeconds", 60));
        mockMvc.perform(post("/api/v1/participants/me/attempts").header(TOKEN, join("Forger One")).contentType(MediaType.APPLICATION_JSON)
                .content(json(forged))).andExpect(status().isBadRequest());
    }
}
