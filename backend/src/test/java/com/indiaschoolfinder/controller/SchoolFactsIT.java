package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SchoolFactsIT extends AbstractIntegrationTest {

    private static final Map<String, Object> SITE = Map.of("url", "https://school.example.org/about",
            "retrievedDate", "2026-10-25", "note", "About page: 'Classes VI to XII'");
    private static final Map<String, Object> OSM = Map.of("url", "https://www.openstreetmap.org/way/1",
            "retrievedDate", "2026-10-25");

    private org.springframework.test.web.servlet.ResultActions patchFacts(long id, Object body, String token) throws Exception {
        var request = patch("/api/v1/admin/schools/{id}/facts", id).contentType(MediaType.APPLICATION_JSON).content(json(body));
        return mockMvc.perform(token == null ? request : request.header("Authorization", token));
    }

    @Test
    void addsSourcedFactsWithoutTouchingTheRestOfTheProfile() throws Exception {
        long id = createSchool(school("Fixture Hill School", Map.of("stateCode", "UK", "websiteUrl", "https://school.example.org",
                "pinCode", "263002")));

        patchFacts(id, Map.of(
                "classes", Map.of("codes", List.of("vi", "VII", "VIII", "IX", "X", "XI", "XII"), "source", SITE),
                "location", Map.of("latitude", 29.38, "longitude", 79.45, "source", OSM),
                "city", Map.of("name", "Nainital", "source", SITE)), editorToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classesOffered.length()").value(7))
                .andExpect(jsonPath("$.classesOffered[0].code").value("VI"))
                .andExpect(jsonPath("$.latitude").value(29.38))
                .andExpect(jsonPath("$.city").value("Nainital"))
                .andExpect(jsonPath("$.websiteUrl").value("https://school.example.org"))
                .andExpect(jsonPath("$.pinCode").value("263002"))
                .andExpect(jsonPath("$.sourceUrl").value(SOURCE))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"));

        mockMvc.perform(get("/api/v1/schools/{id}/fact-sources", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].fact").value("CLASSES"))
                .andExpect(jsonPath("$[0].sourceUrl").value("https://school.example.org/about"))
                .andExpect(jsonPath("$[0].note").value("About page: 'Classes VI to XII'"))
                .andExpect(jsonPath("$[1].fact").value("LOCATION"))
                .andExpect(jsonPath("$[1].sourceUrl").value("https://www.openstreetmap.org/way/1"));

        // Only the parts sent are changed: a location-only update keeps the classes.
        patchFacts(id, Map.of("location", Map.of("latitude", 29.39, "longitude", 79.46, "source", OSM)), editorToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.classesOffered.length()").value(7))
                .andExpect(jsonPath("$.latitude").value(29.39));
    }

    @Test
    void clearRetractsAWrongFactAndItsSource() throws Exception {
        long id = createSchool(school("Fixture Ridge School", Map.of()));
        patchFacts(id, Map.of("location", Map.of("latitude", 29.38, "longitude", 79.45, "source", OSM),
                "city", Map.of("name", "Nainital", "source", SITE)), editorToken())
                .andExpect(status().isOk());

        patchFacts(id, Map.of("clear", List.of("LOCATION")), editorToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").doesNotExist())
                .andExpect(jsonPath("$.longitude").doesNotExist())
                .andExpect(jsonPath("$.city").value("Nainital"));
        mockMvc.perform(get("/api/v1/schools/{id}/fact-sources", id))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].fact").value("CITY"));

        // Setting and clearing the same fact at once is contradictory.
        patchFacts(id, Map.of("clear", List.of("CITY"), "city", Map.of("name", "Bhowali", "source", SITE)), editorToken())
                .andExpect(status().isBadRequest());
    }

    @Test
    void classesAndLocationMoveASchoolUpTheRecommendedOrder() throws Exception {
        createSchool(school("Aardvark Plain School", Map.of()));
        long documented = createSchool(school("Zebra Sourced School", Map.of()));
        mockMvc.perform(post("/api/v1/admin/rankings/recalculate").header("Authorization", adminToken()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/schools/search"))
                .andExpect(jsonPath("$.content[0].name").value("Aardvark Plain School"));

        patchFacts(documented, Map.of("classes", Map.of("codes", List.of("XI", "XII"), "source", SITE)), editorToken())
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/schools/search"))
                .andExpect(jsonPath("$.content[0].name").value("Zebra Sourced School"))
                .andExpect(jsonPath("$.content[0].classesFrom").value("Class XI"))
                .andExpect(jsonPath("$.content[0].classesTo").value("Class XII"));
    }

    @Test
    void rejectsFactsWithoutASourceUnknownClassesAndAnonymousCallers() throws Exception {
        long id = createSchool(school("Fixture Plain School", Map.of()));

        patchFacts(id, Map.of("classes", Map.of("codes", List.of("VI"))), editorToken())
                .andExpect(status().isBadRequest());
        patchFacts(id, Map.of("classes", Map.of("codes", List.of("VI", "CLASS_13"), "source", SITE)), editorToken())
                .andExpect(status().isBadRequest());
        patchFacts(id, Map.of("location", Map.of("latitude", 51.5, "longitude", -0.1, "source", OSM)), editorToken())
                .andExpect(status().isBadRequest()); // outside India
        patchFacts(id, Map.of(), editorToken())
                .andExpect(status().isBadRequest());
        patchFacts(id, Map.of("city", Map.of("name", "Patna", "source", SITE)), null)
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/schools/{id}/fact-sources", id))
                .andExpect(jsonPath("$.length()").value(0));
    }
}
