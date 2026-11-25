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
                "classCodes", java.util.List.of("VI", "XII"), "description", RICH_DESCRIPTION)));
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", id)).andReturn()).get("slug").asText();
        String h = head("/schools/" + slug + "?utm_source=x");

        assertThat(h).contains("<title>Fixture Hill &amp; Valley School, Uttarakhand | SchoolDhundo</title>");
        assertThat(h).contains("name=\"description\" content=\"Fixture Hill &amp; Valley School, Uttarakhand. Classes Class VI to Class XII."
                + " See contact details, with official sources, on SchoolDhundo.\"");
        // No fees or admission dates are recorded, so neither the title nor the description mentions them.
        assertThat(h).doesNotContain("Fees").doesNotContain("fees");
        assertThat(h).contains("<link rel=\"canonical\" href=\"http://localhost/schools/" + slug + "\" />");
        assertThat(h).contains("\"@type\":\"School\"").contains("\"postalCode\":\"263002\"").contains("\"latitude\":29.38");
        // Breadcrumbs: Home › state › school (no district recorded).
        assertThat(h).contains("\"@type\":\"BreadcrumbList\"")
                .contains("\"name\":\"Uttarakhand\",\"item\":\"http://localhost/states/uttarakhand\"")
                .contains("\"position\":3,\"name\":\"Fixture Hill & Valley School\"");
        assertThat(h).doesNotContain("noindex");
    }

    /** An editor's description long enough to count as content of the profile's own. */
    static final String RICH_DESCRIPTION = "A co-educational day school on the hill road above the lake, founded by a local trust."
            + " It teaches from Class VI to Class XII with science and commerce streams, runs its own library and laboratories,"
            + " and admits most students in Class VI after an interaction with parents. Details here come from the school's"
            + " prospectus and its board affiliation record.";

    @Test
    void bareBoardListingsStayReachableButAreNotIndexed() throws Exception {
        // Only the facts every directory repeats (board, affiliation number, address, website): noindex until more is added.
        long bare = createSchool(school("Fixture Bare Listing School", Map.of("stateCode", "UK", "boardCode", "CBSE",
                "affiliationNumber", "3530999", "websiteUrl", "https://bare.example.org")));
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", bare)).andReturn()).get("slug").asText();
        assertThat(head("/schools/" + slug)).contains("<meta name=\"robots\" content=\"noindex\"")
                .contains("<link rel=\"canonical\"").contains("<title>Fixture Bare Listing School");
        // Visitors still get the page's first paint.
        assertThat(mockMvc.perform(get("/api/v1/seo/body/schools/" + slug)).andReturn().getResponse().getContentAsString())
                .contains("<h1>Fixture Bare Listing School</h1>");
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
        assertThat(head("/network/kendriya-vidyalaya")).contains("<title>Kendriya Vidyalaya list and KVS admission | SchoolDhundo</title>")
                .contains("href=\"http://localhost/network/kendriya-vidyalaya\"");
    }

    @Test
    void addressesOutsideTheAppAreNotIndexedButItsPagesAre() throws Exception {
        // No route in the app: the "page not found" page, not a copy of the home page.
        assertThat(head("/this-page-does-not-exist")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/wp-login.php")).contains("noindex");
        // The home page stays indexable. An address inside an app section that no page answers is the app's "page not
        // found", not a copy of the home page (found live on 19 Nov 2026 at /boarding/{unknown} and /type/{unknown}).
        assertThat(head("/")).doesNotContain("noindex").contains("href=\"http://localhost/\"");
        assertThat(head("/rankings/lists")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/boarding/uttarakhand")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/type/private")).contains("noindex");
        assertThat(head("/stages/high-school")).contains("noindex");
        assertThat(head("/admissions/2027")).contains("noindex");
        assertThat(head("/rankings/india")).contains("noindex"); // the app redirects it to /rankings
        // The app's featured boarding pages have their own title; where the school has a directory profile or network
        // page in the sitemap, that is the address to index.
        assertThat(head("/boarding/sainik-schools")).contains("<title>Sainik Schools in India: admission through AISSEE</title>")
                .contains("Classes VI and IX via AISSEE.")
                .contains("href=\"http://localhost/network/sainik-school\"").doesNotContain("noindex");
        assertThat(head("/boarding/rimc")).contains("Rashtriya Indian Military College (RIMC), Dehradun")
                .contains("href=\"http://localhost/schools/rashtriya-indian-military-college\"");
        assertThat(head("/boarding/sainik-school-tilaiya")).contains("href=\"http://localhost/boarding/sainik-school-tilaiya\"");
        assertThat(head("/boarding/girls")).doesNotContain("noindex");
        // These descriptions were one long sentence, cut with "…" at 160 characters on the live site (19 Nov 2026).
        for (String p : new String[]{"/schools", "/exams", "/exams/finder", "/exams/practice", "/exams/syllabus", "/exams/resources",
                "/admissions/guide", "/updates", "/editorial-policy", "/boards/CISCE", "/boards/CBSE"}) {
            assertThat(head(p)).as(p).doesNotContain("…");
        }
        assertThat(head("/exams/practice")).contains("not official");
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
                // The first sentence is too long to fit whole, so the set's own facts describe it (25 Nov 2026).
                .contains("Mathematics questions for Class V with explained answers").contains("Original questions, not official papers.")
                .doesNotContain("noindex");
        assertThat(head("/exams/practice/no-such-set")).contains("noindex").doesNotContain("canonical");
        assertThat(head("/boarding/girls")).contains("<title>Girls&#39; boarding schools in India | SchoolDhundo</title>");
        assertThat(head("/rankings/government-boarding")).contains("href=\"http://localhost/rankings/government-boarding\"");
        mockMvc.perform(get("/sitemaps/exams.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/practice/netarhat-maths-1</loc>")));
    }

    @Test
    void olympiadPagesHaveTheirOwnAddresses() throws Exception {
        Integer present = jdbc.queryForObject("SELECT count(*) FROM practice_set WHERE slug = 'olympiad-class5-maths-1'", Integer.class);
        if (present == null || present == 0) {
            mockMvc.perform(post("/api/v1/admin/practice-sets/import").header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(new ClassPathResource("seed/practice.json").getContentAsString(StandardCharsets.UTF_8)))
                    .andExpect(status().isOk());
        }
        // /exams/olympiad is a page of its own: its own title, description and canonical address.
        assertThat(head("/exams/olympiad"))
                .contains("<title>Olympiad Preparation &amp; Practice: Classes 1 to 10</title>")
                .contains("href=\"http://localhost/exams/olympiad\"")
                .contains("IOQM-style").contains("\"@type\":\"BreadcrumbList\"")
                .doesNotContain("noindex");
        // Each class with published Olympiad sets has a page, named the way people search ("olympiad for class 5").
        assertThat(head("/exams/olympiad/class-5"))
                .contains("<title>Class 5 Olympiad Preparation: Maths, Science &amp; English</title>")
                .contains("href=\"http://localhost/exams/olympiad/class-5\"")
                .contains("content=\"Class 5 Olympiad practice: ").contains("timed mock tests")
                .contains("\"position\":3,\"name\":\"Olympiad preparation\",\"item\":\"http://localhost/exams/olympiad\"")
                .doesNotContain("noindex");
        // A class without Olympiad sets, and any other address under /exams/olympiad, is not a page.
        assertThat(head("/exams/olympiad/class-12")).contains("noindex");
        assertThat(head("/exams/olympiad/class-x")).contains("noindex");
        assertThat(head("/exams/olympiad/guide")).contains("noindex");
        // The old address (the practice centre filtered to Olympiads) stands for the new one, whose canonical link it
        // carries; the app moves visitors on.
        assertThat(head("/exams/practice?category=OLYMPIAD")).contains("href=\"http://localhost/exams/olympiad\"")
                .contains("<title>Olympiad Preparation &amp; Practice: Classes 1 to 10</title>").doesNotContain("noindex");
        assertThat(head("/exams/practice?category=OLYMPIAD&class=5")).contains("href=\"http://localhost/exams/olympiad/class-5\"");
        // The practice centre, and its other filters, keep the practice centre's head.
        assertThat(head("/exams/practice")).contains("href=\"http://localhost/exams/practice\"").doesNotContain("olympiad\"");
        assertThat(head("/exams/practice?category=SCHOOL")).contains("href=\"http://localhost/exams/practice\"").doesNotContain("category=");
        assertThat(head("/exams/practice/progress?category=OLYMPIAD")).contains("noindex");

        String hub = mockMvc.perform(get("/api/v1/seo/body/exams/olympiad")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(hub).contains("<h1>Olympiad Preparation &amp; Practice</h1>").contains("<h3>Class V</h3>")
                .contains("href=\"/exams/practice/olympiad-class5-maths-1\"").contains("not connected with SOF")
                .contains("href=\"/exams/olympiad/class-5\"").contains("href=\"/exams/olympiad/class-1\"");
        String legacy = mockMvc.perform(get("/api/v1/seo/body/exams/practice").param("category", "OLYMPIAD")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(legacy).isEqualTo(hub);
        String classPage = mockMvc.perform(get("/api/v1/seo/body/exams/olympiad/class-5")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(classPage).contains("<h1>Class 5 Olympiad Preparation</h1>").contains("<h2>Class V practice sets</h2>")
                .contains("href=\"/exams/practice/olympiad-class5-maths-1\"").contains("<dt>Subjects</dt>")
                .contains("href=\"/exams/olympiad/class-4\"").contains("not connected with SOF")
                // The class page lists sets; their questions and answers stay out of the page.
                .doesNotContain("\"answer\"").doesNotContain("explanation");
        assertThat(mockMvc.perform(get("/api/v1/seo/body/exams/olympiad/class-12")).andReturn().getResponse().getContentAsString()).isEmpty();

        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/olympiad</loc>"),
                                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("category=OLYMPIAD")))));
        mockMvc.perform(get("/sitemaps/exams.xml"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/olympiad/class-5</loc>"),
                                org.hamcrest.Matchers.containsString("<loc>http://localhost/exams/olympiad/class-10</loc>"),
                                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("/exams/olympiad/class-12")))));
    }

    @Test
    void directoryAndStatePagesDescribeTheirContents() throws Exception {
        createSchool(school("Fixture Lake School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        // A town page listing one or two schools would repeat their profiles: reachable, but not indexed.
        assertThat(head("/states/uttarakhand/city/bhim-tal")).contains("noindex");
        assertThat(head("/states/uttarakhand/nainital")).contains("noindex");
        createSchool(school("Fixture Hill School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        createSchool(school("Fixture Valley School", Map.of("stateCode", "UK", "district", "Nainital", "city", "Bhim Tal")));
        // Titles lead with the count of schools listed, as the description says (SeoHeadService.placeTitle).
        assertThat(head("/states/uttarakhand")).contains("<title>List of 3 Schools in Uttarakhand | SchoolDhundo</title>")
                .contains("3 schools in Uttarakhand").contains("href=\"http://localhost/states/uttarakhand\"");
        // A district page says "District", so it is not mistaken for the town of the same name (/states/…/city/…).
        assertThat(head("/states/uttarakhand/nainital")).contains("<title>List of 3 Schools in Nainital District, Uttarakhand</title>")
                .doesNotContain("noindex");
        assertThat(head("/states/uttarakhand/city/bhim-tal")).contains("<title>List of 3 Schools in Bhim Tal, Uttarakhand | SchoolDhundo</title>")
                .contains("href=\"http://localhost/states/uttarakhand/city/bhim-tal\"").doesNotContain("noindex")
                .contains("\"@type\":\"BreadcrumbList\"")
                .contains("\"position\":3,\"name\":\"Bhim Tal\",\"item\":\"http://localhost/states/uttarakhand/city/bhim-tal\"")
                // fees are promised only "where published"
                .contains("Fees and admission dates are shown where published");
        assertThat(head("/states/uttarakhand/city/atlantis")).contains("noindex");
        assertThat(head("/schools")).contains("<title>Find Schools in India: CBSE &amp; ICSE School Directory</title>")
                .contains("href=\"http://localhost/schools\"");
        assertThat(head("/boards/CISCE")).contains("ICSE/ISC (CISCE) schools in India")
                .contains("href=\"http://localhost/boards/CISCE\"");
        // Titled "CAMBRIDGE schools in India" and "STATE schools in India" until 23 Nov 2026.
        assertThat(head("/boards/CAMBRIDGE")).contains("<title>Cambridge (CAIE) schools in India | SchoolDhundo</title>");
        // A board with no school listed is an empty page: noindex, as it is left out of the sitemap.
        java.util.List<String> withSchools = jdbc.queryForList(
                "SELECT DISTINCT education_board_code FROM school WHERE active AND education_board_code IS NOT NULL", String.class);
        assertThat(head("/boards/STATE")).contains("State board schools in India");
        assertThat(head("/boards/STATE").contains("noindex")).isEqualTo(!withSchools.contains("STATE"));
        assertThat(head("/boards/CBSE").contains("noindex")).isEqualTo(!withSchools.contains("CBSE"));
        assertThat(head("/find")).contains("<title>Find the right school for your child | SchoolDhundo</title>")
                .contains("href=\"http://localhost/find\"");
        assertThat(head("/")).contains("<title>SchoolDhundo: Find Schools, Rankings and Exam Prep</title>").contains("SearchAction");
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
        assertThat(head("/exams/jnvst")).contains("<title>JNVST Class 6 Mock Test 2027: Free Navodaya (JNV) Practice</title>")
                .contains("href=\"http://localhost/exams/jnvst\"").doesNotContain("noindex");
        assertThat(head("/exams/jnvst/guide")).contains("JNVST 2027: eligibility, dates, pattern and syllabus")
                .contains("href=\"http://localhost/exams/jnvst/guide\"").doesNotContain("noindex")
                // The guide is an Article by the site, dated when its facts were last checked, with the questions it shows.
                .contains("\"@type\":\"Article\"").contains("\"headline\":\"JNVST 2027: eligibility, dates, pattern and syllabus\"")
                .contains("\"publisher\":{\"@type\":\"Organization\",\"@id\":\"http://localhost/#organization\"")
                .contains("\"@type\":\"FAQPage\"").contains("\"name\":\"Is there an application fee for JNVST?\"")
                .doesNotContain("datePublished");
        String guideBody = mockMvc.perform(get("/api/v1/seo/body/exams/jnvst/guide")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        String checked = jdbc.queryForObject("SELECT last_verified_on::text FROM exam WHERE slug = 'jnvst'", String.class);
        if (checked != null) {
            assertThat(head("/exams/jnvst/guide")).contains("\"dateModified\":\"" + checked + "\"");
            assertThat(guideBody).contains("Checked against these sources on <time datetime=\"" + checked + "\">");
        }
        assertThat(head("/exams/aissee")).contains("<title>AISSEE 2027 Class 6 Preparation: Free Mock Tests</title>")
                .contains("href=\"http://localhost/exams/aissee\"").doesNotContain("noindex");
        assertThat(head("/exams/aissee/guide")).contains("AISSEE 2027: eligibility, dates, pattern and syllabus")
                .contains("href=\"http://localhost/exams/aissee/guide\"").doesNotContain("noindex");
        assertThat(head("/exams/netarhat")).contains("<title>Netarhat Vidyalaya Entrance Exam 2026-27: Free Mock Tests</title>")
                .contains("href=\"http://localhost/exams/netarhat\"").contains("mock tests (full Paper 1)").doesNotContain("noindex")
                // The whole description fits, so it is never cut short, and the exam date stays in it (25 Nov 2026).
                .doesNotContain("…").contains("6 Dec 2026");
        assertThat(head("/exams/netarhat/guide")).contains("href=\"http://localhost/exams/netarhat/guide\"").doesNotContain("noindex");
    }
}
