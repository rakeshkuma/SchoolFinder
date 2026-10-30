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
        s.put("reviewedOn", "2026-10-01");
        s.put("content", Map.of("passages", List.of(), "questions", questions));
        return s;
    }

    private static Map<String, Object> q(String id, String section, int answer) {
        return Map.of("id", id, "section", section, "prompt", "Question " + id, "options", List.of("A", "B", "C", "D"),
                "answer", answer, "explanation", "Because.");
    }

    private static Map<String, Object> q(String id, String section, String topic, String difficulty, int answer) {
        Map<String, Object> m = new java.util.HashMap<>(q(id, section, answer));
        m.put("topic", topic);
        m.put("difficulty", difficulty);
        return m;
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
        // A set is only published once its questions have been reviewed.
        Map<String, Object> unreviewed = set("unreviewed", "QUIZ", null, List.of(q("a", "X", 0)));
        unreviewed.remove("reviewedOn");
        importJson(Map.of("sets", List.of(unreviewed))).andExpect(status().isBadRequest());
        unreviewed.put("published", false);
        importJson(Map.of("sets", List.of(unreviewed))).andExpect(status().isOk());
        Map<String, Object> badLevel = new java.util.HashMap<>(q("b", "X", 0));
        badLevel.put("difficulty", "IMPOSSIBLE");
        importJson(Map.of("sets", List.of(set("bad-level", "QUIZ", null, List.of(badLevel))))).andExpect(status().isBadRequest());
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
    void bankSessionsCombineFiltersAndAreScoredByTopicWithoutLeakingAnswers() throws Exception {
        importJson(Map.of("sets", List.of(
                set("maths", "QUIZ", null, List.of(q("a", "Arithmetic", "Fractions", "EASY", 1),
                        q("b", "Arithmetic", "Fractions", "HARD", 2), q("c", "Arithmetic", "Time", "EASY", 0))),
                set("lang", "QUIZ", null, List.of(q("d", "Language", "Vocabulary", "EASY", 3))))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/practice-bank")).andExpect(status().isOk())
                .andExpect(jsonPath("$.questionCount").value(4))
                .andExpect(jsonPath("$.questions[0].id").value("maths/a"))
                .andExpect(jsonPath("$.questions[0].difficulty").value("EASY"));

        // Filters work together: Arithmetic + EASY → a and c only.
        String body = mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "TOPIC").param("section", "Arithmetic")
                        .param("difficulty", "EASY").param("count", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions.length()").value(2))
                .andExpect(jsonPath("$.suggestedMinutes").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("\"answer\"").doesNotContain("explanation").contains("maths/a").contains("maths/c");

        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "QUICK")).andExpect(jsonPath("$.questions.length()").value(4));
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "MINI_MOCK"))
                .andExpect(jsonPath("$.suggestedMinutes").value(5)); // 4 questions × 1.2 minutes, rounded up
        // The daily challenge is the same draw for everyone on the same day.
        String daily1 = mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "DAILY")).andReturn().getResponse().getContentAsString();
        String daily2 = mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "DAILY")).andReturn().getResponse().getContentAsString();
        assertThat(daily1).isEqualTo(daily2);
        // Given ids replay exactly those questions in that order; unknown ones are skipped.
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "RETRY").param("ids", "lang/d,maths/b,nope/x"))
                .andExpect(jsonPath("$.questions.length()").value(2))
                .andExpect(jsonPath("$.questions[0].id").value("lang/d"));

        mockMvc.perform(post("/api/v1/practice-sessions/score").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("questionIds", List.of("maths/a", "maths/b", "maths/c"),
                                "answers", Map.of("maths/a", 1, "maths/b", 0)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(1))
                .andExpect(jsonPath("$.attempted").value(2))
                .andExpect(jsonPath("$.topics[0].topic").value("Fractions"))
                .andExpect(jsonPath("$.topics[0].total").value(2))
                .andExpect(jsonPath("$.topics[0].correct").value(1))
                .andExpect(jsonPath("$.topics[1].topic").value("Time"))
                .andExpect(jsonPath("$.topics[1].attempted").value(0));
        // An answer to a question outside the session, a duplicate question or an unknown one is rejected.
        mockMvc.perform(post("/api/v1/practice-sessions/score").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("questionIds", List.of("maths/a"), "answers", Map.of("lang/d", 0))))).andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/practice-sessions/score").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("questionIds", List.of("maths/a", "maths/a"), "answers", Map.of())))).andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/practice-sessions/score").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("questionIds", List.of("nope/x"), "answers", Map.of())))).andExpect(status().isBadRequest());
    }

    @Test
    void theShippedPracticeSetsAreWellFormed() throws Exception {
        JsonNode catalogue = objectMapper.readTree(new ClassPathResource("seed/practice.json").getInputStream());
        importJson(catalogue).andExpect(status().isOk());
        JsonNode exams = objectMapper.readTree(new ClassPathResource("seed/exams.json").getInputStream());
        Set<String> examSlugs = new HashSet<>(exams.get("exams").findValuesAsText("slug"));
        int total = 0;
        for (JsonNode set : catalogue.get("sets")) {
            String slug = set.get("slug").asText();
            String category = set.path("category").asText("ENTRANCE");
            // Entrance-test practice always belongs to an exam guide; school, Olympiad and competitive sets may not.
            if ("ENTRANCE".equals(category) || set.hasNonNull("examSlug")) {
                assertThat(examSlugs).as("exam of %s", slug).contains(set.get("examSlug").asText());
            }
            assertThat(set.get("reviewedOn").asText()).as("review date of %s", slug).isNotBlank();
            for (JsonNode question : set.get("content").get("questions")) {
                total++;
                assertThat(question.get("options").size()).as(question.get("id").asText()).isEqualTo(4);
                assertThat(question.get("explanation").asText()).isNotBlank();
                assertThat(question.get("topic").asText()).as("topic of %s", question.get("id").asText()).isNotBlank();
                assertThat(question.get("difficulty").asText()).as("difficulty of %s", question.get("id").asText()).isIn("EASY", "MEDIUM", "HARD");
                if (question.has("hi")) {
                    assertThat(question.get("hi").get("options").size()).as("Hindi options of %s/%s", slug, question.get("id").asText()).isEqualTo(4);
                    assertThat(question.get("hi").get("explanation").asText()).isNotBlank();
                }
            }
            // Answering every question with its own key scores full marks.
            Map<String, Integer> key = new java.util.HashMap<>();
            set.get("content").get("questions").forEach(qn -> key.put(qn.get("id").asText(), qn.get("answer").asInt()));
            mockMvc.perform(post("/api/v1/practice-sets/" + set.get("slug").asText() + "/score")
                            .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("answers", key))))
                    .andExpect(jsonPath("$.correct").value(key.size()));
        }
        assertThat(total).as("questions in the bank").isGreaterThanOrEqualTo(300);
        mockMvc.perform(get("/api/v1/practice-bank")).andExpect(jsonPath("$.questionCount").value(total));
        // Every category is represented, and some sets can be practised in Hindi.
        for (String category : List.of("SCHOOL", "ENTRANCE", "OLYMPIAD", "COMPETITIVE")) {
            mockMvc.perform(get("/api/v1/practice-sets").param("category", category))
                    .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThan(0)));
        }
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "QUICK").param("hindi", "true"))
                .andExpect(jsonPath("$.questions[0].hi.prompt").isNotEmpty());
    }

    @Test
    void setsCarryCategoryMarkingChaptersAndHindi() throws Exception {
        Map<String, Object> a = new java.util.HashMap<>(q("a", "Mathematics", 1));
        a.put("chapter", "Polynomials");
        a.put("hi", Map.of("prompt", "प्रश्न a", "options", List.of("क", "ख", "ग", "घ"), "explanation", "क्योंकि।"));
        Map<String, Object> marked = set("marked", "QUIZ", null, List.of(a, q("b", "Mathematics", 2), q("c", "Reasoning", 0)));
        marked.put("examSlug", null);
        marked.put("category", "COMPETITIVE");
        marked.put("marksPerQuestion", 2);
        marked.put("negativeMarks", 0.5);
        importJson(Map.of("sets", List.of(marked, set("plain", "QUIZ", null, List.of(q("d", "Arithmetic", 0)))))).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/practice-sets").param("category", "COMPETITIVE"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].marksPerQuestion").value(2))
                .andExpect(jsonPath("$[0].negativeMarks").value(0.5))
                .andExpect(jsonPath("$[0].hindi").value(false)) // only one of its questions has Hindi
                .andExpect(jsonPath("$[0].chapters[0]").value("Polynomials"));
        // A set imported without a category stays entrance practice with one mark per question.
        mockMvc.perform(get("/api/v1/practice-sets").param("category", "ENTRANCE"))
                .andExpect(jsonPath("$[0].slug").value("plain"))
                .andExpect(jsonPath("$[0].marksPerQuestion").value(1))
                .andExpect(jsonPath("$[0].negativeMarks").value(0));

        // The Hindi prompt and options are served; neither language's answer or explanation is.
        String body = mockMvc.perform(get("/api/v1/practice-sets/marked"))
                .andExpect(jsonPath("$.questions[0].hi.prompt").value("प्रश्न a"))
                .andExpect(jsonPath("$.questions[0].chapter").value("Polynomials"))
                .andExpect(jsonPath("$.questions[1].hi").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("explanation").doesNotContain("क्योंकि");

        // +2 right, −0.5 wrong, 0 skipped: a right (2) + b wrong (−0.5) + c skipped = 1.5 of 6.
        mockMvc.perform(post("/api/v1/practice-sets/marked/score").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("answers", Map.of("a", 1, "b", 0)))))
                .andExpect(jsonPath("$.correct").value(1))
                .andExpect(jsonPath("$.marks").value(1.5))
                .andExpect(jsonPath("$.maxMarks").value(6))
                .andExpect(jsonPath("$.sections[0].marks").value(1.5))
                .andExpect(jsonPath("$.sections[1].marks").value(0))
                .andExpect(jsonPath("$.questions[1].marksAwarded").value(-0.5))
                .andExpect(jsonPath("$.questions[0].explanationHi").value("क्योंकि।"));

        // Bank filters: category, chapter and Hindi availability.
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "TOPIC").param("hindi", "true"))
                .andExpect(jsonPath("$.questions.length()").value(1))
                .andExpect(jsonPath("$.questions[0].id").value("marked/a"));
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "TOPIC").param("chapter", "Polynomials"))
                .andExpect(jsonPath("$.questions.length()").value(1));
        mockMvc.perform(get("/api/v1/practice-sessions").param("mode", "TOPIC").param("category", "ENTRANCE"))
                .andExpect(jsonPath("$.questions[0].id").value("plain/d"));
        mockMvc.perform(get("/api/v1/practice-bank"))
                .andExpect(jsonPath("$.questions[0].category").value("COMPETITIVE"))
                .andExpect(jsonPath("$.questions[0].hindi").value(true))
                .andExpect(jsonPath("$.questions[1].hindi").value(false));
    }

    @Test
    void importRejectsInconsistentMarkingAndTranslations() throws Exception {
        Map<String, Object> harsh = set("harsh", "QUIZ", null, List.of(q("a", "X", 0)));
        harsh.put("negativeMarks", 2); // more than the 1 mark a right answer earns
        importJson(Map.of("sets", List.of(harsh))).andExpect(status().isBadRequest());

        Map<String, Object> short_ = new java.util.HashMap<>(q("b", "X", 0));
        short_.put("hi", Map.of("prompt", "प्रश्न", "options", List.of("क", "ख", "ग"), "explanation", "क्योंकि।"));
        importJson(Map.of("sets", List.of(set("short", "QUIZ", null, List.of(short_))))).andExpect(status().isBadRequest());

        Map<String, Object> repeated = new java.util.HashMap<>(q("c", "X", 0));
        repeated.put("hi", Map.of("prompt", "प्रश्न", "options", List.of("क", "क", "ग", "घ"), "explanation", "क्योंकि।"));
        importJson(Map.of("sets", List.of(set("repeated", "QUIZ", null, List.of(repeated))))).andExpect(status().isBadRequest());

        // A Hindi question on an English-only passage would mix languages mid-question.
        Map<String, Object> onPassage = new java.util.HashMap<>(q("d", "Language", 0));
        onPassage.put("passageId", "p1");
        onPassage.put("hi", Map.of("prompt", "प्रश्न", "options", List.of("क", "ख", "ग", "घ"), "explanation", "क्योंकि।"));
        Map<String, Object> withPassage = set("passage", "QUIZ", null, List.of(onPassage));
        withPassage.put("content", Map.of("passages", List.of(Map.of("id", "p1", "title", "A passage", "text", "Text.")),
                "questions", List.of(onPassage)));
        importJson(Map.of("sets", List.of(withPassage))).andExpect(status().isBadRequest());

        Map<String, Object> badCategory = set("cat", "QUIZ", null, List.of(q("e", "X", 0)));
        badCategory.put("category", "UNIVERSITY");
        importJson(Map.of("sets", List.of(badCategory))).andExpect(status().isBadRequest());
    }
}
