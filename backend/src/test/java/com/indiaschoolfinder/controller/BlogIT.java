package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BlogIT extends AbstractIntegrationTest {

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE blog_post RESTART IDENTITY");
    }

    private Map<String, Object> draft(String title, String category, boolean published) {
        Map<String, Object> m = new HashMap<>();
        m.put("title", title);
        m.put("excerpt", "A short summary of " + title);
        m.put("body", "## First\n\nSome words about admissions.\n\n## Second\n\nMore words.");
        m.put("category", category);
        m.put("authorName", "Test Author");
        m.put("published", published);
        return m;
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/admin/blog/posts").header("Authorization", adminToken())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)));
    }

    private long id(ResultActions r) throws Exception {
        JsonNode n = objectMapper.readTree(r.andReturn().getResponse().getContentAsString());
        return n.get("id").asLong();
    }

    @Test
    void aDraftIsHiddenUntilPublishedAndOnlyStaffCanWrite() throws Exception {
        long id = id(create(draft("Nursery admission guide", "ADMISSIONS", false)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("nursery-admission-guide")).andExpect(jsonPath("$.published").value(false)));
        mockMvc.perform(get("/api/v1/blog/posts")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/blog/posts/nursery-admission-guide")).andExpect(status().isNotFound());

        mockMvc.perform(put("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(draft("Nursery admission guide", "ADMISSIONS", true)))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/blog/posts/nursery-admission-guide"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.card.minutesToRead").value(1)).andExpect(jsonPath("$.body").isNotEmpty());

        mockMvc.perform(post("/api/v1/admin/blog/posts").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(draft("Hack", "ADMISSIONS", true)))).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken())).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/blog/posts/nursery-admission-guide")).andExpect(status().isNotFound());
    }

    @Test
    void searchCategoryAndRelatedPostsWork() throws Exception {
        create(draft("CBSE or ICSE", "BOARD_COMPARISON", true));
        create(draft("State board basics", "BOARD_COMPARISON", true));
        create(draft("Fee receipts explained", "FEES_SCHOLARSHIPS", true));
        mockMvc.perform(get("/api/v1/blog/posts").param("category", "BOARD_COMPARISON")).andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/blog/posts").param("q", "fee")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/blog/posts").param("q", "100%")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/blog/posts/cbse-or-icse"))
                .andExpect(jsonPath("$.related.length()").value(1)).andExpect(jsonPath("$.related[0].slug").value("state-board-basics"));
    }

    @Test
    void aPostAddressIsUniqueAndACoverMustBeSafe() throws Exception {
        create(draft("Same title", "ADMISSIONS", true)).andExpect(status().isCreated());
        create(draft("Same title", "ADMISSIONS", true)).andExpect(status().isBadRequest());
        Map<String, Object> bad = draft("Another", "ADMISSIONS", true);
        bad.put("coverImageUrl", "javascript:alert(1)");
        create(bad).andExpect(status().isBadRequest());
    }

    @Test
    void aPublishedPostIsInTheSitemapAndADraftIsNot() throws Exception {
        create(draft("Sitemap post", "PARENTING_TIPS", true));
        create(draft("Hidden draft", "PARENTING_TIPS", false));
        String xml = mockMvc.perform(get("/sitemaps/pages.xml")).andReturn().getResponse().getContentAsString();
        assertThat(xml).contains("/blog/sitemap-post").doesNotContain("/blog/hidden-draft");
    }
}
