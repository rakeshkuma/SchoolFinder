package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UpdateSubmissionIT extends AbstractIntegrationTest {

    private Map<String, Object> suggestion(Map<String, Object> overrides) {
        Map<String, Object> body = new HashMap<>(Map.of(
                "topic", "FEES",
                "message", "The 2026-27 fee circular is now on the school website, under Admissions.",
                "sourceUrl", "https://school.example.org/fees-2026-27.pdf",
                "role", "SCHOOL",
                "contactEmail", "Office@School.example.org"));
        body.putAll(overrides);
        return body;
    }

    private org.springframework.test.web.servlet.ResultActions submit(long schoolId, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/schools/{id}/update-submissions", schoolId)
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    @Test
    void suggestionsQueueForEditorsAndClosingErasesTheEmail() throws Exception {
        long schoolId = createSchool(school("Fixture Submission School", Map.of()));
        submit(schoolId, suggestion(Map.of())).andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("received"));

        String list = body(mockMvc.perform(get("/api/v1/admin/update-submissions").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].schoolName").value("Fixture Submission School"))
                .andExpect(jsonPath("$.content[0].topic").value("FEES"))
                .andExpect(jsonPath("$.content[0].contactEmail").value("office@school.example.org"))
                .andExpect(jsonPath("$.content[0].status").value("NEW"))
                .andReturn()).toString();
        long id = objectMapper.readTree(list).get("content").get(0).get("id").asLong();
        mockMvc.perform(get("/api/v1/admin/update-submissions/count").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.new").value(1));

        mockMvc.perform(patch("/api/v1/admin/update-submissions/{id}", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACCEPTED\",\"note\":\"Fee schedule added\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.contactEmail").doesNotExist())
                .andExpect(jsonPath("$.reviewerNote").value("Fee schedule added"))
                .andExpect(jsonPath("$.reviewedBy").value(EDITOR));
        mockMvc.perform(get("/api/v1/admin/update-submissions").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.content.length()").value(0));
        mockMvc.perform(patch("/api/v1/admin/update-submissions/{id}", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"NEW\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void suggestionsNeedASourceAndRealContent() throws Exception {
        long schoolId = createSchool(school("Fixture Strict School", Map.of()));
        Map<String, Object> noSource = suggestion(Map.of());
        noSource.remove("sourceUrl");
        submit(schoolId, noSource).andExpect(status().isBadRequest());
        submit(schoolId, suggestion(Map.of("sourceUrl", "not a link"))).andExpect(status().isBadRequest());
        submit(schoolId, suggestion(Map.of("message", "too short"))).andExpect(status().isBadRequest());
        submit(schoolId, suggestion(Map.of("contactEmail", "not-an-email"))).andExpect(status().isBadRequest());
        submit(999_999L, suggestion(Map.of())).andExpect(status().isNotFound());
        // Markup is stripped, so a message that is only HTML does not count as content.
        submit(schoolId, suggestion(Map.of("message", "<b></b><i></i><script>alert(1)</script><p></p>"))).andExpect(status().isBadRequest());
    }

    @Test
    void honeypotSubmissionsAreDiscardedAndTheQueueIsForStaffOnly() throws Exception {
        long schoolId = createSchool(school("Fixture Honeypot School", Map.of()));
        submit(schoolId, suggestion(Map.of("website", "http://spam.example"))).andExpect(status().isAccepted());
        mockMvc.perform(get("/api/v1/admin/update-submissions").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.content.length()").value(0));
        mockMvc.perform(get("/api/v1/admin/update-submissions")).andExpect(status().isUnauthorized());
    }
}
