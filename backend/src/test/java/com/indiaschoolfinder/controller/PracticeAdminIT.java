package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Practice administration: the set overview, publishing and review dates, CSV import, and question reports. */
class PracticeAdminIT extends AbstractIntegrationTest {

    @BeforeEach
    void clear() {
        jdbc.execute("TRUNCATE practice_set, practice_question_report RESTART IDENTITY");
    }

    private void importSet(String slug, boolean published, String reviewedOn, List<Map<String, Object>> questions,
                           List<Map<String, Object>> passages) throws Exception {
        Map<String, Object> s = new HashMap<>();
        s.put("slug", slug);
        s.put("examSlug", null);
        s.put("category", "SCHOOL");
        s.put("title", "Fixture " + slug);
        s.put("kind", "QUIZ");
        s.put("level", "Class X");
        s.put("description", "Fixture");
        s.put("published", published);
        s.put("reviewedOn", reviewedOn);
        s.put("content", Map.of("passages", passages, "questions", questions));
        mockMvc.perform(post("/api/v1/admin/practice-sets/import").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("sets", List.of(s))))).andExpect(status().isOk());
    }

    private static Map<String, Object> q(String id, int answer) {
        return Map.of("id", id, "section", "Mathematics", "topic", "Algebra", "prompt", "Question " + id,
                "options", List.of("A1", "B1", "C1", "D1"), "answer", answer, "explanation", "Because " + id + ".");
    }

    private ResultActions publish(String slug, Map<String, Object> body) throws Exception {
        return mockMvc.perform(patch("/api/v1/admin/practice-sets/" + slug + "/published").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private ResultActions uploadCsv(String slug, String content) throws Exception {
        return mockMvc.perform(multipart("/api/v1/admin/practice-sets/" + slug + "/questions/csv")
                .file(new MockMultipartFile("file", "questions.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8)))
                .header("Authorization", editorToken()));
    }

    @Test
    void editorsSeeEverySetWithFlagsAndPublishOnlyReviewedSets() throws Exception {
        // Nine questions, all answered by option A: an unreviewed draft with a guessable answer key.
        importSet("draft", false, null, java.util.stream.IntStream.range(0, 9).mapToObj(i -> q("q" + i, 0)).toList(), List.of());
        importSet("live", true, "2026-10-01", List.of(q("a", 1), q("b", 2)), List.of());

        mockMvc.perform(get("/api/v1/admin/practice-sets").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.slug=='draft')].flags[*].code", hasItem("NOT_REVIEWED")))
                .andExpect(jsonPath("$[?(@.slug=='draft')].flags[*].code", hasItem("ANSWER_SKEW")))
                .andExpect(jsonPath("$[?(@.slug=='live')].published", hasItem(true)));
        mockMvc.perform(get("/api/v1/admin/practice-sets")).andExpect(status().isUnauthorized());

        // Publishing needs a review date that is not in the future.
        publish("draft", Map.of("published", true)).andExpect(status().isBadRequest());
        publish("draft", Map.of("published", true, "reviewedOn", LocalDate.now().plusDays(3).toString())).andExpect(status().isBadRequest());
        publish("draft", Map.of("published", true, "reviewedOn", "2026-10-02")).andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(true)).andExpect(jsonPath("$.reviewedOn").value("2026-10-02"));
        mockMvc.perform(get("/api/v1/practice-sets/draft")).andExpect(status().isOk());
        publish("draft", Map.of("published", false)).andExpect(jsonPath("$.published").value(false));
        mockMvc.perform(get("/api/v1/practice-sets/draft")).andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/admin/practice-sets/live/review").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("note", "checked against NCERT"))))
                .andExpect(jsonPath("$.reviewedOn").value(LocalDate.now().toString()));
        mockMvc.perform(get("/api/v1/admin/audit-log").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.content[*].action", hasItem("PRACTICE_REVIEWED")))
                .andExpect(jsonPath("$.content[*].action", hasItem("PRACTICE_PUBLISHED")));

        // The export is the import format, answers included, so it can be edited and imported again.
        mockMvc.perform(get("/api/v1/admin/practice-sets/live/export").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sets[0].slug").value("live"))
                .andExpect(jsonPath("$.sets[0].content.questions[1].answer").value(2));
    }

    @Test
    void csvReplacesQuestionsAndUnpublishesUntilReviewed() throws Exception {
        importSet("maths", true, "2026-10-01", List.of(q("old", 0)), List.of());
        String csv = """
                id,section,chapter,topic,difficulty,prompt,option_a,option_b,option_c,option_d,answer,explanation,hi_prompt,hi_option_a,hi_option_b,hi_option_c,hi_option_d,hi_explanation
                m1,Mathematics,Polynomials,Zeros,EASY,"What is 2 + 3?",4,5,6,7,B,"2 + 3 = 5.","2 + 3 कितना है?",4,5,6,7,"2 + 3 = 5।"
                m2,Mathematics,Real Numbers,HCF,medium,"HCF of 4 and 6?",1,2,3,4,b,"Both are divisible by 2.",,,,,,
                """;
        uploadCsv("maths", csv).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions").value(2))
                .andExpect(jsonPath("$.hindiQuestions").value(1))
                .andExpect(jsonPath("$.published").value(false));
        mockMvc.perform(get("/api/v1/practice-sets/maths")).andExpect(status().isNotFound()); // unpublished until reviewed
        mockMvc.perform(get("/api/v1/admin/practice-sets/maths/export").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.sets[0].reviewedOn").doesNotExist())
                .andExpect(jsonPath("$.sets[0].content.questions[0].answer").value(1))
                .andExpect(jsonPath("$.sets[0].content.questions[0].chapter").value("Polynomials"))
                .andExpect(jsonPath("$.sets[0].content.questions[0].hi.options[1]").value("5"))
                .andExpect(jsonPath("$.sets[0].content.questions[1].difficulty").value("MEDIUM"))
                .andExpect(jsonPath("$.sets[0].content.questions[1].hi").doesNotExist());

        // Errors name the row; nothing is changed.
        uploadCsv("maths", "id,section,topic,difficulty,prompt,option_a,option_b,answer,explanation\nx1,Maths,T,EASY,Q?,a,b,Z,Because.\n")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].message", containsString("row 2")));
        uploadCsv("maths", "id,section,prompt\nx1,Maths,Q?\n").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].message", containsString("missing required columns")));
        uploadCsv("maths", "id,section,topic,difficulty,prompt,option_a,option_b,answer,explanation\nx1,Maths,T,EASY,Q?,same,same,A,Because.\n")
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/admin/practice-sets/maths/export").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.sets[0].content.questions.length()").value(2));

        // Sets with reading passages are edited as JSON.
        Map<String, Object> onPassage = new HashMap<>(q("p", 0));
        onPassage.put("passageId", "p1");
        importSet("reading", true, "2026-10-01", List.of(onPassage), List.of(Map.of("id", "p1", "title", "T", "text", "Text.")));
        uploadCsv("reading", csv).andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/api/v1/admin/practice-sets/maths/questions/csv")
                .file(new MockMultipartFile("file", "questions.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void visitorsReportProblemsAndEditorsResolveThem() throws Exception {
        importSet("live", true, "2026-10-01", List.of(q("a", 1), q("b", 2)), List.of());
        String report = "/api/v1/practice-questions/live/a/reports";
        mockMvc.perform(post(report).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("reason", "WRONG_ANSWER", "message", "<b>I think</b> the answer is C"))))
                .andExpect(status().isAccepted());
        mockMvc.perform(post("/api/v1/practice-questions/live/zz/reports").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("reason", "TYPO")))).andExpect(status().isNotFound());
        mockMvc.perform(post(report).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("reason", "OTHER")))).andExpect(status().isBadRequest()); // OTHER needs a description
        mockMvc.perform(post(report).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("reason", "TYPO", "website", "http://spam.example")))).andExpect(status().isAccepted()); // discarded

        String body = mockMvc.perform(get("/api/v1/admin/practice-reports").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].reason").value("WRONG_ANSWER"))
                .andExpect(jsonPath("$.content[0].signedIn").value(false))
                .andExpect(jsonPath("$.content[0].question.answer").value(1))
                .andExpect(jsonPath("$.content[0].question.explanation").value("Because a."))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("<b>").contains("the answer is C"); // markup is stripped
        mockMvc.perform(get("/api/v1/admin/practice-sets").header("Authorization", editorToken()))
                .andExpect(jsonPath("$[0].openReports").value(1))
                .andExpect(jsonPath("$[0].flags[*].code", hasItem("OPEN_REPORTS")));

        long id = objectMapper.readTree(body).get("content").get(0).get("id").asLong();
        String resolve = "/api/v1/admin/practice-reports/" + id;
        mockMvc.perform(patch(resolve).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("status", "OPEN")))).andExpect(status().isBadRequest());
        mockMvc.perform(patch(resolve).header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "DISMISSED", "note", "B is correct: see the explanation"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISMISSED"))
                .andExpect(jsonPath("$.resolvedBy").isNotEmpty());
        mockMvc.perform(get("/api/v1/admin/practice-reports").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/admin/practice-reports").param("status", "DISMISSED").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.content[0].resolutionNote").value("B is correct: see the explanation"));
        mockMvc.perform(get("/api/v1/admin/practice-reports")).andExpect(status().isUnauthorized());
    }
}
