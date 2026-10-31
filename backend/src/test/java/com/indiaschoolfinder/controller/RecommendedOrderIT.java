package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendedOrderIT extends AbstractIntegrationTest {

    private void registerPhoto(long schoolId, String permission, boolean illustrative) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("imageType", "CAMPUS", "url", "https://example.org/campus-" + schoolId + ".jpg",
                "altText", "Campus", "license", "CC BY-SA 4.0", "attributionText", "Example, CC BY-SA 4.0",
                "permissionStatus", permission, "sourceUrl", "https://example.org/file", "illustrative", illustrative));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void defaultOrderPutsBestDocumentedSchoolsFirstAndIsStableAcrossPages() throws Exception {
        createSchool(school("Aardvark Undocumented School", Map.of()));
        long photographed = createSchool(school("Mango Photographed School", Map.of()));
        createSchool(school("Zebra Documented School", Map.of("websiteUrl", "https://zebra.example.org", "phone", "011-2345678",
                "addressLine", "1 Example Road", "pinCode", "110001")));
        long illustrated = createSchool(school("Banyan Illustrated School", Map.of()));
        long pending = createSchool(school("Cedar Pending Photo School", Map.of()));
        registerPhoto(photographed, "OPEN_LICENCE", false);
        registerPhoto(illustrated, "OWN_WORK", true); // an illustration is not a photograph of the school
        registerPhoto(pending, "PENDING", false);     // not cleared for publication
        mockMvc.perform(post("/api/v1/admin/rankings/recalculate").header("Authorization", adminToken()))
                .andExpect(status().isOk());

        // 15 + 15 points tie, broken by name; undocumented schools follow in name order.
        mockMvc.perform(get("/api/v1/schools/search"))
                .andExpect(jsonPath("$.content[0].name").value("Mango Photographed School"))
                .andExpect(jsonPath("$.content[1].name").value("Zebra Documented School"))
                .andExpect(jsonPath("$.content[2].name").value("Aardvark Undocumented School"))
                .andExpect(jsonPath("$.content[3].name").value("Banyan Illustrated School"))
                .andExpect(jsonPath("$.content[4].name").value("Cedar Pending Photo School"));

        // Pages partition the same order: no duplicates, nothing skipped.
        mockMvc.perform(get("/api/v1/schools/search").param("size", "2").param("page", "1"))
                .andExpect(jsonPath("$.content[0].name").value("Aardvark Undocumented School"))
                .andExpect(jsonPath("$.content[1].name").value("Banyan Illustrated School"))
                .andExpect(jsonPath("$.totalPages").value(3));

        // Explicit sorts still work.
        mockMvc.perform(get("/api/v1/schools/search").param("sortBy", "name"))
                .andExpect(jsonPath("$.content[0].name").value("Aardvark Undocumented School"));
    }

    @Test
    void locationOrderGoesByStateDistrictAndTownNameWithUnknownPlacesLast() throws Exception {
        createSchool(school("Alpha Delhi School", Map.of("city", "New Delhi")));
        createSchool(school("Beta Sasaram School", Map.of("stateCode", "BR", "district", "Rohtas", "city", "Sasaram")));
        createSchool(school("Gamma Dinara School", Map.of("stateCode", "BR", "district", "Rohtas", "city", "Dinara")));
        createSchool(school("Delta Rohtas School", Map.of("stateCode", "BR", "district", "Rohtas")));
        createSchool(school("Epsilon Ara School", Map.of("stateCode", "BR", "district", "Bhojpur", "city", "Ara")));

        // Bihar before Delhi (state names, not codes); Bhojpur before Rohtas; Dinara before Sasaram; no town last.
        mockMvc.perform(get("/api/v1/schools/search").param("sortBy", "location"))
                .andExpect(jsonPath("$.content[0].name").value("Epsilon Ara School"))
                .andExpect(jsonPath("$.content[1].name").value("Gamma Dinara School"))
                .andExpect(jsonPath("$.content[2].name").value("Beta Sasaram School"))
                .andExpect(jsonPath("$.content[3].name").value("Delta Rohtas School"))
                .andExpect(jsonPath("$.content[4].name").value("Alpha Delhi School"));
    }

    @Test
    void statesTakeTurnsWithinAScoreTierWithoutRepeatsAcrossPages() throws Exception {
        createSchool(school("Alpha Delhi School", Map.of()));
        createSchool(school("Beta Delhi School", Map.of()));
        createSchool(school("Gamma Delhi School", Map.of()));
        createSchool(school("Delta Lucknow School", Map.of("stateCode", "UP")));
        createSchool(school("Epsilon Lucknow School", Map.of("stateCode", "UP")));
        createSchool(school("Zeta Patna School", Map.of("stateCode", "BR")));
        mockMvc.perform(post("/api/v1/admin/rankings/recalculate").header("Authorization", adminToken()))
                .andExpect(status().isOk());

        // Same (zero) score: round 1 = each state's first school by name, round 2 = each state's second, ...
        mockMvc.perform(get("/api/v1/schools/search").param("size", "4"))
                .andExpect(jsonPath("$.content[0].name").value("Alpha Delhi School"))
                .andExpect(jsonPath("$.content[1].name").value("Delta Lucknow School"))
                .andExpect(jsonPath("$.content[2].name").value("Zeta Patna School"))
                .andExpect(jsonPath("$.content[3].name").value("Beta Delhi School"));
        mockMvc.perform(get("/api/v1/schools/search").param("size", "4").param("page", "1"))
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].name").value("Epsilon Lucknow School"))
                .andExpect(jsonPath("$.content[1].name").value("Gamma Delhi School"));

        // Filtered to one state, the order is simply by name.
        mockMvc.perform(get("/api/v1/schools/search").param("state", "DL"))
                .andExpect(jsonPath("$.content[0].name").value("Alpha Delhi School"))
                .andExpect(jsonPath("$.content[1].name").value("Beta Delhi School"))
                .andExpect(jsonPath("$.content[2].name").value("Gamma Delhi School"));
    }

    @Test
    void theOrderRulesArePublished() throws Exception {
        mockMvc.perform(get("/api/v1/directory/order-rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[0].points").value(40));
    }
}
