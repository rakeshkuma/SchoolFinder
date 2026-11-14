package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.indiaschoolfinder.util.AcademicYears;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The updates feed: editorial notices only once published and until they expire, plus open admissions derived from cycles. */
class UpdatesIT extends AbstractIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Kolkata"));

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE site_update RESTART IDENTITY");
    }

    private Map<String, Object> job() {
        Map<String, Object> m = new HashMap<>();
        m.put("category", "JOB");
        m.put("title", "Fixture teacher recruitment notice");
        m.put("summary", "Applications invited for fixture teaching posts; see the official notice for posts and eligibility.");
        m.put("publishedOn", TODAY.minusDays(1).toString());
        m.put("eventDate", TODAY.plusDays(5).toString());
        m.put("eventLabel", "Last date");
        m.put("deadline", true);
        m.put("sourceUrl", "https://example.gov.in/recruitment.pdf");
        m.put("sourceName", "Example board");
        m.put("verificationStatus", "VERIFIED");
        m.put("priority", 0);
        return m;
    }

    private long create(Map<String, Object> body) throws Exception {
        return body(mockMvc.perform(post("/api/v1/admin/updates").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
    }

    private List<String> titles(String query) throws Exception {
        JsonNode page = body(mockMvc.perform(get("/api/v1/updates" + query)).andExpect(status().isOk()).andReturn());
        List<String> out = new ArrayList<>();
        page.get("content").forEach(n -> out.add(n.get("title").asText()));
        return out;
    }

    @Test
    void anEditorialUpdateAppearsOnlyWhilePublishedAndShowsItsDeadline() throws Exception {
        mockMvc.perform(post("/api/v1/admin/updates").contentType(MediaType.APPLICATION_JSON).content(json(job())))
                .andExpect(status().isUnauthorized());
        long id = create(job());
        assertThat(titles("?category=JOB")).doesNotContain("Fixture teacher recruitment notice"); // a draft

        mockMvc.perform(post("/api/v1/admin/updates/" + id + "/publish").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        JsonNode item = body(mockMvc.perform(get("/api/v1/updates").param("category", "JOB")).andReturn()).at("/content/0");
        assertThat(item.get("title").asText()).isEqualTo("Fixture teacher recruitment notice");
        assertThat(item.get("badge").asText()).isEqualTo("CLOSING_SOON");
        assertThat(item.get("origin").asText()).isEqualTo("EDITORIAL");
        assertThat(item.get("verified").asBoolean()).isTrue();
        assertThat(item.get("actionLabel").asText()).isEqualTo("View Jobs");
        assertThat(titles("?category=ADMISSION")).doesNotContain("Fixture teacher recruitment notice");

        Map<String, Object> expired = job();
        expired.put("expiresOn", TODAY.minusDays(1).toString());
        expired.put("publishedOn", TODAY.minusDays(3).toString());
        mockMvc.perform(put("/api/v1/admin/updates/" + id).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(expired))).andExpect(status().isOk());
        assertThat(titles("?category=JOB")).doesNotContain("Fixture teacher recruitment notice");

        mockMvc.perform(put("/api/v1/admin/updates/" + id).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(job()))).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/updates/" + id + "/archive").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
        assertThat(titles("?category=JOB")).isEmpty();
    }

    @Test
    void anUpdateWithoutAnOfficialSourceOrWithAnOutsideLinkIsRefused() throws Exception {
        Map<String, Object> noSource = job();
        noSource.remove("sourceUrl");
        mockMvc.perform(post("/api/v1/admin/updates").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(noSource))).andExpect(status().isBadRequest());
        Map<String, Object> outside = job();
        outside.put("linkPath", "//evil.example/page");
        mockMvc.perform(post("/api/v1/admin/updates").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(outside))).andExpect(status().isBadRequest());
        Map<String, Object> undatedDeadline = job();
        undatedDeadline.remove("eventDate");
        mockMvc.perform(post("/api/v1/admin/updates").header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(undatedDeadline))).andExpect(status().isBadRequest());
    }

    @Test
    void openAdmissionsAppearGroupedByTheirNotice() throws Exception {
        long schoolId = createSchool(school("Fixture Updates School", Map.of()));
        Map<String, Object> cycle = new HashMap<>();
        cycle.put("classCode", "NURSERY");
        cycle.put("academicYear", AcademicYears.of(TODAY.plusYears(1)));
        cycle.put("category", "GENERAL");
        cycle.put("applicationStartDate", TODAY.minusDays(3).toString());
        cycle.put("applicationEndDate", TODAY.plusDays(6).toString());
        cycle.put("officialNotificationUrl", "https://www.edudel.nic.in/fixture-notice.pdf");
        cycle.put("sourceUrl", "https://www.edudel.nic.in/fixture-notice.pdf");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/admissions", schoolId).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(cycle))).andExpect(status().isCreated());

        JsonNode page = body(mockMvc.perform(get("/api/v1/updates").param("category", "ADMISSION")).andReturn());
        JsonNode item = null;
        for (JsonNode n : page.get("content")) {
            if (n.get("title").asText().startsWith("Fixture Updates School")) {
                item = n;
            }
        }
        assertThat(item).isNotNull();
        assertThat(item.get("badge").asText()).isEqualTo("CLOSING_SOON");
        assertThat(item.get("eventDate").asText()).isEqualTo(TODAY.plusDays(6).toString());
        assertThat(item.get("sourceUrl").asText()).isEqualTo("https://www.edudel.nic.in/fixture-notice.pdf");
        assertThat(item.get("linkPath").asText()).endsWith("?tab=admissions");
    }

    @Test
    void oneSchoolsSeparateNoticesWithTheSameDatesReadAsOneUpdate() throws Exception {
        long schoolId = createSchool(school("Fixture Two Notices School", Map.of()));
        for (String[] c : new String[][] {{"IX", "https://example.gov.in/class-ix.pdf"}, {"XI", "https://example.gov.in/class-xi.pdf"}}) {
            Map<String, Object> cycle = new HashMap<>();
            cycle.put("classCode", c[0]);
            cycle.put("academicYear", AcademicYears.of(TODAY.plusYears(1)));
            cycle.put("category", "GENERAL");
            cycle.put("applicationStartDate", TODAY.minusDays(3).toString());
            cycle.put("applicationEndDate", TODAY.plusDays(30).toString());
            cycle.put("officialNotificationUrl", c[1]);
            cycle.put("sourceUrl", c[1]);
            mockMvc.perform(post("/api/v1/admin/schools/{id}/admissions", schoolId).header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json(cycle))).andExpect(status().isCreated());
        }
        List<String> mine = titles("?category=ADMISSION&size=50").stream().filter(t -> t.startsWith("Fixture Two Notices School")).toList();
        assertThat(mine).hasSize(1);
        assertThat(mine.get(0)).contains("Classes IX & XI");
    }
}
