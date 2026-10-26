package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.indiaschoolfinder.util.AcademicYears;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdmissionApiIT extends AbstractIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    private long schoolId;

    @BeforeEach
    void school() throws Exception {
        schoolId = createSchool(school("Admissions Test School", Map.of()));
    }

    private Map<String, Object> cycle(String category, LocalDate start, LocalDate end) {
        Map<String, Object> m = new HashMap<>();
        m.put("classCode", "NURSERY");
        m.put("academicYear", AcademicYears.of(TODAY.plusYears(1))); // admissions are usually for next year
        m.put("category", category);
        m.put("applicationStartDate", start == null ? null : start.toString());
        m.put("applicationEndDate", end == null ? null : end.toString());
        m.put("ageEligibility", "As per the Directorate of Education notification");
        m.put("officialNotificationUrl", "https://www.edudel.nic.in/");
        m.put("sourceUrl", "https://www.edudel.nic.in/");
        m.put("requirements", List.of(
                Map.of("type", "DOCUMENT", "description", "Birth certificate"),
                Map.of("type", "SELECTION_CRITERION", "description", "Neighbourhood (distance)", "points", 40)));
        return m;
    }

    private ResultActions post(Map<String, Object> body) throws Exception {
        return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/v1/admin/schools/{id}/admissions", schoolId).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    @Test
    void statusIsDerivedFromDatesAndCategoriesAreKeptSeparate() throws Exception {
        post(cycle("GENERAL", TODAY.minusDays(2), TODAY.plusDays(10)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.requirements.length()").value(2))
                .andExpect(jsonPath("$.requirements[1].points").value(40));
        post(cycle("EWS_DG", TODAY.plusDays(20), TODAY.plusDays(40)))
                .andExpect(jsonPath("$.status").value("UPCOMING"));
        post(cycle("CWSN", null, null))
                .andExpect(jsonPath("$.status").value("NOT_ANNOUNCED"));

        mockMvc.perform(get("/api/v1/schools/{id}/admissions", schoolId))
                .andExpect(jsonPath("$.length()").value(3));
        mockMvc.perform(get("/api/v1/admissions").param("category", "EWS_DG"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/admissions/upcoming"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].category").value("GENERAL")); // nearest deadline first
        mockMvc.perform(get("/api/v1/schools").param("admissionStatus", "OPEN"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools").param("admissionStatus", "CLOSED"))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void aNetworksIdenticalNationalCyclesCanBeLeftOutOfTheList() throws Exception {
        post(cycle("GENERAL", TODAY.minusDays(2), TODAY.plusDays(10))).andExpect(status().isCreated());
        long jnv = createSchool(school("Fixture Navodaya Vidyalaya", Map.of("network", "JAWAHAR_NAVODAYA_VIDYALAYA",
                "management", "CENTRAL_GOVERNMENT", "schoolType", "GOVERNMENT")));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/admin/schools/{id}/admissions", jnv).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(cycle("GENERAL", null, TODAY.minusDays(5)))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/admissions")).andExpect(jsonPath("$.totalElements").value(2));
        // Schools without a network (null) are kept; only the excluded network's cycles are left out.
        mockMvc.perform(get("/api/v1/admissions").param("excludeNetwork", "JAWAHAR_NAVODAYA_VIDYALAYA"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].schoolId").value(schoolId));
    }

    @Test
    void administratorCanOverrideStatusWithAReason() throws Exception {
        Map<String, Object> extended = cycle("GENERAL", TODAY.minusDays(30), TODAY.minusDays(1));
        extended.put("statusOverride", "OPEN");
        post(extended).andExpect(status().isBadRequest()); // reason is mandatory

        extended.put("statusOverrideReason", "Deadline extended by official notice");
        post(extended)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.statusOverridden").value(true));

        // The nightly refresh must not undo an override.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/admin/admissions/refresh-status").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.changed").value(0));
    }

    @Test
    void invalidDatesAndMissingSourceAreRejected() throws Exception {
        post(cycle("GENERAL", TODAY.plusDays(10), TODAY)).andExpect(status().isBadRequest());
        Map<String, Object> noSource = cycle("GENERAL", TODAY, TODAY.plusDays(5));
        noSource.remove("sourceUrl");
        post(noSource).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").value("sourceUrl"));
    }

    @Test
    void refreshClosesCyclesWhoseDeadlinePassed() throws Exception {
        post(cycle("GENERAL", TODAY.minusDays(5), TODAY.plusDays(5))).andExpect(jsonPath("$.status").value("OPEN"));
        jdbc.update("UPDATE admission_schedule SET application_start_date = ?, application_end_date = ?",
                TODAY.minusDays(20), TODAY.minusDays(10));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/admin/admissions/refresh-status").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.changed").value(1));
        mockMvc.perform(get("/api/v1/admissions/school/{id}", schoolId))
                .andExpect(jsonPath("$[0].status").value("CLOSED"));
    }
}
