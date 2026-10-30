package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Saved attempts and saved exams of signed-in members: scored on the server, private to each member. */
class MemberPracticeIT extends AbstractIntegrationTest {

    private static final String PASSWORD = "plum tree by the river";
    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    private MailService mail;

    @BeforeEach
    void clean() throws Exception {
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

    private Cookie member(String email) throws Exception {
        Map<String, Object> r = new HashMap<>(Map.of("displayName", "Asha Verma", "email", email, "password", PASSWORD,
                "acceptTerms", true));
        mockMvc.perform(post("/api/v1/account/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json(r)))
                .andExpect(status().isAccepted());
        DevOutboxMailService.Message m = ((DevOutboxMailService) mail).messages().stream()
                .filter(x -> x.to().equals(email)).findFirst().orElseThrow();
        Matcher matcher = TOKEN.matcher(m.text());
        assertThat(matcher.find()).isTrue();
        mockMvc.perform(post("/api/v1/account/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("token", matcher.group(1))))).andExpect(status().isOk());
        MvcResult login = mockMvc.perform(post("/api/v1/account/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email, "password", PASSWORD, "rememberMe", false)))).andExpect(status().isOk()).andReturn();
        return login.getResponse().getCookie("ISF_SESSION");
    }

    private ResultActions submit(Cookie session, Object body) throws Exception {
        return mockMvc.perform(post("/api/v1/account/practice-attempts").with(csrf()).cookie(session)
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private Map<String, Object> attempt(UUID clientId, List<String> ids, Map<String, Integer> answers) {
        Map<String, Object> a = new HashMap<>();
        a.put("clientId", clientId.toString());
        a.put("title", "Quick practice");
        a.put("mode", "QUICK");
        a.put("questionIds", ids);
        a.put("answers", answers);
        a.put("durationSeconds", 95);
        return a;
    }

    @Test
    void attemptsAreScoredOnTheServerSavedOnceAndPrivate() throws Exception {
        Cookie asha = member("asha@example.org");
        List<String> ids = List.of("jnvst-arithmetic-1/a6", "jnvst-arithmetic-1/a7", "jnvst-arithmetic-1/a8");
        // a6 answer is option 1 (81 sq cm); a7 answered wrongly; a8 skipped.
        UUID clientId = UUID.randomUUID();
        Map<String, Object> body = attempt(clientId, ids, Map.of("jnvst-arithmetic-1/a6", 1, "jnvst-arithmetic-1/a7", 0));
        // A score sent by the browser is not accepted at all: the server works it out.
        Map<String, Object> withScore = new HashMap<>(body);
        withScore.put("correct", 3);
        submit(asha, withScore).andExpect(status().isBadRequest());
        MvcResult first = submit(asha, body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.score.correct").value(1))
                .andExpect(jsonPath("$.score.attempted").value(2))
                .andExpect(jsonPath("$.attempt.total").value(3))
                .andExpect(jsonPath("$.duplicate").value(false))
                .andReturn();
        long id = body(first).get("attempt").get("id").asLong();

        // The same attempt sent again (double click, retry) is not saved twice.
        submit(asha, body).andExpect(status().isOk()).andExpect(jsonPath("$.duplicate").value(true))
                .andExpect(jsonPath("$.attempt.id").value(id));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM practice_attempt", Integer.class)).isEqualTo(1);

        mockMvc.perform(get("/api/v1/account/practice-attempts").cookie(asha))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].sections[0].section").value("Arithmetic"));
        mockMvc.perform(get("/api/v1/account/practice-attempts/revision").cookie(asha))
                .andExpect(jsonPath("$.questionIds.length()").value(1))
                .andExpect(jsonPath("$.questionIds[0]").value("jnvst-arithmetic-1/a7"));

        // Another member can neither read Asha's attempt nor see it in their list.
        Cookie ravi = member("ravi@example.org");
        mockMvc.perform(get("/api/v1/account/practice-attempts/" + id).cookie(ravi)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/account/practice-attempts").cookie(ravi)).andExpect(jsonPath("$.totalElements").value(0));
        // Ravi reusing Asha's clientId gets his own attempt, not hers.
        submit(ravi, body).andExpect(status().isCreated()).andExpect(jsonPath("$.duplicate").value(false));
        mockMvc.perform(get("/api/v1/account/practice-attempts/" + id).cookie(asha)).andExpect(status().isOk())
                .andExpect(jsonPath("$.answers['jnvst-arithmetic-1/a6']").value(1));

        // Answering it correctly later clears it from revision.
        submit(asha, attempt(UUID.randomUUID(), List.of("jnvst-arithmetic-1/a7"), Map.of("jnvst-arithmetic-1/a7", 2)))
                .andExpect(jsonPath("$.score.correct").value(1));
        mockMvc.perform(get("/api/v1/account/practice-attempts/revision").cookie(asha))
                .andExpect(jsonPath("$.questionIds.length()").value(0));
    }

    @Test
    void attemptsNeedASessionTheCsrfTokenAndValidQuestions() throws Exception {
        Map<String, Object> body = attempt(UUID.randomUUID(), List.of("jnvst-arithmetic-1/a6"), Map.of());
        mockMvc.perform(post("/api/v1/account/practice-attempts").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json(body))).andExpect(status().isUnauthorized());
        Cookie asha = member("asha@example.org");
        mockMvc.perform(post("/api/v1/account/practice-attempts").cookie(asha).contentType(MediaType.APPLICATION_JSON)
                .content(json(body))).andExpect(status().isForbidden());
        submit(asha, attempt(UUID.randomUUID(), List.of("nope/q1"), Map.of())).andExpect(status().isBadRequest());
        submit(asha, attempt(UUID.randomUUID(), List.of("jnvst-arithmetic-1/a6"), Map.of("jnvst-arithmetic-1/a6", 9)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/account/practice-attempts")).andExpect(status().isUnauthorized());
    }

    @Test
    void savedExamsSyncAndMergeWithTheBrowserList() throws Exception {
        Cookie asha = member("asha@example.org");
        mockMvc.perform(put("/api/v1/account/saved-exams/jnvst").with(csrf()).cookie(asha))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0]").value("jnvst"));
        // Unknown exams cannot be saved; merging skips them and keeps existing entries once.
        mockMvc.perform(put("/api/v1/account/saved-exams/no-such-exam").with(csrf()).cookie(asha)).andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/account/saved-exams/merge").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("slugs", List.of("aissee", "jnvst", "no-such-exam")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(delete("/api/v1/account/saved-exams/jnvst").with(csrf()).cookie(asha))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0]").value("aissee"));
        Cookie ravi = member("ravi@example.org");
        mockMvc.perform(get("/api/v1/account/saved-exams").cookie(ravi)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void bookmarksSyncMergeAndStayPrivate() throws Exception {
        Cookie asha = member("asha@example.org");
        mockMvc.perform(put("/api/v1/account/bookmarks/jnvst-arithmetic-1/a6").with(csrf()).cookie(asha))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0]").value("jnvst-arithmetic-1/a6"));
        // Bookmarking twice changes nothing; an unknown question is not found; writes need the CSRF token.
        mockMvc.perform(put("/api/v1/account/bookmarks/jnvst-arithmetic-1/a6").with(csrf()).cookie(asha))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(put("/api/v1/account/bookmarks/nope/q1").with(csrf()).cookie(asha)).andExpect(status().isNotFound());
        mockMvc.perform(put("/api/v1/account/bookmarks/jnvst-arithmetic-1/a7").cookie(asha)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/account/bookmarks")).andExpect(status().isUnauthorized());

        // Merging the browser's bookmarks skips unknown questions and keeps the newest first.
        mockMvc.perform(post("/api/v1/account/bookmarks/merge").with(csrf()).cookie(asha).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("questionIds", List.of("class10-maths-1/m1", "gone/q9", "jnvst-arithmetic-1/a6")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(delete("/api/v1/account/bookmarks/jnvst-arithmetic-1/a6").with(csrf()).cookie(asha))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0]").value("class10-maths-1/m1"));

        Cookie ravi = member("ravi@example.org");
        mockMvc.perform(get("/api/v1/account/bookmarks").cookie(ravi)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void historyCarriesTopicsOutcomesAndMarks() throws Exception {
        JsonNode catalogue = objectMapper.readTree(new ClassPathResource("seed/practice.json").getInputStream());
        JsonNode mock = null;
        for (JsonNode s : catalogue.get("sets")) if (s.get("slug").asText().equals("competitive-aptitude-1")) mock = s;
        assertThat(mock).isNotNull();
        int right = mock.get("content").get("questions").get(0).get("answer").asInt();
        int wrong = (mock.get("content").get("questions").get(1).get("answer").asInt() + 1) % 4;
        List<String> ids = List.of("competitive-aptitude-1/p1", "competitive-aptitude-1/p2", "competitive-aptitude-1/p3");
        Cookie asha = member("asha@example.org");
        submit(asha, attempt(UUID.randomUUID(), ids, Map.of(ids.get(0), right, ids.get(1), wrong))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.attempt.marks").value(0.75)) // +1 right, −0.25 wrong, 0 skipped
                .andExpect(jsonPath("$.attempt.maxMarks").value(3));

        mockMvc.perform(get("/api/v1/account/practice-history").cookie(asha))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].attempt.correct").value(1))
                .andExpect(jsonPath("$[0].topics.length()").value(3))
                .andExpect(jsonPath("$[0].questions[0].correct").value(true))
                .andExpect(jsonPath("$[0].questions[1].attempted").value(true))
                .andExpect(jsonPath("$[0].questions[1].correct").value(false))
                .andExpect(jsonPath("$[0].questions[2].attempted").value(false));
        String body = mockMvc.perform(get("/api/v1/account/practice-history").cookie(asha)).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("explanation").doesNotContain("\"answer\"");

        Cookie ravi = member("ravi@example.org");
        mockMvc.perform(get("/api/v1/account/practice-history").cookie(ravi)).andExpect(jsonPath("$.length()").value(0));
    }
}
