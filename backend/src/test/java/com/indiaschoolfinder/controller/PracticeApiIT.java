package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PracticeApiIT extends AbstractIntegrationTest {

    @BeforeEach
    void clear() {
        jdbc.execute("TRUNCATE practice_set RESTART IDENTITY");
    }

    private ResultActions importJson(Object body) throws Exception {
        return mockMvc.perform(post("/api/v1/admin/practice-sets/import").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private Map<String, Object> set(String slug, String kind, Integer minutes, List<Map<String, Object>> questions) {
        Map<String, Object> s = new java.util.HashMap<>();
        s.put("slug", slug);
        s.put("examSlug", "jnvst");
        s.put("title", "Fixture set");
        s.put("kind", kind);
        s.put("level", "Class V");
        s.put("description", "Fixture");
        s.put("durationMinutes", minutes);
        s.put("published", true);
        s.put("content", Map.of("passages", List.of(), "questions", questions));
        return s;
    }

    private static Map<String, Object> q(String id, String section, int answer) {
        return Map.of("id", id, "section", section, "prompt", "Question " + id, "options", List.of("A", "B", "C", "D"),
                "answer", answer, "explanation", "Because.");
    }

    @Test
    void setsAreServedWithoutAnswersAndScoredOnTheServer() throws Exception {
        importJson(Map.of("sets", List.of(set("fixture", "QUIZ", null,
                List.of(q("a", "Arithmetic", 1), q("b", "Arithmetic", 2), q("c", "Language", 0))))))
                .andExpect(status().isOk());

        String body = mockMvc.perform(get("/api/v1/practice-sets/fixture")).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("\"answer\"").doesNotContain("explanation");

        mockMvc.perform(post("/api/v1/practice-sets/fixture/score").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("answers", Map.of("a", 1, "b", 0)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.attempted").value(2))
                .andExpect(jsonPath("$.correct").value(1))
                .andExpect(jsonPath("$.sections[0].section").value("Arithmetic"))
                .andExpect(jsonPath("$.sections[0].correct").value(1))
                .andExpect(jsonPath("$.sections[1].attempted").value(0))
                .andExpect(jsonPath("$.questions[1].answer").value(2))
                .andExpect(jsonPath("$.questions[2].chosen").doesNotExist())
                .andExpect(jsonPath("$.questions[0].explanation").value("Because."));

        // Unknown questions or options are rejected rather than silently scored.
        mockMvc.perform(post("/api/v1/practice-sets/fixture/score").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("answers", Map.of("zz", 0))))).andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/practice-sets/fixture/score").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("answers", Map.of("a", 7))))).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/practice-sets").param("exam", "aissee")).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/v1/practice-sets").param("exam", "jnvst")).andExpect(jsonPath("$[0].questionCount").value(3));
    }

    @Test
    void importRejectsBrokenSets() throws Exception {
        importJson(Map.of("sets", List.of(set("mock", "MOCK", null, List.of(q("a", "X", 0)))))).andExpect(status().isBadRequest());
        importJson(Map.of("sets", List.of(set("dup", "QUIZ", null, List.of(q("a", "X", 0), q("a", "X", 1)))))).andExpect(status().isBadRequest());
        importJson(Map.of("sets", List.of(set("range", "QUIZ", null, List.of(q("a", "X", 4)))))).andExpect(status().isBadRequest());
        // Figure options must match the options one to one, and shapes must be one of the known kinds.
        Map<String, Object> shape = Map.of("kind", "circle", "x", 50, "y", 50, "size", 40, "rotate", 0, "filled", false);
        Map<String, Object> figure = Map.of("alt", "A circle", "shapes", List.of(shape));
        Map<String, Object> twoFigures = new java.util.HashMap<>(q("f", "Mental Ability", 0));
        twoFigures.put("optionFigures", List.of(figure, figure));
        importJson(Map.of("sets", List.of(set("figs", "QUIZ", null, List.of(twoFigures))))).andExpect(status().isBadRequest());
        Map<String, Object> badShape = new java.util.HashMap<>(q("g", "Mental Ability", 0));
        badShape.put("figure", List.of(Map.of("alt", "x", "shapes", List.of(Map.of("kind", "script", "x", 1, "y", 1, "size", 1)))));
        importJson(Map.of("sets", List.of(set("shape", "QUIZ", null, List.of(badShape))))).andExpect(status().isBadRequest());
        Map<String, Object> good = new java.util.HashMap<>(q("h", "Mental Ability", 0));
        good.put("optionFigures", List.of(figure, figure, figure, figure));
        good.put("figure", List.of(figure));
        importJson(Map.of("sets", List.of(set("figs-ok", "QUIZ", null, List.of(good))))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/practice-sets/figs-ok"))
                .andExpect(jsonPath("$.questions[0].optionFigures.length()").value(4))
                .andExpect(jsonPath("$.questions[0].figure[0].shapes[0].kind").value("circle"));
        mockMvc.perform(post("/api/v1/admin/practice-sets/import").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("sets", List.of())))).andExpect(status().isUnauthorized());
    }

    @Test
    void theShippedPracticeSetsAreWellFormed() throws Exception {
        JsonNode catalogue = objectMapper.readTree(new ClassPathResource("seed/practice.json").getInputStream());
        importJson(catalogue).andExpect(status().isOk());
        JsonNode exams = objectMapper.readTree(new ClassPathResource("seed/exams.json").getInputStream());
        Set<String> examSlugs = new HashSet<>(exams.get("exams").findValuesAsText("slug"));
        for (JsonNode set : catalogue.get("sets")) {
            assertThat(examSlugs).as("exam of %s", set.get("slug").asText()).contains(set.get("examSlug").asText());
            for (JsonNode question : set.get("content").get("questions")) {
                assertThat(question.get("options").size()).as(question.get("id").asText()).isEqualTo(4);
                assertThat(question.get("explanation").asText()).isNotBlank();
            }
            // Answering every question with its own key scores full marks.
            Map<String, Integer> key = new java.util.HashMap<>();
            set.get("content").get("questions").forEach(qn -> key.put(qn.get("id").asText(), qn.get("answer").asInt()));
            mockMvc.perform(post("/api/v1/practice-sets/" + set.get("slug").asText() + "/score")
                            .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("answers", key))))
                    .andExpect(jsonPath("$.correct").value(key.size()));
        }
    }
}
