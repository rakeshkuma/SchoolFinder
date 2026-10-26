package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ExamApiIT extends AbstractIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    private static final String SRC = "https://example.gov.in/notice.pdf";

    @BeforeEach
    void clearExams() {
        jdbc.execute("TRUNCATE exam RESTART IDENTITY CASCADE");
    }

    private ObjectNode exam(String slug, String shortName) {
        ObjectNode e = objectMapper.createObjectNode();
        e.put("slug", slug);
        e.put("shortName", shortName);
        e.put("name", shortName + " entrance test");
        e.put("kind", "ENTRANCE_TEST");
        e.put("conductingAuthority", "Fixture Authority");
        e.put("scope", "NATIONAL");
        e.putArray("stateCodes");
        e.putArray("schoolTypes").add("GOVERNMENT").add("RESIDENTIAL");
        e.putArray("entryClasses").add(6);
        e.put("boarding", "BOARDING");
        e.put("applicationFree", true);
        e.put("examMode", "PEN_PAPER");
        e.put("currentCycle", "CYCLE-2027");
        e.put("academicSession", "2027-28");
        e.put("summary", "A fixture exam.");
        e.set("content", objectMapper.valueToTree(Map.of(
                "forSchools", "Fixture schools", "entryClassText", "Class VI", "eligibility", List.of("Studying in Class V"),
                "pattern", List.of(), "syllabus", List.of(Map.of("area", "Maths", "topics", List.of("Fractions"))),
                "selection", List.of("Merit"), "preparation", List.of(), "papers", List.of(),
                "officialLinks", List.of(Map.of("label", "Official site", "url", SRC)),
                "sources", List.of(Map.of("label", "Notice", "url", SRC)))));
        e.put("lastVerifiedOn", TODAY.toString());
        e.put("verificationStatus", "VERIFIED");
        e.put("published", true);
        e.putArray("dates");
        e.putArray("notices");
        return e;
    }

    private static void addDate(ObjectNode exam, String kind, LocalDate on, boolean confirmed) {
        ObjectNode d = ((ArrayNode) exam.get("dates")).addObject();
        d.put("cycle", exam.get("currentCycle").asText());
        d.put("kind", kind);
        d.put("label", kind);
        d.put("startsOn", on.toString());
        d.put("confirmed", confirmed);
        d.put("sourceUrl", SRC);
    }

    private ResultActions importExams(ObjectNode... exams) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        ArrayNode list = body.putArray("exams");
        for (ObjectNode e : exams) list.add(e);
        return mockMvc.perform(post("/api/v1/admin/exams/import").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    @Test
    void statusesComeFromConfirmedDatesOnly() throws Exception {
        ObjectNode open = exam("open-test", "OPEN");
        addDate(open, "APPLICATION_START", TODAY.minusDays(5), true);
        addDate(open, "APPLICATION_END", TODAY.plusDays(20), true);
        ObjectNode tentative = exam("tentative-test", "TENT");
        addDate(tentative, "APPLICATION_END", TODAY.plusDays(20), false);
        ObjectNode scheduled = exam("scheduled-test", "SCHED");
        addDate(scheduled, "APPLICATION_END", TODAY.minusDays(20), true);
        addDate(scheduled, "EXAM", TODAY.plusDays(10), true);
        importExams(open, tentative, scheduled).andExpect(status().isOk()).andExpect(jsonPath("$.created").value(3));

        mockMvc.perform(get("/api/v1/exams/open-test"))
                .andExpect(jsonPath("$.exam.status").value("APPLICATIONS_OPEN"))
                .andExpect(jsonPath("$.exam.applicationDeadline").value(TODAY.plusDays(20).toString()))
                .andExpect(jsonPath("$.exam.nextDate.kind").value("APPLICATION_END"));
        mockMvc.perform(get("/api/v1/exams/tentative-test"))
                .andExpect(jsonPath("$.exam.status").value("AWAITING_NOTIFICATION"))
                .andExpect(jsonPath("$.exam.applicationDeadline").doesNotExist())
                .andExpect(jsonPath("$.exam.nextDate").doesNotExist())
                .andExpect(jsonPath("$.exam.currentDates[0].confirmed").value(false));
        mockMvc.perform(get("/api/v1/exams/scheduled-test"))
                .andExpect(jsonPath("$.exam.status").value("EXAM_DATE_ANNOUNCED"));

        // Sorting by deadline puts the only confirmed upcoming deadline first; filtering by status works.
        mockMvc.perform(get("/api/v1/exams").param("sort", "deadline"))
                .andExpect(jsonPath("$.content[0].slug").value("open-test"));
        mockMvc.perform(get("/api/v1/exams").param("status", "AWAITING_NOTIFICATION"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].slug").value("tentative-test"));
    }

    @Test
    void filtersCombine() throws Exception {
        ObjectNode national = exam("national-test", "NAT");
        ObjectNode state = exam("state-test", "JHT");
        state.put("scope", "STATE");
        state.putArray("stateCodes").add("JH");
        ((ArrayNode) state.get("entryClasses")).removeAll().add(9);
        state.put("boarding", "DAY");
        state.put("applicationFree", false);
        importExams(national, state).andExpect(status().isOk());

        // National exams match every state; state exams only their own.
        mockMvc.perform(get("/api/v1/exams").param("state", "JH")).andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/exams").param("state", "DL")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/exams").param("state", "JH").param("entryClass", "9"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].slug").value("state-test"));
        mockMvc.perform(get("/api/v1/exams").param("boarding", "BOARDING")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/exams").param("free", "true").param("entryClass", "9"))
                .andExpect(jsonPath("$.totalElements").value(0));
        // Search matches the state's name for state exams.
        mockMvc.perform(get("/api/v1/exams").param("q", "jharkhand")).andExpect(jsonPath("$.content[0].slug").value("state-test"));
        mockMvc.perform(get("/api/v1/exams").param("size", "1").param("page", "1"))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void unverifiedRecordsCannotBePublishedAndUnpublishedOnesAreHidden() throws Exception {
        ObjectNode draft = exam("draft-test", "DRAFT");
        draft.put("verificationStatus", "DRAFT");
        importExams(draft).andExpect(status().isBadRequest());

        draft.put("published", false);
        importExams(draft).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/exams/draft-test")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/exams")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(patch("/api/v1/admin/exams/draft-test/published").param("value", "true").header("Authorization", editorToken()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/v1/admin/exams/draft-test/verification").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "VERIFIED", "checkedOn", TODAY.toString(), "note", "Checked the notice"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));
        mockMvc.perform(patch("/api/v1/admin/exams/draft-test/published").param("value", "true").header("Authorization", editorToken()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/exams/draft-test")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/exams/draft-test")).andExpect(jsonPath("$.exam.lastVerifiedOn").value(TODAY.toString()));
    }

    @Test
    void reviewFlagsStaleAndPassedTentativeDates() throws Exception {
        ObjectNode e = exam("stale-test", "STALE");
        e.put("lastVerifiedOn", TODAY.minusDays(200).toString());
        addDate(e, "EXAM", TODAY.minusDays(3), false);
        importExams(e).andExpect(status().isOk());

        JsonNode review = body(mockMvc.perform(get("/api/v1/admin/exams").header("Authorization", editorToken()))
                .andExpect(status().isOk()).andReturn());
        List<String> codes = review.get(0).get("flags").findValuesAsText("code");
        org.assertj.core.api.Assertions.assertThat(codes)
                .contains("VERIFICATION_STALE", "TENTATIVE_DATE_PASSED", "AWAITING_NOTIFICATION");
        mockMvc.perform(get("/api/v1/admin/exams")).andExpect(status().isUnauthorized());
    }

    @Test
    void importReplacesDatesAndNoticesAndValidates() throws Exception {
        ObjectNode e = exam("replace-test", "REP");
        addDate(e, "EXAM", TODAY.plusDays(30), true);
        ObjectNode notice = ((ArrayNode) e.get("notices")).addObject();
        notice.put("kind", "NOTIFICATION");
        notice.put("title", "Notification");
        notice.put("publishedOn", TODAY.minusDays(1).toString());
        notice.put("url", SRC);
        importExams(e).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/exams/notices")).andExpect(jsonPath("$[0].examSlug").value("replace-test"));

        ((ArrayNode) e.get("dates")).removeAll();
        ((ArrayNode) e.get("notices")).removeAll();
        importExams(e).andExpect(jsonPath("$.updated").value(1));
        mockMvc.perform(get("/api/v1/exams/replace-test"))
                .andExpect(jsonPath("$.dates.length()").value(0))
                .andExpect(jsonPath("$.notices.length()").value(0));

        ObjectNode badState = exam("bad-state", "BAD");
        badState.put("scope", "STATE"); // no states listed
        importExams(badState).andExpect(status().isBadRequest());
        ObjectNode badUrl = exam("bad-url", "URL");
        addDate(badUrl, "EXAM", TODAY, true);
        ((ObjectNode) badUrl.get("dates").get(0)).put("sourceUrl", "not a url");
        importExams(badUrl).andExpect(status().isBadRequest());
    }

    @Test
    void examGuidesHaveTheirOwnSearchMetadataAndSitemapEntries() throws Exception {
        ObjectNode e = exam("seo-test", "SEO");
        addDate(e, "EXAM", TODAY.plusDays(30), true);
        ObjectNode hidden = exam("hidden-test", "HID");
        hidden.put("published", false);
        importExams(e, hidden).andExpect(status().isOk());

        String head = mockMvc.perform(get("/api/v1/seo/head/exams/seo-test")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(head)
                .contains("<title>SEO: eligibility, dates, pattern and syllabus | India School Finder</title>")
                .contains("/exams/seo-test\" />")
                .contains("(official notice)")
                .contains("BreadcrumbList")
                .doesNotContain("noindex");
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/hidden-test"))
                .andReturn().getResponse().getContentAsString()).contains("noindex");

        String sitemap = mockMvc.perform(get("/sitemaps/pages.xml")).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(sitemap).contains("/exams/seo-test</loc>").doesNotContain("hidden-test")
                .contains("/exams/finder</loc>");

        // Tool pages under /exams are pages in their own right, not unknown exams, and cannot be taken as slugs.
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/finder"))
                .andReturn().getResponse().getContentAsString())
                .contains("Which entrance exams can my child take?").doesNotContain("noindex");
        importExams(exam("calendar", "CAL")).andExpect(status().isBadRequest());

        // Class pages exist only for classes with an exam; state pages are indexed only when the state has its own exam.
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/class/6"))
                .andReturn().getResponse().getContentAsString())
                .contains("Entrance exams for Class VI admission").contains("SEO admit students").doesNotContain("noindex");
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/class/7"))
                .andReturn().getResponse().getContentAsString()).contains("noindex");
        // A class reached only through an admission process (no entrance test) is a page but not indexed.
        ObjectNode process = exam("process-test", "PROC");
        process.put("kind", "SELECTION_PROCESS");
        ((ArrayNode) process.get("entryClasses")).removeAll().add(1);
        importExams(process).andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/class/1"))
                .andReturn().getResponse().getContentAsString()).contains("PROC admit students").contains("noindex");
        ObjectNode stateExam = exam("jh-test", "JHX");
        stateExam.put("scope", "STATE");
        stateExam.putArray("stateCodes").add("JH");
        importExams(stateExam).andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/state/jharkhand"))
                .andReturn().getResponse().getContentAsString())
                .contains("School entrance exams in Jharkhand").contains("JHX for Jharkhand candidates").doesNotContain("noindex");
        org.assertj.core.api.Assertions.assertThat(mockMvc.perform(get("/api/v1/seo/head/exams/state/delhi"))
                .andReturn().getResponse().getContentAsString()).contains("noindex");
        String pages = mockMvc.perform(get("/sitemaps/pages.xml")).andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(pages).contains("/exams/class/6</loc>").contains("/exams/state/jharkhand</loc>")
                .doesNotContain("/exams/state/delhi</loc>").doesNotContain("/exams/class/7</loc>").doesNotContain("/exams/class/1</loc>");
    }

    @Test
    void theShippedCatalogueIsValidAndPublishable() throws Exception {
        JsonNode catalogue = objectMapper.readTree(new ClassPathResource("seed/exams.json").getInputStream());
        mockMvc.perform(post("/api/v1/admin/exams/import").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(catalogue)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(catalogue.get("exams").size()));
        mockMvc.perform(get("/api/v1/exams").param("size", "100"))
                .andExpect(jsonPath("$.totalElements").value(catalogue.get("exams").size()));
        // Every published exam has an official link and a recorded source.
        for (JsonNode exam : catalogue.get("exams")) {
            mockMvc.perform(get("/api/v1/exams/" + exam.get("slug").asText()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.officialLinks[0].url").exists())
                    .andExpect(jsonPath("$.content.sources[0].url").exists())
                    .andExpect(jsonPath("$.exam.lastVerifiedOn").exists());
        }
    }
}
