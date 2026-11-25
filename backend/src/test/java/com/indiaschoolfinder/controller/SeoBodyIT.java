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
        // The profile's own first sentence describes the School entity (the same words the page opens with).
        String about = "Fixture Ridge & Vale School is a private boarding school in Uttarakhand. It teaches classes from Class VI to Class XII.";
        assertThat(head).contains("\"@type\":\"FAQPage\"")
                .contains("\"name\":\"Does Fixture Ridge & Vale School have a hostel?\"")
                .contains("\"text\":\"Yes, Fixture Ridge & Vale School has a hostel.\"")
                .contains("\"@id\":\"http://localhost/schools/" + slug + "#school\"")
                .contains("\"description\":\"" + about + "\"");

        String page = fetch("/api/v1/seo/body/schools/" + slug);
        assertThat(page).contains("data-prerender")
                .contains("<h1>Fixture Ridge &amp; Vale School</h1>")
                // Answer first: the factual introduction, as the app's "About" card opens.
                .contains("<h1>Fixture Ridge &amp; Vale School</h1><p class=\"pr-lead\">" + about.replace("&", "&amp;") + "</p>")
                // Where the profile comes from, and whether it was checked: real dates only.
                .contains("<h2>School information &amp; sources</h2>").contains("Profile from the school’s official record")
                .contains("Source: edudel.nic.in</a>").contains("Not yet checked by a SchoolDhundo editor.")
                .contains("Record last updated <time datetime=\"")
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
        assertThat(fetch("/api/v1/seo/body/exams/aissee/guide")).contains("<h2>Syllabus</h2>")
                // The AISSEE-2027 bulletin's age windows (25 Nov 2026), not the 2026 cycle's.
                .contains("born 01.04.2015 to 31.03.2017").doesNotContain("31.03.2026").doesNotContain("Not as of 25 October 2026");
        // What the JNVST-2027 prospectus says about the result, on the page and in its FAQPage data.
        assertThat(fetch("/api/v1/seo/body/exams/jnvst/guide")).contains("Is there a waiting list or second list?")
                .contains("NVS does not release wait-lists");
        assertThat(fetch("/api/v1/seo/head/exams/jnvst/guide")).contains("\"name\":\"When will the JNVST 2027 result be announced?\"");
        // Fixed pages under /exams are not exams.
        assertThat(fetch("/api/v1/seo/body/exams/practice")).contains("<h1>").doesNotContain("Official links");
        // The hub and the class pages link every exam's guide (prep exams to their /guide), as the app lists them.
        assertThat(fetch("/api/v1/seo/body/exams")).contains("href=\"/exams/netarhat/guide\"").contains("href=\"/exams/jnvst\"")
                .contains("href=\"/exams/class/6\"").contains("href=\"/exams/olympiad\"");
        assertThat(fetch("/api/v1/seo/body/exams/class/6")).contains("href=\"/exams/aissee/guide\"").contains("href=\"/exams\">Exams</a>")
                // The shipped catalogue has several Class VI exams, so the page compares them side by side.
                .contains("<h2>Compare at a glance</h2>").contains("<caption>Entrance exams for Class VI compared");
    }

    /** Who runs the site and how it checks facts, readable without the app (25 Nov 2026: about 30 words each before). */
    @Test
    void trustPagesSayWhoRunsTheSiteAndHowItChecksFacts() throws Exception {
        String about = fetch("/api/v1/seo/body/about");
        assertThat(about).contains("<h1>About SchoolDhundo</h1>").contains("SchoolDhundo was created by Rakesh Kumar")
                .contains("We never invent information").contains("SchoolDhundo is not affiliated with CBSE")
                .contains("<h2>How we label information</h2>").contains("href=\"/contact?topic=LISTING\"");
        assertThat(about.replaceAll("<[^>]+>", " ").trim().split("\\s+").length).isGreaterThan(300);
        assertThat(fetch("/api/v1/seo/body/editorial-policy")).contains("<h2>Independence</h2>")
                .contains("Rankings and scores cannot be bought").contains("href=\"/rankings/methodology\"");
        assertThat(fetch("/api/v1/seo/body/corrections-policy")).contains("<h2>How we check it</h2>")
                .contains("href=\"/contact?topic=CORRECTION\"");
    }

    @Test
    void twoBranchesWithOneNameInOneTownGetTitlesTheirPinCodesTellApart() throws Exception {
        long a = createSchool(school("Fixture St. Twin's School", Map.of("stateCode", "UK", "city", "Almora", "pinCode", "263601")));
        long b = createSchool(school("Fixture St Twins School", Map.of("stateCode", "UK", "city", "Almora", "pinCode", "263645")));
        long c = createSchool(school("Fixture Single School", Map.of("stateCode", "UK", "city", "Almora", "pinCode", "263601")));
        String slugA = body(mockMvc.perform(get("/api/v1/schools/{id}", a)).andReturn()).get("slug").asText();
        String slugB = body(mockMvc.perform(get("/api/v1/schools/{id}", b)).andReturn()).get("slug").asText();
        String slugC = body(mockMvc.perform(get("/api/v1/schools/{id}", c)).andReturn()).get("slug").asText();
        assertThat(fetch("/api/v1/seo/head/schools/" + slugA)).contains("<title>Fixture St. Twin&#39;s School, Almora (263601)");
        assertThat(fetch("/api/v1/seo/head/schools/" + slugB)).contains("<title>Fixture St Twins School, Almora (263645)");
        assertThat(fetch("/api/v1/seo/head/schools/" + slugC)).contains("<title>Fixture Single School, Almora").doesNotContain("(263601)");
    }

    @Test
    void theStateAndCityIndexesLinkEveryPlaceThatHasAPage() throws Exception {
        for (String n : List.of("One", "Two", "Three")) {
            createSchool(school("Fixture Indexed " + n + " School", Map.of("stateCode", "UK", "city", "Fixturenagar")));
        }
        createSchool(school("Fixture Lone School", Map.of("stateCode", "UK", "city", "Fixturegaon")));
        assertThat(fetch("/api/v1/seo/body/states")).contains("<h2>States</h2>").contains("href=\"/states/uttarakhand\">Uttarakhand</a>");
        assertThat(fetch("/api/v1/seo/body/cities")).contains("href=\"/states/uttarakhand/city/fixturenagar\"")
                // A town with too few schools for a page of its own is not linked.
                .doesNotContain("fixturegaon");
        assertThat(fetch("/api/v1/seo/body/rankings/states")).contains("href=\"/rankings/methodology\"");
    }

    @Test
    void aDistrictAndTheTownOfTheSameNameAreToldApartAndLinked() throws Exception {
        for (String n : List.of("One", "Two", "Three")) {
            createSchool(school("Fixture Twin " + n + " School", Map.of("stateCode", "UK", "district", "Fixtureabad", "city", "Fixtureabad")));
        }
        createSchool(school("Fixture Twin Outer School", Map.of("stateCode", "UK", "district", "Fixtureabad", "city", "Fixturepur")));
        assertThat(fetch("/api/v1/seo/head/states/uttarakhand/fixtureabad"))
                .contains("<title>List of 4 Schools in Fixtureabad District, Uttarakhand</title>");
        assertThat(fetch("/api/v1/seo/head/states/uttarakhand/city/fixtureabad"))
                .contains("<title>List of 3 Schools in Fixtureabad, Uttarakhand | SchoolDhundo</title>");
        // The heading is the app's (StatePage), not the count-led title.
        assertThat(fetch("/api/v1/seo/body/states/uttarakhand/fixtureabad"))
                .contains("<h1>Schools in Fixtureabad District, Uttarakhand</h1>")
                .contains("Just the city: <a href=\"/states/uttarakhand/city/fixtureabad\">3 schools in Fixtureabad</a>");
        assertThat(fetch("/api/v1/seo/body/states/uttarakhand/city/fixtureabad"))
                .contains("<h1>Schools in Fixtureabad, Uttarakhand</h1>")
                .contains("The whole district: <a href=\"/states/uttarakhand/fixtureabad\">4 schools in Fixtureabad District</a>");
        // A town of another name has no such link.
        createSchool(school("Fixture Pur Two School", Map.of("stateCode", "UK", "district", "Fixtureabad", "city", "Fixturepur")));
        createSchool(school("Fixture Pur Three School", Map.of("stateCode", "UK", "district", "Fixtureabad", "city", "Fixturepur")));
        assertThat(fetch("/api/v1/seo/body/states/uttarakhand/city/fixturepur")).doesNotContain("The whole district");
    }

    @Test
    void aTownSpeltTwoWaysIsOnePageNamedAfterTheSpellingWithMoreSchools() throws Exception {
        for (String n : List.of("One", "Two", "Three")) {
            createSchool(school("Fixture Spelt " + n + " School", Map.of("stateCode", "UK", "city", "Fixturebhuj")));
        }
        createSchool(school("Fixture Spelt Caps School", Map.of("stateCode", "UK", "city", "FIXTUREBHUJ")));
        assertThat(fetch("/api/v1/seo/head/states/uttarakhand/city/fixturebhuj")).doesNotContain("noindex")
                .contains("<title>List of 3 Schools in Fixturebhuj, Uttarakhand"); // the spelling with more schools, and its count
        assertThat(fetch("/api/v1/seo/body/states/uttarakhand/city/fixturebhuj")).contains("Fixture Spelt Two School");
    }

    @Test
    void boardDirectoryAndPracticePagesCarryTheirLinksButNoAnswers() throws Exception {
        createSchool(school("Fixture Board Listed School", Map.of("stateCode", "UK", "boardCode", "CBSE")));
        assertThat(fetch("/api/v1/seo/body/boards/CBSE")).contains(">Fixture Board Listed School</a>").contains("href=\"/boards/CISCE\"")
                .doesNotContain("href=\"/boards/CBSE\"");
        assertThat(fetch("/api/v1/seo/body/schools")).contains("href=\"/states/uttarakhand\"").contains(">Fixture Board Listed School</a>");

        Map<String, Object> set = new java.util.HashMap<>();
        set.put("slug", "fixture-ssr-quiz");
        set.put("examSlug", null);
        set.put("category", "OLYMPIAD");
        set.put("title", "Fixture SSR quiz");
        set.put("kind", "QUIZ");
        set.put("level", "Class V");
        set.put("description", "Fixture practice on fractions.");
        set.put("published", true);
        set.put("reviewedOn", LocalDate.now(ZoneId.of("Asia/Kolkata")).toString());
        set.put("content", Map.of("passages", List.of(), "questions", List.of(Map.of("id", "q1", "section", "Mathematics",
                "topic", "Fractions", "prompt", "Fixture prompt one", "options", List.of("A1", "B1", "C1", "D1"), "answer", 2,
                "explanation", "Fixture secret explanation"))));
        mockMvc.perform(post("/api/v1/admin/practice-sets/import").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("sets", List.of(set))))).andExpect(status().isOk());
        String page = fetch("/api/v1/seo/body/exams/practice/fixture-ssr-quiz");
        assertThat(page).contains("<h1>").contains("<p class=\"pr-lead\">Fixture practice on fractions.</p>")
                .contains("<dt>Questions</dt><dd>1</dd>").contains("<dt>Level</dt><dd>Class V</dd>")
                // An Olympiad set for one class leads to that class's Olympiad page.
                .contains("href=\"/exams/olympiad/class-5\"").contains("href=\"/exams/olympiad\"").contains("not official")
                // A landing page never carries the questions or the answer key.
                .doesNotContain("Fixture prompt one").doesNotContain("Fixture secret explanation");
        assertThat(fetch("/api/v1/seo/body/exams/practice/no-such-set")).isEmpty();
        jdbc.update("DELETE FROM practice_set WHERE slug = ?", "fixture-ssr-quiz");
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
                .contains("\"url\":\"http://localhost/contact\"")
                // One entity for the site, with the spellings people use, its publisher and its editorial policy.
                .contains("\"@id\":\"http://localhost/#organization\"").contains("\"@id\":\"http://localhost/#website\"")
                .contains("\"alternateName\":[\"School Dhundo\",\"schooldhundo.in\"]")
                .contains("\"publisher\":{\"@id\":\"http://localhost/#organization\"}")
                .contains("\"publishingPrinciples\":\"http://localhost/editorial-policy\"");

        // A published notice appears in the home page's first paint, as a link with its date.
        jdbc.execute("TRUNCATE site_update RESTART IDENTITY CASCADE"); // with the posts of job notices (V47)
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
                .contains("href=\"/updates\">Notifications</a>").contains("href=\"/rankings\">Rankings</a>")
                // Who runs the site and how it checks facts, linked from every page as the app's footer links them.
                .contains("<footer class=\"pr-footer\">").contains("href=\"/about\">About Us</a>")
                .contains("href=\"/editorial-policy\">Editorial Policy</a>").contains("href=\"/corrections-policy\">Corrections Policy</a>");
        // The updates page lists the notices with their summaries and sources, not only a heading.
        assertThat(fetch("/api/v1/seo/body/updates")).contains("Fixture teacher recruitment notice")
                .contains("Applications invited for fixture teaching posts").contains("https://example.gov.in/recruitment.pdf");

        assertThat(fetch("/api/v1/seo/body/about")).contains("<h1>About SchoolDhundo</h1>");
        assertThat(fetch("/api/v1/seo/body/saved")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/admin/schools")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/schools/no-such-school")).isEmpty();
        assertThat(fetch("/api/v1/seo/body/this-page-does-not-exist")).isEmpty();
        // Unknown /boarding/{slug}: the app's "page not found", not the home page's heading (live until 19 Nov 2026).
        assertThat(fetch("/api/v1/seo/body/boarding/uttarakhand")).isEmpty();
        // A featured boarding page leads with its own heading and summary.
        assertThat(fetch("/api/v1/seo/body/boarding/rimc")).contains("<h1>Rashtriya Indian Military College (RIMC), Dehradun</h1>")
                .contains("Class VIII only");
    }

    @Test
    void networkPagesListTheirSchoolsAndSayHowAdmissionWorks() throws Exception {
        long alpha = createSchool(school("Fixture Sainik School Alpha", Map.of("stateCode", "UK", "management", "CENTRAL_GOVERNMENT",
                "network", "SAINIK_SCHOOL")));
        createSchool(school("Fixture Sainik School Beta", Map.of("stateCode", "UK", "management", "CENTRAL_GOVERNMENT",
                "network", "SAINIK_SCHOOL")));
        createSchool(school("Fixture Day School", Map.of("stateCode", "UK")));

        // The title names the search people make; the description starts with how many schools the page lists.
        String head = fetch("/api/v1/seo/head/network/sainik-school");
        assertThat(head).contains("<title>Sainik Schools in India: list and admission | SchoolDhundo</title>")
                .contains("content=\"2 schools listed. Residential schools run by the Sainik Schools Society")
                .contains("href=\"http://localhost/network/sainik-school\"").doesNotContain("noindex")
                // Schools › Sainik Schools, as the page's heading names it.
                .contains("\"@type\":\"BreadcrumbList\"").contains("\"position\":2,\"name\":\"Sainik Schools\"");

        String page = fetch("/api/v1/seo/body/network/sainik-school");
        assertThat(page).contains("<h1>Sainik Schools in India: list and admission</h1>")
                .contains("All India Sainik Schools Entrance Examination (AISSEE)")
                .contains("href=\"https://sainikschoolsociety.in/\"")
                .contains("href=\"/exams/aissee\"").contains("href=\"/exams/aissee/guide\"")
                .contains("<h2>Sainik Schools listed on SchoolDhundo</h2>")
                .contains("Fixture Sainik School Alpha").contains("Fixture Sainik School Beta")
                .doesNotContain("Fixture Day School")
                // Every network page leads to the other four (none did before November 2026), never to itself.
                .contains("<h2>Other government school networks</h2>").contains("href=\"/network/jawahar-navodaya-vidyalaya\"")
                .contains("href=\"/network/rashtriya-military-school\"").contains("href=\"/network/eklavya-model-residential-school\"")
                .doesNotContain("href=\"/network/sainik-school\"");
        // A network school's profile links its network's page, from the fact and from where admission is explained.
        String slug = body(mockMvc.perform(get("/api/v1/schools/{id}", alpha)).andReturn()).get("slug").asText();
        assertThat(fetch("/api/v1/seo/body/schools/" + slug))
                .contains("<dt>School network</dt><dd><a href=\"/network/sainik-school\">Sainik Schools</a></dd>")
                .contains("<h2>Admission and network</h2>").contains("href=\"/network/sainik-school\">All Sainik Schools</a>");
        // Every network has its page; an unknown one is the app's "page not found", with no content.
        assertThat(fetch("/api/v1/seo/body/network/kendriya-vidyalaya")).contains("href=\"https://kvsangathan.nic.in/\"");
        assertThat(fetch("/api/v1/seo/body/network/no-such-network")).isEmpty();
        assertThat(fetch("/api/v1/seo/head/network/no-such-network")).contains("noindex").doesNotContain("canonical");
    }
}
