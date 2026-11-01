package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Likely duplicates that slip past the import's exact checks are shown to editors, who can dismiss them. */
class DuplicateReportIT extends AbstractIntegrationTest {

    @Test
    void schoolsSharingAPhoneLocationOrPhotoAreReportedUntilDismissed() throws Exception {
        long a = createSchool(school("Sunrise Public School", Map.of("phone", "011-2345 6789", "pinCode", "110001",
                "latitude", 28.61231, "longitude", 77.20111)));
        long b = createSchool(school("Sunrise Public School Branch", Map.of("phone", "+91 11 2345 6789", "pinCode", "110002",
                "latitude", 28.61232, "longitude", 77.20112)));
        long c = createSchool(school("Other School", Map.of("phone", "011-9999 0000", "pinCode", "110003")));

        Map<String, Object> image = new HashMap<>(Map.of("imageType", "CAMPUS", "url", "https://example.org/shared.jpg",
                "altText", "Campus", "sourceUrl", "https://example.org/gallery", "permissionStatus", "PENDING", "license", "Unknown"));
        for (long id : List.of(a, c)) {
            mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json(image))).andExpect(status().isCreated());
        }

        mockMvc.perform(get("/api/v1/admin/duplicates").header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.SAME_PHONE").value(1))
                .andExpect(jsonPath("$.counts.SAME_LOCATION").value(1))
                .andExpect(jsonPath("$.counts.SAME_PHOTO").value(1))
                .andExpect(jsonPath("$.groups[?(@.reason == 'SAME_PHONE')].schools[*].id", containsInAnyOrder((int) a, (int) b)))
                .andExpect(jsonPath("$.groups[?(@.reason == 'SAME_PHOTO')].schools[*].id", containsInAnyOrder((int) a, (int) c)));

        mockMvc.perform(post("/api/v1/admin/duplicates/dismiss").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("schoolIds", List.of(b, a), "note", "Two campuses"))))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/admin/duplicates").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.counts.SAME_PHONE").value(0))
                .andExpect(jsonPath("$.counts.SAME_LOCATION").value(0))
                .andExpect(jsonPath("$.groups[*].reason", not(hasItem("SAME_PHONE"))))
                .andExpect(jsonPath("$.counts.SAME_PHOTO").value(1));

        mockMvc.perform(post("/api/v1/admin/duplicates/dismiss").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("schoolIds", List.of(a)))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/admin/duplicates")).andExpect(status().isUnauthorized());
    }
}
