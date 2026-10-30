package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SeoHeadIT extends AbstractIntegrationTest {

    private String head(String path) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/seo/head" + path)).andExpect(status().isOk()).andReturn();
        return result.getResponse().getContentAsString();
    }

    @Test
    void schoolPagesGetTheirOwnTitleDescriptionCanonicalAndStructuredData() throws Exception {
        long id = createSchool(school("Fixture Hill & Valley School", Map.of("stateCode", "UK", "pinCode", "263002",
                "websiteUrl", "https://school.example.org", "latitude", 29.38, "longitude", 79.45,
                "classCodes", java.util.List.of("VI", "XII"))));
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", id)).andReturn()).get("slug").asText();
        String h = head("/schools/" + slug + "?utm_source=x");

        assertThat(h).contains("<title>Fixture Hill &amp; Valley School, Uttarakhand | India School Finder</title>");
        assertThat(h).contains("name=\"description\" content=\"Fixture Hill &amp; Valley School, Uttarakhand. Classes Class VI to Class XII.");
        assertThat(h).contains("<link rel=\"canonical\" href=\"http://localhost/schools/" + slug + "\" />");
        assertThat(h).contains("\"@type\":\"School\"").contains("\"postalCode\":\"263002\"").contains("\"latitude\":29.38");
        assertThat(h).doesNotContain("noindex");
    }

    @Test
    void unknownAndPrivatePagesAreNotIndexed() throws Exception {
        assertThat(head("/schools/no-such-school")).contains("<meta name=\"robots\" content=\"noindex\"")
                .doesNotContain("canonical");
        assertThat(head("/states/atlantis")).contains("noindex");
        assertThat(head("/admin/schools/1")).contains("noindex");
        assertThat(head("/saved")).contains("noindex");
        assertThat(head("/suggest")).contains("noindex");
        assertThat(head("/exams/practice/progress")).contains("noindex");
        assertThat(head("/exams/practice/attempts/12")).contains("noindex");
        assertThat(head("/exams/practice/session")).contains("noindex");
        assertThat(head("/exams/practice")).doesNotContain("noindex").contains("Olympiad");
        // Fixed pages each have their own title and canonical address.
        assertThat(head("/about")).contains("<title>About India School Finder | India School Finder</title>")
                .contains("href=\"http://localhost/about\"");
        assertThat(head("/stages/primary")).contains("<title>Primary schools | India School Finder</title>");
        assertThat(head("/network/kendriya-vidyalaya")).contains("Kendriya Vidyalaya schools");
    }

    @Test
    void practiceSetsAndNewLandingPagesHaveTheirOwnHead() throws Exception {
        String set = head("/exams/practice/netarhat-maths-1");
        assertThat(set).contains("<title>Netarhat Paper 1 practice: Mathematics 1")
                .contains("href=\"http://localhost/exams/practice/netarhat-maths-1\"")
                .contains("\"@type\":\"Quiz\"").contains("\"inLanguage\":[\"en\",\"hi\"]")
                .contains("20 original multiple-choice questions").contains("not official exam questions")
                .doesNotContain("noindex");
        assertThat(head("/exams/practice/no-such-set")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/boarding/girls")).contains("<title>Girls&#39; boarding schools in India | India School Finder</title>");
        assertThat(head("/rankings/published")).contains("href=\"http://localhost/rankings/published\"");
        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/practice/netarhat-maths-1</loc>")));
    }

    @Test
    void directoryAndStatePagesDescribeTheirContents() throws Exception {
        createSchool(school("Fixture Lake School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        assertThat(head("/states/uttarakhand")).contains("<title>Schools in Uttarakhand | India School Finder</title>")
                .contains("1 schools in Uttarakhand").contains("href=\"http://localhost/states/uttarakhand\"");
        assertThat(head("/states/uttarakhand/nainital")).contains("Schools in Nainital, Uttarakhand");
        assertThat(head("/states/uttarakhand/city/bhim-tal")).contains("<title>Schools in Bhim Tal, Uttarakhand | India School Finder</title>")
                .contains("href=\"http://localhost/states/uttarakhand/city/bhim-tal\"").doesNotContain("noindex");
        assertThat(head("/states/uttarakhand/city/atlantis")).contains("noindex");
        assertThat(head("/schools")).contains("<title>School directory | India School Finder</title>")
                .contains("href=\"http://localhost/schools\"");
        assertThat(head("/boards/CISCE")).contains("ICSE/ISC (CISCE) schools in India")
                .contains("href=\"http://localhost/boards/CISCE\"");
        assertThat(head("/find")).contains("<title>Find the right school for your child | India School Finder</title>")
                .contains("href=\"http://localhost/find\"");
        assertThat(head("/")).contains("<title>India School Finder — Discover Schools.");
        assertThat(head("/some/unknown/page")).doesNotContain("canonical");
    }
}
