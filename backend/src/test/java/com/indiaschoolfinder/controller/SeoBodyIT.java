package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void aProfileLinksToOtherSchoolsInTheSamePlaceAsTheAppDoes() throws Exception {
        long id = createSchool(school("Fixture Lakeside School", Map.of("stateCode", "UK", "city", "Bhimtal")));
        createSchool(school("Fixture Hillside Academy", Map.of("stateCode", "UK", "city", "Bhimtal")));
        createSchool(school("Fixture Far Away School", Map.of("stateCode", "UK", "city", "Almora")));
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", id)).andReturn()).get("slug").asText();
        String page = fetch("/api/v1/seo/body/schools/" + slug);
        assertThat(page).contains("<h2>Other schools in Bhimtal</h2>").contains(">Fixture Hillside Academy</a>")
                .doesNotContain("Fixture Far Away School")
                // the school itself is not among its "other schools"
                .containsOnlyOnce(">Fixture Lakeside School<");
    }

    @Test
    void examGuidesAndPreparationPagesCarryTheirContent() throws Exception {
        mockMvc.perform(post("/api/v1/admin/exams/import").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new org.springframework.core.io.ClassPathResource("seed/exams.json").getContentAsString(java.nio.charset.StandardCharsets.UTF_8)))
                .andExpect(status().isOk());
        String guide = fetch("/api/v1/seo/body/exams/netarhat/guide");
        assertThat(guide).contains("<h2>Eligibility</h2>").contains("<h2>Official papers</h2>")
                .contains("netarhatvidyalaya.com/pdf/22_03_18_smple_ppr_entrance_test.pdf").contains("<th>Marks</th>")
                .contains("href=\"/exams/netarhat\">Netarhat practice questions, mock tests and study plan</a>");
        String prep = fetch("/api/v1/seo/body/exams/netarhat");
        assertThat(prep).contains("<th>Marks</th>").contains("href=\"/exams/netarhat/guide\"")
                // The preparation page shows what that page shows; eligibility is on the guide.
                .doesNotContain("<h2>Eligibility</h2>");
        assertThat(fetch("/api/v1/seo/body/exams/aissee/guide")).contains("<h2>Syllabus</h2>");
        // Fixed pages under /exams are not exams.
        assertThat(fetch("/api/v1/seo/body/exams/practice")).contains("<h1>").doesNotContain("Official links");
    }

    @Test
    void placeAndHomePagesListTheirLinksAndPrivateOrUnknownPagesGetNothing() throws Exception {
        createSchool(school("Fixture Doon Valley School", Map.of("stateCode", "UK")));

        String state = fetch("/api/v1/seo/body/states/uttarakhand");
        assertThat(state).contains("<h1>Schools in Uttarakhand</h1>").contains("Fixture Doon Valley School")
                // The same introduction, numbers and questions as the app's place summary.
                .contains("<h2>Uttarakhand at a glance</h2>").contains("SchoolDhundo lists")
                .contains("<h2>Questions about schools in Uttarakhand</h2>").contains("href=\"/admissions/guide\"");

        assertThat(fetch("/api/v1/seo/head/")).contains("\"@type\":\"WebSite\"").contains("\"@type\":\"Organization\"")
                .contains("<link rel=\"preload\" as=\"image\" media=\"(min-width: 1024px)\"").contains("og:image")
                .contains("\"url\":\"http://localhost/contact\"");

        // A published notice appears in the home page's first paint, as a link with its date.
        jdbc.execute("TRUNCATE site_update RESTART IDENTITY");
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        Map<String, Object> notice = new HashMap<>();
        notice.put("category", "JOB");
        notice.put("title", "Fixture teacher recruitment notice");
        notice.put("summary", "Applications invited for fixture teaching posts; see the official notice.");
        notice.put("publishedOn", today.toString());
        notice.put("eventDate", today.plusDays(20).toString());
        notice.put("eventLabel", "Last date");
        notice.put("deadline", true);
        notice.put("sourceUrl", "https://example.gov.in/recruitment.pdf");
        notice.put("priority", 0);
        long noticeId = body(mockMvc.perform(post("/api/v1/admin/updates").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(notice))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
        mockMvc.perform(post("/api/v1/admin/updates/" + noticeId + "/publish").header("Authorization", editorToken())).andExpect(status().isOk());

        String home = fetch("/api/v1/seo/body/");
        assertThat(home).contains("<h1>Find the Right School for Your Child</h1>").contains("class=\"pr-hero\"")
                .contains("<h2>Latest school and exam updates</h2>").contains("Fixture teacher recruitment notice")
                .contains("href=\"/states/uttarakhand\"").contains("href=\"/exams/jnvst\"")
                .contains("href=\"/updates\">Notifications</a>").contains("href=\"/rankings\">Rankings</a>");
        // The updates page lists the notices with their summaries and sources, not only a heading.
        assertThat(fetch("/api/v1/seo/body/updates")).contains("Fixture teacher recruitment notice")
                .contains("Applications invited for fixture teaching posts").contains("https://example.gov.in/recruitment.pdf");

        assertThat(fetch("/api/v1/seo/body/about")).contains("<h1>About SchoolDhundo</h1>");
        assertThat(fetch("/api/v1/seo/body/saved")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/admin/schools")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/schools/no-such-school")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/this-page-does-not-exist")).isEmpty();
    }

    @Test
    void networkPagesListTheirSchoolsAndSayHowAdmissionWorks() throws Exception {
        createSchool(school("Fixture Sainik School Alpha", Map.of("stateCode", "UK", "management", "CENTRAL_GOVERNMENT",
                "network", "SAINIK_SCHOOL")));
        createSchool(school("Fixture Sainik School Beta", Map.of("stateCode", "UK", "management", "CENTRAL_GOVERNMENT",
                "network", "SAINIK_SCHOOL")));
        createSchool(school("Fixture Day School", Map.of("stateCode", "UK")));

        // The title names the search people make; the description starts with how many schools the page lists.
        String head = fetch("/api/v1/seo/head/network/sainik-school");
        assertThat(head).contains("<title>Sainik Schools in India: list and admission | SchoolDhundo</title>")
                .contains("content=\"2 schools listed. Residential schools run by the Sainik Schools Society")
                .contains("href=\"http://localhost/network/sainik-school\"").doesNotContain("noindex");

        String page = fetch("/api/v1/seo/body/network/sainik-school");
        assertThat(page).contains("<h1>Sainik Schools in India: list and admission</h1>")
                .contains("All India Sainik Schools Entrance Examination (AISSEE)")
                .contains("href=\"https://sainikschoolsociety.in/\"")
                .contains("href=\"/exams/aissee\"").contains("href=\"/exams/aissee/guide\"")
                .contains("<h2>Sainik Schools listed on SchoolDhundo</h2>")
                .contains("Fixture Sainik School Alpha").contains("Fixture Sainik School Beta")
                .doesNotContain("Fixture Day School");
        // Every network has its page; an unknown one is the app's "page not found", with no content.
        assertThat(fetch("/api/v1/seo/body/network/kendriya-vidyalaya")).contains("href=\"https://kvsangathan.nic.in/\"");
        assertThat(fetch("/api/v1/seo/body/network/no-such-network")).isEmpty();
        assertThat(fetch("/api/v1/seo/head/network/no-such-network")).contains("noindex").doesNotContain("canonical");
    }
}
