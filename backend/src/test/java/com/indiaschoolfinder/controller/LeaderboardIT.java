package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.service.PracticeService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Rankings from real attempts: order, ties, privacy, filters and "my rank". */
class LeaderboardIT extends AbstractIntegrationTest {

    @Autowired
    private PracticeService practice;

    @BeforeEach
    void clean() throws Exception {
        jdbc.execute("TRUNCATE participant RESTART IDENTITY CASCADE");
        jdbc.execute("TRUNCATE practice_set RESTART IDENTITY");
        jdbc.execute("TRUNCATE exam RESTART IDENTITY CASCADE");
        for (String[] seed : new String[][]{{"seed/practice.json", "practice-sets"}, {"seed/exams.json", "exams"}}) {
            JsonNode catalogue = objectMapper.readTree(new ClassPathResource(seed[0]).getInputStream());
            mockMvc.perform(post("/api/v1/admin/" + seed[1] + "/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json(catalogue))).andExpect(status().isOk());
        }
    }

    private String join(String nickname, String state, String age, boolean listed) throws Exception {
        Map<String, Object> p = new HashMap<>(Map.of("nickname", nickname, "stateCode", state, "showCity", false, "age", age,
                "publicListing", listed));
        return body(mockMvc.perform(post("/api/v1/participants").contentType(MediaType.APPLICATION_JSON).content(json(p)))
                .andExpect(status().isCreated()).andReturn()).get("token").asText();
    }

    private List<String> jnvst(int from, int to) {
        return practice.bankIndex().keySet().stream().filter(id -> id.startsWith("jnvst-")).sorted().toList().subList(from, to);
    }

    /** Answers every question, the first {@code right} correctly. */
    private void take(String token, List<String> ids, int right) throws Exception {
        Map<String, Integer> answers = new HashMap<>();
        for (int i = 0; i < ids.size(); i++) {
            int answer = practice.bankIndex().get(ids.get(i)).question().answer();
            answers.put(ids.get(i), i < right ? answer : (answer + 1) % 2);
        }
        Map<String, Object> a = new HashMap<>(Map.of("clientId", UUID.randomUUID().toString(), "title", "Practice", "mode", "QUICK",
                "questionIds", ids, "answers", answers, "durationSeconds", 60));
        mockMvc.perform(post("/api/v1/participants/me/attempts").header("X-Participant-Token", token)
                .contentType(MediaType.APPLICATION_JSON).content(json(a))).andExpect(status().isCreated());
    }

    @Test
    void ranksByPointsThenAccuracyThenWhoGotThereFirstAndHidesPrivateStudents() throws Exception {
        String asha = join("Asha Star", "BR", "ADULT", true);
        String esha = join("Esha Bright", "BR", "ADULT", true);
        String bina = join("Bina Quiet", "BR", "MINOR", true); // under 18 without consent: ranked, never named
        String dev = join("Dev Rising", "BR", "MINOR_WITH_GUARDIAN", true);
        String cyrus = join("Cyrus Delhi", "DL", "ADULT", true);
        take(asha, jnvst(0, 3), 3);  // 30 points, 100%
        take(esha, jnvst(0, 3), 3);  // 30 points, 100%: level with Asha, who got there first
        take(bina, jnvst(0, 4), 3);  // 30 points, 75%
        take(dev, jnvst(0, 2), 2);   // 20 points
        take(cyrus, jnvst(0, 1), 1); // 10 points

        mockMvc.perform(get("/api/v1/leaderboard"))
                .andExpect(jsonPath("$.participants").value(5))
                .andExpect(jsonPath("$.rows[0].nickname").value("Asha Star")).andExpect(jsonPath("$.rows[0].rank").value(1))
                .andExpect(jsonPath("$.rows[1].nickname").value("Esha Bright")).andExpect(jsonPath("$.rows[1].rank").value(2))
                .andExpect(jsonPath("$.rows[2].rank").value(3))
                .andExpect(jsonPath("$.rows[2].listed").value(false))
                .andExpect(jsonPath("$.rows[2].nickname").doesNotExist())
                .andExpect(jsonPath("$.rows[2].stateCode").doesNotExist())
                .andExpect(jsonPath("$.rows[2].accuracy").value(75))
                .andExpect(jsonPath("$.rows[3].nickname").value("Dev Rising"))
                .andExpect(jsonPath("$.rows[3].initials").value("DR"))
                .andExpect(jsonPath("$.rows[4].nickname").value("Cyrus Delhi"))
                .andExpect(jsonPath("$.me").doesNotExist());

        // State filter, and a private student sees their own place with the students around them.
        mockMvc.perform(get("/api/v1/leaderboard").param("state", "BR").header("X-Participant-Token", bina))
                .andExpect(jsonPath("$.participants").value(4))
                .andExpect(jsonPath("$.me.row.rank").value(3))
                .andExpect(jsonPath("$.me.row.me").value(true))
                .andExpect(jsonPath("$.me.row.nickname").value("Bina Quiet"))
                .andExpect(jsonPath("$.me.above.nickname").value("Esha Bright"))
                .andExpect(jsonPath("$.me.below.nickname").value("Dev Rising"));

        // Search finds listed students only; paging keeps the full ranking's positions.
        mockMvc.perform(get("/api/v1/leaderboard").param("q", "quiet")).andExpect(jsonPath("$.matches").value(0));
        mockMvc.perform(get("/api/v1/leaderboard").param("q", "DEV")).andExpect(jsonPath("$.matches").value(1))
                .andExpect(jsonPath("$.rows[0].rank").value(4));
        mockMvc.perform(get("/api/v1/leaderboard").param("size", "2").param("page", "2"))
                .andExpect(jsonPath("$.rows.length()").value(1)).andExpect(jsonPath("$.rows[0].rank").value(5));

        // Exam, category and subject views; an exam nobody practised is an empty ranking, not an error.
        String section = practice.bankIndex().get(jnvst(0, 1).get(0)).question().section();
        mockMvc.perform(get("/api/v1/leaderboard").param("exam", "jnvst").param("category", "ENTRANCE").param("section", section)
                .param("period", "TODAY")).andExpect(jsonPath("$.participants").value(5));
        mockMvc.perform(get("/api/v1/leaderboard").param("exam", "aissee")).andExpect(jsonPath("$.participants").value(0))
                .andExpect(jsonPath("$.rows.length()").value(0));
        mockMvc.perform(get("/api/v1/leaderboard").param("daily", "true")).andExpect(jsonPath("$.participants").value(0));
        mockMvc.perform(get("/api/v1/leaderboard").param("period", "YEAR")).andExpect(status().isBadRequest());
    }
}
