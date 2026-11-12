package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Server-rendered page content and the school FAQ that is both shown on the page and sent as FAQPage data. */
class SeoBodyIT extends AbstractIntegrationTest {

    private String fetch(String url) throws Exception {
        MvcResult result = mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn();
        return result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    void schoolPagesCarryTheirFactsAndTheSameQuestionsOnThePageAndInStructuredData() throws Exception {
        long id = createSchool(school("Fixture Ridge & Vale School", Map.of("stateCode", "UK", "pinCode", "263002",
                "hasHostel", true, "management", "PRIVATE_UNAIDED", "websiteUrl", "https://ridge.example.org",
                "classCodes", List.of("VI", "XII"))));
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", id)).andReturn()).get("slug").asText();

        JsonNode faqs = body(mockMvc.perform(get("/api/v1/schools/{id}/faqs", id)).andExpect(status().isOk()).andReturn());
        assertThat(faqs.isArray()).isTrue();
        List<String> questions = new java.util.ArrayList<>();
        faqs.forEach(f -> questions.add(f.get("question").asText()));
        assertThat(questions).contains(
                "Which classes does Fixture Ridge & Vale School have?",
                "Is Fixture Ridge & Vale School a government or private school?",
                "Does Fixture Ridge & Vale School have a hostel?",
                "How can I contact Fixture Ridge & Vale School?");
        // Nothing recorded, nothing asked: no board, fee or admission facts exist for this school.
        assertThat(questions).noneMatch(q -> q.startsWith("Which board") || q.startsWith("What is the fee") || q.startsWith("When are admissions"));

        String head = fetch("/api/v1/seo/head/schools/" + slug);
        assertThat(head).contains("\"@type\":\"FAQPage\"")
                .contains("\"name\":\"Does Fixture Ridge & Vale School have a hostel?\"")
                .contains("\"text\":\"Yes, Fixture Ridge & Vale School has a hostel.\"");

        String page = fetch("/api/v1/seo/body/schools/" + slug);
        assertThat(page).contains("data-prerender")
                .contains("<h1>Fixture Ridge &amp; Vale School</h1>")
                .contains("<h2>Quick answers</h2>")
                .contains("<dt>Does Fixture Ridge &amp; Vale School have a hostel?</dt>")
                .contains("<dt>Classes</dt><dd>Class VI to Class XII</dd>")
                .contains("href=\"/states/uttarakhand\"")
                .doesNotContain("Ridge & Vale");
    }

    @Test
    void placeAndHomePagesListTheirLinksAndPrivateOrUnknownPagesGetNothing() throws Exception {
        createSchool(school("Fixture Doon Valley School", Map.of("stateCode", "UK")));

        String state = fetch("/api/v1/seo/body/states/uttarakhand");
        assertThat(state).contains("<h1>Schools in Uttarakhand</h1>").contains("Fixture Doon Valley School");

        String home = fetch("/api/v1/seo/body/");
        assertThat(home).contains("<h1>Find the Right School. Build a Brighter Future.</h1>")
                .contains("href=\"/states/uttarakhand\"").contains("href=\"/exams/jnvst\"");

        assertThat(fetch("/api/v1/seo/body/about")).contains("<h1>About SchoolDhundo</h1>");
        assertThat(fetch("/api/v1/seo/body/saved")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/admin/schools")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/schools/no-such-school")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/this-page-does-not-exist")).isEmpty();
    }
}
