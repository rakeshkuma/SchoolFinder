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

/** Medium, gender and facility filters, featured schools, location shortcuts and the coverage dashboard. */
class DirectoryApiIT extends AbstractIntegrationTest {

    private void addFacility(long schoolId, String category, String name, Boolean available) throws Exception {
        Map<String, Object> f = new HashMap<>(Map.of("category", category, "name", name, "sourceUrl", "https://example.org/facilities"));
        f.put("available", available);
        mockMvc.perform(post("/api/v1/admin/schools/{id}/facilities", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(f)))
                .andExpect(status().isCreated());
    }

    private void addImage(long schoolId, String permission, boolean illustrative) throws Exception {
        Map<String, Object> image = new HashMap<>(Map.of("imageType", "CAMPUS", "url", "https://example.org/" + schoolId + ".jpg",
                "altText", "Campus", "license", "CC0", "sourceUrl", "https://example.org/gallery",
                "permissionStatus", permission, "illustrative", illustrative));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isCreated());
    }

    @Test
    void filtersByMediumGenderAndStatedFacilities() throws Exception {
        long english = createSchool(school("English Medium School", Map.of("mediumOfInstruction", "English, Hindi",
                "genderType", "GIRLS")));
        long hindi = createSchool(school("Hindi Medium School", Map.of("mediumOfInstruction", "Hindi", "genderType", "CO_ED")));
        addFacility(english, "LIBRARY", "Central library", true);
        addFacility(english, "LABORATORY", "Physics lab", true);
        addFacility(hindi, "LIBRARY", "Library", true);
        addFacility(hindi, "LABORATORY", "Lab (planned)", null); // not stated as available

        mockMvc.perform(get("/api/v1/schools").param("medium", "english"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("English Medium School"));
        mockMvc.perform(get("/api/v1/schools").param("genderType", "CO_ED"))
                .andExpect(jsonPath("$.content[0].name").value("Hindi Medium School"));
        mockMvc.perform(get("/api/v1/schools").param("facility", "LIBRARY"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/schools").param("facility", "LIBRARY,LABORATORY"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("English Medium School"));
        mockMvc.perform(get("/api/v1/schools").param("facility", "SWIMMING_POOL"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void featuredListsOnlySchoolsWithAPublishableRealPhoto() throws Exception {
        long photo = createSchool(school("Photo School", Map.of()));
        long pending = createSchool(school("Pending Photo School", Map.of()));
        long drawing = createSchool(school("Illustrated School", Map.of()));
        long upSchool = createSchool(school("Lucknow Photo School", Map.of("stateCode", "UP")));
        createSchool(school("No Photo School", Map.of()));
        addImage(photo, "PUBLIC_DOMAIN", false);
        addImage(pending, "PENDING", false);
        addImage(drawing, "OWN_WORK", true);
        addImage(upSchool, "PURCHASED_LICENCE", false);

        mockMvc.perform(get("/api/v1/schools/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Lucknow Photo School"))
                .andExpect(jsonPath("$[1].name").value("Photo School"));
        mockMvc.perform(get("/api/v1/schools/featured").param("state", "DL"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Photo School"));
    }

    @Test
    void stateAndDistrictShortcutsAndCoverageDashboard() throws Exception {
        createSchool(school("Patna Private School", Map.of("stateCode", "BR", "district", "Patna", "phone", "0612 2222222")));
        createSchool(school("Patna Government School", Map.of("stateCode", "BR", "district", "Patna", "schoolType", "GOVERNMENT")));

        mockMvc.perform(get("/api/v1/states"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(36));
        mockMvc.perform(get("/api/v1/districts").param("state", "Bihar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Patna"));

        mockMvc.perform(get("/api/v1/admin/coverage")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/coverage").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.states.length()").value(36))
                // configured priority order: DL, BR, UP, JH, HR
                .andExpect(jsonPath("$.states[0].code").value("DL"))
                .andExpect(jsonPath("$.states[1].code").value("BR"))
                .andExpect(jsonPath("$.states[1].priority").value(true))
                .andExpect(jsonPath("$.states[1].schools").value(2))
                .andExpect(jsonPath("$.states[1].privateSchools").value(1))
                .andExpect(jsonPath("$.states[1].withContact").value(1))
                .andExpect(jsonPath("$.states[1].withPhoto").value(0))
                .andExpect(jsonPath("$.states[1].verified").value(0))
                .andExpect(jsonPath("$.states[5].priority").value(false));
    }
}
