package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.service.PracticeService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Leaderboard participation: guests and members, points decided on the server and never awarded twice. */
class ParticipantPointsIT extends AbstractIntegrationTest {

    private static final String TOKEN_HEADER = "X-Participant-Token";

    @Autowired
    private MailService mail;
    @Autowired
    private PracticeService practice;

    @BeforeEach
    void clean() throws Exception {
        jdbc.execute("TRUNCATE participant RESTART IDENTITY CASCADE");
        jdbc.execute("TRUNCATE user_account RESTART IDENTITY CASCADE");
        jdbc.execute("DELETE FROM SPRING_SESSION");
        jdbc.execute("TRUNCATE practice_set RESTART IDENTITY");
        ((DevOutboxMailService) mail).clear();
        jdbc.execute("TRUNCATE exam RESTART IDENTITY CASCADE");
        for (String[] seed : new String[][]{{"seed/practice.json", "practice-sets"}, {"seed/exams.json", "exams"}}) {
            JsonNode catalogue = objectMapper.readTree(new ClassPathResource(seed[0]).getInputStream());
            mockMvc.perform(post("/api/v1/admin/" + seed[1] + "/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json(catalogue))).andExpect(status().isOk());
        }
    }

    private Map<String, Object> profile(String nickname, String age, boolean publicListing) {
        Map<String, Object> p = new HashMap<>();
        p.put("nickname", nickname);
        p.put("stateCode", "BR");
        p.put("city", "Buxar");
        p.put("showCity", false);
        p.put("track", "JNVST");
        p.put("age", age);
        p.put("publicListing", publicListing);
        return p;
    }

    private String join(String nickname, String age, boolean publicListing) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/participants").contentType(MediaType.APPLICATION_JSON)
                .content(json(profile(nickname, age, publicListing)))).andExpect(status().isCreated()).andReturn();
        return body(r).get("token").asText();
    }

    /** Answers the first {@code right} questions correctly and the rest wrongly. */
    private Map<String, Integer> answers(List<String> ids, int right) {
        Map<String, Integer> a = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) {
            int answer = practice.bankIndex().get(ids.get(i)).question().answer();
            a.put(ids.get(i), i < right ? answer : (answer + 1) % 2);
        }
        return a;
    }

    private Map<String, Object> attempt(UUID clientId, String mode, List<String> ids, Map<String, Integer> answers, int seconds) {
        Map<String, Object> a = new HashMap<>();
        a.put("clientId", clientId.toString());
        a.put("title", "Practice");
        a.put("mode", mode);
        a.put("questionIds", ids);
        a.put("answers", answers);
        a.put("durationSeconds", seconds);
        return a;
    }

    private ResultActions guestSubmit(String token, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/participants/me/attempts").header(TOKEN_HEADER, token)
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private List<String> ids(int n) {
        return practice.bankIndex().keySet().stream().filter(id -> id.startsWith("jnvst-")).sorted().limit(n).toList();
    }

    /** More students than database connections, all at once: a classroom submitting together must not time out. */
    @Test
    void moreStudentsThanConnectionsCanSubmitAtOnce() throws Exception {
        List<String> five = ids(5);
        Map<String, Integer> right = answers(five, 5);
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 30; i++) tokens.add(join("Rush Student " + i, "ADULT", true));
        ExecutorService pool = Executors.newFixedThreadPool(30);
        List<Future<Integer>> runs = new ArrayList<>();
        for (String token : tokens) {
            runs.add(pool.submit(() -> guestSubmit(token, attempt(UUID.randomUUID(), "QUICK", five, right, 60)).andReturn().getResponse().getStatus()));
        }
        for (Future<Integer> run : runs) assertThat(run.get()).isEqualTo(201);
        pool.shutdown();
        assertThat(jdbc.queryForObject("SELECT sum(points) FROM points_ledger", Integer.class)).isEqualTo(30 * 50);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participant_achievement WHERE code = 'FIRST_TEST'", Integer.class)).isEqualTo(30);
    }

    @Test
    void progressAndBadgesComeFromRealAttemptsAndStayPrivate() throws Exception {
        String asha = join("Asha Star", "ADULT", true);
        List<String> three = ids(3);
        String set = three.get(0).split("/")[0];
        Map<String, Object> first = attempt(UUID.randomUUID(), "SET", three, answers(three, 2), 60);
        first.put("setSlug", set);
        first.put("examSlug", "jnvst");
        String firstId = body(guestSubmit(asha, first).andExpect(status().isCreated())
                .andExpect(jsonPath("$.points.rank").value(1))
                .andExpect(jsonPath("$.points.participants").value(1))
                .andExpect(jsonPath("$.points.previousBest").doesNotExist())
                .andExpect(jsonPath("$.points.achievements[0].code").value("FIRST_TEST")).andReturn()).at("/attempt/id").asText();
        // The same submission again awards nothing new; a second test on the set compares with the first.
        guestSubmit(asha, first).andExpect(status().isOk()).andExpect(jsonPath("$.points.achievements.length()").value(0));
        Map<String, Object> second = attempt(UUID.randomUUID(), "SET", three, answers(three, 3), 60);
        second.put("setSlug", set);
        guestSubmit(asha, second).andExpect(jsonPath("$.points.previousBest").value(67))
                .andExpect(jsonPath("$.points.achievements.length()").value(0));

        mockMvc.perform(get("/api/v1/participants/me/progress").header(TOKEN_HEADER, asha))
                .andExpect(jsonPath("$.points").value(30))
                .andExpect(jsonPath("$.rank").value(1))
                .andExpect(jsonPath("$.currentStreak").value(1))
                .andExpect(jsonPath("$.longestStreak").value(1))
                .andExpect(jsonPath("$.activeDays.length()").value(1))
                .andExpect(jsonPath("$.weeks.length()").value(8))
                .andExpect(jsonPath("$.weeks[7].tests").value(2))
                .andExpect(jsonPath("$.months.length()").value(6))
                .andExpect(jsonPath("$.exams[0].examSlug").value("jnvst"))
                .andExpect(jsonPath("$.exams[0].bestScore").value(67))
                .andExpect(jsonPath("$.achievements[?(@.code == 'FIRST_TEST')].earnedAt").isNotEmpty())
                .andExpect(jsonPath("$.achievements[?(@.code == 'TESTS_10')].current").value(2))
                .andExpect(jsonPath("$.achievements[?(@.code == 'TESTS_10')].target").value(10));
        mockMvc.perform(get("/api/v1/participants/me/history").header(TOKEN_HEADER, asha)).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/v1/participants/me/attempts/" + firstId).header(TOKEN_HEADER, asha)).andExpect(status().isOk());

        // Implausibly fast answers earn no badge and no streak; rank badges wait for a real field of students.
        String quick = join("Quick One", "ADULT", true);
        List<String> five = ids(5);
        guestSubmit(quick, attempt(UUID.randomUUID(), "QUICK", five, answers(five, 5), 1))
                .andExpect(jsonPath("$.points.achievements.length()").value(0));
        mockMvc.perform(get("/api/v1/participants/me/progress").header(TOKEN_HEADER, quick))
                .andExpect(jsonPath("$.currentStreak").value(0))
                .andExpect(jsonPath("$.achievements[?(@.earnedAt != null)]").isEmpty());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participant_achievement WHERE code LIKE 'TOP%'", Integer.class)).isZero();

        // One student's results are not another's, and nobody reads them without a key.
        mockMvc.perform(get("/api/v1/participants/me/attempts/" + firstId).header(TOKEN_HEADER, quick)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/participants/me/progress")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/leaderboard/achievements")).andExpect(jsonPath("$[0].earnedAt").doesNotExist());

        // Challenge attempts and badges move into the account with the results, keeping the challenge's own points.
        Instant now = Instant.now();
        Map<String, Object> challenge = new HashMap<>(Map.of("slug", "claimed", "title", "Claimed", "description", "A challenge.", "kind", "SPECIAL",
                "difficulty", "MIXED", "questionIds", three, "durationMinutes", 10, "startsAt", now.minusSeconds(60).toString(),
                "endsAt", now.plusSeconds(3600).toString()));
        challenge.putAll(Map.of("pointsPerCorrect", 25, "completionBonus", 0, "maxAttempts", 1, "resultRelease", "IMMEDIATE", "leaderboardEnabled", true));
        mockMvc.perform(post("/api/v1/admin/challenges").header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(challenge))).andExpect(status().isCreated());
        jdbc.update("UPDATE challenge SET published = TRUE WHERE slug = 'claimed'");
        long attempt = body(mockMvc.perform(post("/api/v1/challenges/claimed/attempts").header(TOKEN_HEADER, asha)).andReturn()).get("attemptId").asLong();
        jdbc.update("UPDATE challenge_attempt SET started_at = ? WHERE id = ?", java.sql.Timestamp.from(now.minusSeconds(120)), attempt);
        mockMvc.perform(post("/api/v1/challenges/claimed/attempts/" + attempt + "/submit").header(TOKEN_HEADER, asha).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("answers", answers(three, 2))))).andExpect(jsonPath("$.points.earned").value(50));

        Cookie member = member("asha@example.org");
        mockMvc.perform(post("/api/v1/account/participant/claim").with(csrf()).cookie(member).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("token", asha)))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/account/progress").cookie(member))
                .andExpect(jsonPath("$.points").value(80))
                .andExpect(jsonPath("$.achievements[?(@.code == 'FIRST_TEST')].earnedAt").isNotEmpty());
        mockMvc.perform(get("/api/v1/challenges/claimed").cookie(member)).andExpect(jsonPath("$.mine.attemptsLeft").value(0))
                .andExpect(jsonPath("$.mine.best.score").value(50));
    }

    @Test
    void nicknamesKeepContactDetailsAndStaffNamesOut() throws Exception {
        for (String bad : List.of("ab", "call 98765 43210", "me@example.org", "Site Admin", "www.example.com")) {
            mockMvc.perform(post("/api/v1/participants").contentType(MediaType.APPLICATION_JSON)
                    .content(json(profile(bad, "ADULT", true)))).andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/v1/participants").contentType(MediaType.APPLICATION_JSON)
                        .content(json(profile("  तारा   Star ", "ADULT", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.profile.nickname").value("तारा Star"))
                .andExpect(jsonPath("$.profile.listed").value(true));
        // Only the hash of the token is stored.
        assertThat(jdbc.queryForObject("SELECT length(guest_token_hash) FROM participant", Integer.class)).isEqualTo(64);
    }

    @Test
    void underEighteensAreListedOnlyWithAGuardiansConsent() throws Exception {
        String minor = join("Little Star", "MINOR", true);
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, minor))
                .andExpect(jsonPath("$.publicListing").value(false)).andExpect(jsonPath("$.listed").value(false));
        String withGuardian = join("Bright Star", "MINOR_WITH_GUARDIAN", true);
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, withGuardian))
                .andExpect(jsonPath("$.listed").value(true)).andExpect(jsonPath("$.ageBand").value("MINOR"));
        String privateAdult = join("Quiet One", "ADULT", false);
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, privateAdult)).andExpect(jsonPath("$.listed").value(false));
    }

    @Test
    void anyAgeCanHaveAnAccountAndAMemberIsPrivateUntilTheyAnswerTheAgeQuestion() throws Exception {
        Cookie asha = member("asha@example.org");
        mockMvc.perform(get("/api/v1/account/participant").cookie(asha))
                .andExpect(jsonPath("$.ageBand").value("UNKNOWN")).andExpect(jsonPath("$.listed").value(false));
        // Under 18 without a guardian's agreement: asking to be listed changes nothing.
        mockMvc.perform(put("/api/v1/account/participant").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(profile("Asha V", "MINOR", true))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ageBand").value("MINOR")).andExpect(jsonPath("$.listed").value(false));
        mockMvc.perform(put("/api/v1/account/participant").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(profile("Asha V", "MINOR_WITH_GUARDIAN", true))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ageBand").value("MINOR")).andExpect(jsonPath("$.listed").value(true));
        mockMvc.perform(put("/api/v1/account/participant").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(profile("Asha V", "ADULT", true))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ageBand").value("ADULT")).andExpect(jsonPath("$.listed").value(true));
    }

    @Test
    void pointsAreEarnedOncePerQuestionAndNeverForImplausiblyFastAnswers() throws Exception {
        String token = join("Star Learner", "ADULT", true);
        List<String> three = ids(3);
        UUID first = UUID.randomUUID();
        guestSubmit(token, attempt(first, "QUICK", three, answers(three, 2), 60)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.score.correct").value(2))
                .andExpect(jsonPath("$.points.earned").value(20));
        // The same submission again (a retry after a network error) returns the first result, not new points.
        guestSubmit(token, attempt(first, "QUICK", three, answers(three, 2), 60)).andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicate").value(true)).andExpect(jsonPath("$.points.earned").value(20));
        // Answering the same questions again earns only the one not yet answered correctly.
        guestSubmit(token, attempt(UUID.randomUUID(), "QUICK", three, answers(three, 3), 60))
                .andExpect(jsonPath("$.points.earned").value(10));
        // Six correct answers in three seconds earn nothing and are flagged for review.
        List<String> six = ids(9).subList(3, 9);
        guestSubmit(token, attempt(UUID.randomUUID(), "QUICK", six, answers(six, 6), 3))
                .andExpect(jsonPath("$.score.correct").value(6))
                .andExpect(jsonPath("$.points.earned").value(0))
                .andExpect(jsonPath("$.points.reviewFlag").value("TOO_FAST"));
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, token))
                .andExpect(jsonPath("$.points").value(30)).andExpect(jsonPath("$.attempts").value(3));
        // Without the token, nothing can be recorded; deleting removes the guest and everything with it.
        guestSubmit("not-a-token", attempt(UUID.randomUUID(), "QUICK", three, answers(three, 3), 60)).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/v1/participants/me").header(TOKEN_HEADER, token)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM points_ledger", Integer.class)).isZero();
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, token)).andExpect(status().isUnauthorized());
    }

    @Test
    void theDailyQuizCountsOncePerDayAndOnlyForTodaysQuestions() throws Exception {
        String token = join("Daily Doer", "ADULT", true);
        JsonNode session = body(mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "DAILY")).andReturn());
        List<String> today = new ArrayList<>();
        session.get("questions").forEach(q -> today.add(q.get("id").asText()));
        int n = today.size();
        guestSubmit(token, attempt(UUID.randomUUID(), "DAILY", today, answers(today, n), 120))
                .andExpect(jsonPath("$.points.dailyQuiz").value(true))
                .andExpect(jsonPath("$.points.earned").value(n * 10));
        guestSubmit(token, attempt(UUID.randomUUID(), "DAILY", today, answers(today, n), 120))
                .andExpect(jsonPath("$.points.dailyQuiz").value(false))
                .andExpect(jsonPath("$.points.earned").value(0))
                .andExpect(jsonPath("$.points.reviewFlag").value("DAILY_REPEAT"));
        // Calling other questions "DAILY" does not make them today's quiz.
        List<String> other = practice.bankIndex().keySet().stream().filter(id -> !today.contains(id)).sorted().limit(2).toList();
        guestSubmit(token, attempt(UUID.randomUUID(), "DAILY", other, answers(other, 2), 60))
                .andExpect(jsonPath("$.points.dailyQuiz").value(false))
                .andExpect(jsonPath("$.points.earned").value(20));
    }

    @Test
    void aMemberClaimsGuestResultsWithoutCountingAQuestionTwice() throws Exception {
        String token = join("Guest Me", "ADULT", false);
        List<String> two = ids(2);
        guestSubmit(token, attempt(UUID.randomUUID(), "QUICK", two, answers(two, 2), 40)).andExpect(jsonPath("$.points.earned").value(20));

        Cookie asha = member("asha@example.org");
        List<String> second = ids(3).subList(1, 3);
        mockMvc.perform(post("/api/v1/account/practice-attempts").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(attempt(UUID.randomUUID(), "QUICK", second, answers(second, 2), 40))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.points.earned").value(20));
        mockMvc.perform(get("/api/v1/account/participant").cookie(asha))
                .andExpect(jsonPath("$.points").value(20))
                .andExpect(jsonPath("$.listed").value(false))
                .andExpect(jsonPath("$.nickname").value(org.hamcrest.Matchers.startsWith("Learner ")));

        // Claiming moves the guest's attempt in; the question both answered correctly still counts once (3 questions).
        mockMvc.perform(post("/api/v1/account/participant/claim").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", token))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.points").value(30)).andExpect(jsonPath("$.attempts").value(2));
        mockMvc.perform(get("/api/v1/participants/me").header(TOKEN_HEADER, token)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/account/practice-attempts").cookie(asha)).andExpect(jsonPath("$.totalElements").value(2));
    }

    private Cookie member(String email) throws Exception {
        return memberSession(email);
    }
}
