package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BoardingDirectoryIT extends AbstractIntegrationTest {

    private static final String BOARDING_SOURCE = "https://example.org/school/boarding";

    private Map<String, Object> profile(String type, String system, String exam) {
        Map<String, Object> p = new HashMap<>(Map.of("boardingType", type, "residentialSystem", system,
                "summary", "Fixture summary written from the cited source.", "sourceUrl", BOARDING_SOURCE));
        if (exam != null) {
            p.put("entranceExam", exam);
        }
        return p;
    }

    private void saveProfile(long schoolId, Map<String, Object> body) throws Exception {
        mockMvc.perform(put("/api/v1/admin/schools/{id}/boarding", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"));
    }

    @Test
    void boardingProfilesDriveTheDirectoryFiltersAndCards() throws Exception {
        long sainik = createSchool(school("Fixture Sainik School", Map.of("stateCode", "HR", "genderType", "CO_ED",
                "websiteUrl", "https://sainik.example.org")));
        long military = createSchool(school("Fixture Military School", Map.of("stateCode", "RJ")));
        long privateBoarding = createSchool(school("Fixture Hill Boarding School", Map.of("stateCode", "UK", "schoolType", "PRIVATE")));
        long day = createSchool(school("Fixture Day School", Map.of()));
        saveProfile(sainik, profile("FULL_BOARDING", "SAINIK", "AISSEE"));
        saveProfile(military, profile("FULL_BOARDING", "MILITARY_SCHOOL", "RMS_CET"));
        saveProfile(privateBoarding, profile("DAY_CUM_BOARDING", "PRIVATE_BOARDING", "SCHOOL_TEST"));

        // Only schools with a profile are boarding schools; the profile marks the hostel as stated.
        mockMvc.perform(get("/api/v1/schools/search").param("boarding", "true").param("sortBy", "name"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[*].name", containsInAnyOrder("Fixture Sainik School",
                        "Fixture Military School", "Fixture Hill Boarding School")));
        mockMvc.perform(get("/api/v1/schools/search").param("boarding", "false"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Fixture Day School"));

        // Defence-oriented systems as one filter, combined with a state.
        mockMvc.perform(get("/api/v1/schools/search").param("residentialSystem", "SAINIK,MILITARY_SCHOOL,MILITARY_COLLEGE"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/schools/search").param("residentialSystem", "SAINIK,MILITARY_SCHOOL")
                        .param("state", "Rajasthan"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Fixture Military School"));
        mockMvc.perform(get("/api/v1/schools/search").param("entranceExam", "AISSEE"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools/search").param("boardingType", "DAY_CUM_BOARDING"))
                .andExpect(jsonPath("$.content[0].name").value("Fixture Hill Boarding School"));

        // Cards carry the boarding facts; day schools carry none.
        mockMvc.perform(get("/api/v1/schools/search").param("entranceExam", "AISSEE"))
                .andExpect(jsonPath("$.content[0].boardingType").value("FULL_BOARDING"))
                .andExpect(jsonPath("$.content[0].residentialSystem").value("SAINIK"))
                .andExpect(jsonPath("$.content[0].boardingSummary").value("Fixture summary written from the cited source."))
                .andExpect(jsonPath("$.content[0].genderType").value("CO_ED"))
                .andExpect(jsonPath("$.content[0].websiteUrl").value("https://sainik.example.org"))
                .andExpect(jsonPath("$.content[0].hasHostel").value(true));
        mockMvc.perform(get("/api/v1/schools/{id}", day))
                .andExpect(jsonPath("$.boarding").value(nullValue()));

        // Profile page data: system flags are derived, not entered.
        mockMvc.perform(get("/api/v1/schools/{id}", sainik))
                .andExpect(jsonPath("$.boarding.governmentSystem").value(true))
                .andExpect(jsonPath("$.boarding.defenceOriented").value(true))
                .andExpect(jsonPath("$.boarding.sourceUrl").value(BOARDING_SOURCE));
        mockMvc.perform(get("/api/v1/schools/{id}", privateBoarding))
                .andExpect(jsonPath("$.boarding.governmentSystem").value(false));

        mockMvc.perform(get("/api/v1/boarding/systems"))
                .andExpect(jsonPath("$.SAINIK").value(1))
                .andExpect(jsonPath("$.MILITARY_SCHOOL").value(1))
                .andExpect(jsonPath("$.PRIVATE_BOARDING").value(1))
                .andExpect(jsonPath("$.NAVODAYA").doesNotExist());

        // Landing-page counts: day schools are not counted, and an unstated gender is not guessed.
        mockMvc.perform(get("/api/v1/boarding/stats"))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.byState.HR").value(1))
                .andExpect(jsonPath("$.byState.DL").doesNotExist())
                .andExpect(jsonPath("$.byGender.CO_ED").value(1))
                .andExpect(jsonPath("$.genderNotStated").value(2))
                .andExpect(jsonPath("$.bySystem.SAINIK").value(1));
    }

    /** Verified evidence for four criteria (75%): enough for a definitive rank. */
    private void fullyEvidenced(long schoolId, int raw) throws Exception {
        String year = com.indiaschoolfinder.util.AcademicYears.of(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")));
        for (String c : java.util.List.of("ACADEMIC_PERFORMANCE", "TEACHING_QUALITY", "INFRASTRUCTURE", "SAFETY_WELLBEING")) {
            String response = mockMvc.perform(post("/api/v1/admin/schools/{id}/criterion-scores", schoolId)
                            .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("criterionCode", c, "academicYear", year, "rawScore", raw, "maxScore", 100,
                                    "sourceUrl", "https://example.org/evidence/" + c))))
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
            long scoreId = objectMapper.readTree(response).get("id").asLong();
            mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", schoolId).header("Authorization", editorToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("entityType", "CRITERION_SCORE", "entityId", scoreId, "status", "VERIFIED",
                                    "sourceUrl", "https://example.org/evidence"))))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void boardingRankingsExcludeDaySchoolsAndCompareWithinASystem() throws Exception {
        long sainik = createSchool(school("Fixture Ranked Sainik School", Map.of()));
        long privateBoarding = createSchool(school("Fixture Ranked Hill School", Map.of()));
        long day = createSchool(school("Fixture Ranked Day School", Map.of()));
        saveProfile(sainik, profile("FULL_BOARDING", "SAINIK", "AISSEE"));
        saveProfile(privateBoarding, profile("FULL_BOARDING", "PRIVATE_BOARDING", "SCHOOL_TEST"));
        fullyEvidenced(sainik, 70);
        fullyEvidenced(privateBoarding, 80);
        fullyEvidenced(day, 95);

        mockMvc.perform(get("/api/v1/rankings").param("boarding", "true"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].schoolName").value("Fixture Ranked Hill School"))
                .andExpect(jsonPath("$.content[0].scopePosition").value(1))
                .andExpect(jsonPath("$.content[0].rankPosition").value(2)); // all-India position, behind the day school
        mockMvc.perform(get("/api/v1/rankings").param("residentialSystem", "SAINIK,MILITARY_SCHOOL"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].schoolName").value("Fixture Ranked Sainik School"))
                .andExpect(jsonPath("$.content[0].scopePosition").value(1));
        mockMvc.perform(get("/api/v1/rankings")).andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void profilesAreVerifiedLikeOtherRecordsAndResetWhenChanged() throws Exception {
        long s = createSchool(school("Fixture Residential School", Map.of()));
        saveProfile(s, profile("FULL_BOARDING", "STATE_RESIDENTIAL", "NETARHAT"));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "BOARDING", "status", "VERIFIED", "sourceUrl", BOARDING_SOURCE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousStatus").value("UNVERIFIED"));
        mockMvc.perform(get("/api/v1/schools/{id}", s))
                .andExpect(jsonPath("$.boarding.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.boarding.lastVerifiedDate").isNotEmpty());

        // Re-importing the same data keeps the verification...
        mockMvc.perform(put("/api/v1/admin/schools/{id}/boarding", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(profile("FULL_BOARDING", "STATE_RESIDENTIAL", "NETARHAT"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));
        // ...and any change makes the profile unverified again.
        saveProfile(s, profile("WEEKLY_BOARDING", "STATE_RESIDENTIAL", "NETARHAT"));
        mockMvc.perform(get("/api/v1/schools/{id}", s))
                .andExpect(jsonPath("$.boarding.boardingType").value("WEEKLY_BOARDING"))
                .andExpect(jsonPath("$.boarding.lastVerifiedDate").value(nullValue()));
    }

    @Test
    void profileWritesAreValidatedAndRequireAnEditor() throws Exception {
        long s = createSchool(school("Fixture Validation School", Map.of()));
        mockMvc.perform(put("/api/v1/admin/schools/{id}/boarding", s).contentType(MediaType.APPLICATION_JSON)
                        .content(json(profile("FULL_BOARDING", "SAINIK", null))))
                .andExpect(status().isUnauthorized());
        Map<String, Object> noSource = profile("FULL_BOARDING", "SAINIK", null);
        noSource.remove("sourceUrl");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/boarding", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(noSource)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/admin/schools/{id}/boarding", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(profile("FULL_BOARDING", "BOARDING_CASTLE", null))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/schools/search").param("residentialSystem", "NOT_A_SYSTEM"))
                .andExpect(status().isBadRequest());
    }
}
