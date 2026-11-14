package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

        assertThat(h).contains("<title>Fixture Hill &amp; Valley School, Uttarakhand | SchoolDhundo</title>");
        assertThat(h).contains("name=\"description\" content=\"Fixture Hill &amp; Valley School, Uttarakhand. Classes Class VI to Class XII.");
        assertThat(h).contains("<link rel=\"canonical\" href=\"http://localhost/schools/" + slug + "\" />");
        assertThat(h).contains("\"@type\":\"School\"").contains("\"postalCode\":\"263002\"").contains("\"latitude\":29.38");
        // Breadcrumbs: Home › state › school (no district recorded).
        assertThat(h).contains("\"@type\":\"BreadcrumbList\"")
                .contains("\"name\":\"Uttarakhand\",\"item\":\"http://localhost/states/uttarakhand\"")
                .contains("\"position\":3,\"name\":\"Fixture Hill & Valley School\"");
        assertThat(h).doesNotContain("noindex");
    }

    @Test
    void unknownAndPrivatePagesAreNotIndexed() throws Exception {
        assertThat(head("/schools/no-such-school")).contains("<meta name=\"robots\" content=\"noindex\"")
                .doesNotContain("canonical");
        assertThat(head("/states/atlantis")).contains("noindex");
        // Short place addresses hand over to the canonical state, district or town page.
        assertThat(head("/schools/bihar/arrah")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/admin/schools/1")).contains("noindex");
        assertThat(head("/saved")).contains("noindex");
        assertThat(head("/suggest")).contains("noindex");
        assertThat(head("/exams/practice/progress")).contains("noindex");
        assertThat(head("/exams/practice/attempts/12")).contains("noindex");
        assertThat(head("/exams/practice/session")).contains("noindex");
        assertThat(head("/exams/practice")).doesNotContain("noindex").contains("Olympiad");
        // Fixed pages each have their own title and canonical address.
        assertThat(head("/about")).contains("<title>About SchoolDhundo | SchoolDhundo</title>")
                .contains("href=\"http://localhost/about\"");
        assertThat(head("/stages/primary")).contains("<title>Primary schools | SchoolDhundo</title>");
        assertThat(head("/network/kendriya-vidyalaya")).contains("Kendriya Vidyalaya schools");
    }

    @Test
    void addressesOutsideTheAppAreNotIndexedButItsPagesAre() throws Exception {
        // No route in the app: the "page not found" page, not a copy of the home page.
        assertThat(head("/this-page-does-not-exist")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/wp-login.php")).contains("noindex");
        // The home page and app pages without their own title stay indexable.
        assertThat(head("/")).doesNotContain("noindex").contains("href=\"http://localhost/\"");
        assertThat(head("/rankings/lists")).doesNotContain("noindex");
        // The policy pages have their own title and canonical address, and are in the sitemap.
        assertThat(head("/editorial-policy")).contains("<title>Editorial policy | SchoolDhundo</title>")
                .contains("href=\"http://localhost/editorial-policy\"");
        assertThat(head("/corrections-policy")).contains("<title>Corrections policy | SchoolDhundo</title>");
        assertThat(head("/data-deletion")).contains("<title>Account and data deletion | SchoolDhundo</title>");
        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("<loc>http://localhost/data-deletion</loc>")));
    }

    @Test
    void practiceSetsAndNewLandingPagesHaveTheirOwnHead() throws Exception {
        // The shipped catalogue is loaded only into an empty database at start-up; other test classes clear it, so
        // import it here when the set is missing, whatever the test order.
        Integer present = jdbc.queryForObject("SELECT count(*) FROM practice_set WHERE slug = 'netarhat-maths-1'", Integer.class);
        if (present == null || present == 0) {
            mockMvc.perform(post("/api/v1/admin/practice-sets/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(new ClassPathResource("seed/practice.json").getContentAsString(StandardCharsets.UTF_8)))
                    .andExpect(status().isOk());
        }
        String set = head("/exams/practice/netarhat-maths-1");
        assertThat(set).contains("<title>Netarhat Paper 1 practice: Mathematics 1")
                .contains("href=\"http://localhost/exams/practice/netarhat-maths-1\"")
                .contains("\"@type\":\"Quiz\"").contains("\"inLanguage\":[\"en\",\"hi\"]")
                .contains("20 original multiple-choice questions").contains("not official exam questions")
                .doesNotContain("noindex");
        assertThat(head("/exams/practice/no-such-set")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/boarding/girls")).contains("<title>Girls&#39; boarding schools in India | SchoolDhundo</title>");
        assertThat(head("/rankings/government-boarding")).contains("href=\"http://localhost/rankings/government-boarding\"");
        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/practice/netarhat-maths-1</loc>")));
    }

    @Test
    void directoryAndStatePagesDescribeTheirContents() throws Exception {
        createSchool(school("Fixture Lake School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        // A town page listing one or two schools would repeat their profiles: reachable, but not indexed.
        assertThat(head("/states/uttarakhand/city/bhim-tal")).contains("noindex");
        assertThat(head("/states/uttarakhand/nainital")).contains("noindex");
        createSchool(school("Fixture Hill School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        createSchool(school("Fixture Valley School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        assertThat(head("/states/uttarakhand")).contains("<title>Schools in Uttarakhand | SchoolDhundo</title>")
                .contains("3 schools in Uttarakhand").contains("href=\"http://localhost/states/uttarakhand\"");
        assertThat(head("/states/uttarakhand/nainital")).contains("Schools in Nainital, Uttarakhand").doesNotContain("noindex");
        assertThat(head("/states/uttarakhand/city/bhim-tal")).contains("<title>Schools in Bhim Tal, Uttarakhand | SchoolDhundo</title>")
                .contains("href=\"http://localhost/states/uttarakhand/city/bhim-tal\"").doesNotContain("noindex");
        assertThat(head("/states/uttarakhand/city/atlantis")).contains("noindex");
        assertThat(head("/schools")).contains("<title>School directory | SchoolDhundo</title>")
                .contains("href=\"http://localhost/schools\"");
        assertThat(head("/boards/CISCE")).contains("ICSE/ISC (CISCE) schools in India")
                .contains("href=\"http://localhost/boards/CISCE\"");
        assertThat(head("/find")).contains("<title>Find the right school for your child | SchoolDhundo</title>")
                .contains("href=\"http://localhost/find\"");
        assertThat(head("/")).contains("<title>SchoolDhundo – Discover Schools, Rankings").contains("SearchAction");
        assertThat(head("/some/unknown/page")).doesNotContain("canonical");
    }

    @Test
    void jnvstHasAPreparationPageAndAGuide() throws Exception {
        Integer present = jdbc.queryForObject("SELECT count(*) FROM exam WHERE slug = 'jnvst'", Integer.class);
        if (present == null || present == 0) {
            mockMvc.perform(post("/api/v1/admin/exams/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(new ClassPathResource("seed/exams.json").getContentAsString(StandardCharsets.UTF_8)))
                    .andExpect(status().isOk());
        }
        assertThat(head("/exams/jnvst")).contains("<title>JNVST Class 6 Preparation 2027 – Free Mock Tests, Practice Questions and Study Plan</title>")
                .contains("href=\"http://localhost/exams/jnvst\"").doesNotContain("noindex");
        assertThat(head("/exams/jnvst/guide")).contains("JNVST: eligibility, dates, pattern and syllabus")
                .contains("href=\"http://localhost/exams/jnvst/guide\"").doesNotContain("noindex");
        assertThat(head("/exams/aissee")).contains("<title>AISSEE Class 6 Preparation 2027 – Free Sainik School Mock Tests, Practice Questions and Study Plan</title>")
                .contains("href=\"http://localhost/exams/aissee\"").doesNotContain("noindex");
        assertThat(head("/exams/aissee/guide")).contains("AISSEE: eligibility, dates, pattern and syllabus")
                .contains("href=\"http://localhost/exams/aissee/guide\"").doesNotContain("noindex");
    }
}
