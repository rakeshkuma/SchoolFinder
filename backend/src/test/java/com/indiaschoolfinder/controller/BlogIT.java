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
        jdbc.execute("TRUNCATE blog_post, blog_post_source, blog_post_faq RESTART IDENTITY");
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
        // A live article cannot be deleted in one step: it is unpublished first.
        mockMvc.perform(delete("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken())).andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(draft("Nursery admission guide", "ADMISSIONS", false)))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/blog/posts/nursery-admission-guide")).andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken())).andExpect(status().isNoContent());
    }

    @Test
    void theWorkflowSchedulingSourcesAndTopicsWork() throws Exception {
        Map<String, Object> article = draft("JNV admission guide", "GOVERNMENT_SCHOOLS", false);
        article.put("status", "REVIEW");
        article.put("tags", java.util.List.of("JNVST", "Class 6"));
        article.put("faqs", java.util.List.of(Map.of("question", "Who can apply?", "answer", "Children studying in Class 5.")));
        long id = id(create(article).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("REVIEW")));
        mockMvc.perform(get("/api/v1/blog/posts")).andExpect(jsonPath("$.totalElements").value(0));

        // Publishing through the workflow needs a source.
        article.put("status", "PUBLISHED");
        mockMvc.perform(put("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(article))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("sources"));
        article.put("sources", java.util.List.of(Map.of("title", "Navodaya Vidyalaya Samiti", "url", "https://navodaya.gov.in/", "checkedOn", "2026-11-11")));

        // Scheduled for tomorrow: not public yet.
        article.put("publishAt", java.time.Instant.now().plus(java.time.Duration.ofDays(1)).toString());
        mockMvc.perform(put("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(article))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/blog/posts/jnv-admission-guide")).andExpect(status().isNotFound());

        // Published now: visible with its sources, FAQ and topics; the topic filter and topic list find it.
        article.remove("publishAt");
        article.put("publishAt", java.time.Instant.now().minusSeconds(60).toString());
        mockMvc.perform(put("/api/v1/admin/blog/posts/" + id).header("Authorization", adminToken()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(article))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/blog/posts/jnv-admission-guide")).andExpect(status().isOk())
                .andExpect(jsonPath("$.sources[0].url").value("https://navodaya.gov.in/"))
                .andExpect(jsonPath("$.faqs[0].question").value("Who can apply?"))
                .andExpect(jsonPath("$.card.tags[0]").value("JNVST"));
        mockMvc.perform(get("/api/v1/blog/posts").param("tag", "class 6")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/blog/posts/topics")).andExpect(jsonPath("$[0].articles").value(1));
        mockMvc.perform(get("/api/v1/blog/posts/categories")).andExpect(jsonPath("$.GOVERNMENT_SCHOOLS").value(1));
        String head = mockMvc.perform(get("/api/v1/seo/head/blog/jnv-admission-guide")).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(head).contains("og:type\" content=\"article\"").contains("twitter:card")
                .contains("BreadcrumbList").contains("/blog/category/government-schools");
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/blog/category/parenting"))
                .andReturn().getResponse().getContentAsString()).contains("noindex");
        // Addresses the blog needs for itself are refused.
        Map<String, Object> clash = draft("Topics", "ADMISSIONS", false);
        clash.put("slug", "topics");
        create(clash).andExpect(status().isBadRequest());
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
