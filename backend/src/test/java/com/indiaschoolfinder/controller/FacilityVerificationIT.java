package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FacilityVerificationIT extends AbstractIntegrationTest {

    private static final String FACILITY_SOURCE = "https://example.org/school/facilities";

    private long addFacility(long schoolId, String category, String name) throws Exception {
        String response = mockMvc.perform(post("/api/v1/admin/schools/{id}/facilities", schoolId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("category", category, "name", name, "available", true, "sourceUrl", FACILITY_SOURCE))))
                .andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private Map<String, Object> batch(List<Long> ids) {
        return Map.of("entityType", "FACILITY", "entityIds", ids, "status", "VERIFIED", "sourceUrl", FACILITY_SOURCE,
                "notes", "Checked against the school's facilities page");
    }

    @Test
    void queueListsSchoolsWithUnverifiedFacilitiesAndBatchVerificationClearsThem() throws Exception {
        long delhi = createSchool(school("Alpha Delhi School", Map.of("stateCode", "DL", "websiteUrl", "https://alpha.example.org")));
        long bihar = createSchool(school("Beta Bihar School", Map.of("stateCode", "BR")));
        createSchool(school("Gamma No Facilities School", Map.of()));
        List<Long> delhiFacilities = List.of(addFacility(delhi, "LIBRARY", "Library"), addFacility(delhi, "LABORATORY", "Lab"),
                addFacility(delhi, "COMPUTER", "Computer lab"));
        addFacility(bihar, "SPORTS", "Playground");

        mockMvc.perform(get("/api/v1/admin/schools/facility-verification-queue").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].schoolName").value("Alpha Delhi School"))
                .andExpect(jsonPath("$.content[0].unverifiedCount").value(3))
                .andExpect(jsonPath("$.content[0].websiteUrl").value("https://alpha.example.org"))
                .andExpect(jsonPath("$.content[0].facilities.length()").value(3))
                .andExpect(jsonPath("$.content[1].stateName").value("Bihar"));
        mockMvc.perform(get("/api/v1/admin/schools/facility-verification-queue").param("state", "Bihar")
                        .header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].schoolName").value("Beta Bihar School"));

        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", delhi).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(batch(delhiFacilities))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].previousStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$[0].newStatus").value("VERIFIED"));

        // Each record has its own history entry; the school leaves the queue.
        mockMvc.perform(get("/api/v1/admin/schools/{id}/verification-history", delhi).header("Authorization", editorToken()))
                .andExpect(jsonPath("$.length()").value(3));
        mockMvc.perform(get("/api/v1/admin/schools/facility-verification-queue").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(1));
        // Rankings were recalculated: the verified checklist now counts as verified evidence.
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", delhi))
                .andExpect(jsonPath("$.siteRanking.breakdown[2].verified").value(true))
                .andExpect(jsonPath("$.siteRanking.verifiedCoveragePercent").value(15.00));
    }

    @Test
    void aBatchWithAnotherSchoolsRecordChangesNothing() throws Exception {
        long a = createSchool(school("School A", Map.of()));
        long b = createSchool(school("School B", Map.of()));
        long own = addFacility(a, "LIBRARY", "Library");
        long foreign = addFacility(b, "LIBRARY", "Library");

        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", a).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(batch(List.of(own, foreign)))))
                .andExpect(status().isNotFound());
        // Rolled back: the school's own facility is still unverified and no history was written.
        mockMvc.perform(get("/api/v1/schools/{id}/facilities", a))
                .andExpect(jsonPath("$[0].verificationStatus").value("UNVERIFIED"));
        mockMvc.perform(get("/api/v1/admin/schools/{id}/verification-history", a).header("Authorization", editorToken()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void batchRequestsAreValidatedAndRequireAnEditor() throws Exception {
        long s = createSchool(school("Validated School", Map.of()));
        long f = addFacility(s, "LIBRARY", "Library");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", s)
                        .contentType(MediaType.APPLICATION_JSON).content(json(batch(List.of(f)))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/schools/facility-verification-queue"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(batch(List.of()))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "SCHOOL", "entityIds", List.of(s), "status", "VERIFIED",
                                "sourceUrl", FACILITY_SOURCE))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify/batch", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "FACILITY", "entityIds", List.of(f), "status", "VERIFIED",
                                "sourceUrl", "not-a-url"))))
                .andExpect(status().isBadRequest());
    }
}
