package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReviewAndVerificationIT extends AbstractIntegrationTest {

    private Map<String, Object> review(int rating) {
        Map<String, Object> r = new HashMap<>();
        r.put("reviewerName", "A parent");
        r.put("relationship", "PARENT");
        r.put("rating", rating);
        r.put("title", "Caring teachers");
        r.put("comment", "<b>Teachers</b> respond quickly and the school communicates clearly with parents.");
        r.put("consentGiven", true);
        return r;
    }

    @Test
    void reviewsAreModeratedBeforePublicationAndUpdateTheRating() throws Exception {
        long id = createSchool(school("Review School", Map.of()));

        String created = mockMvc.perform(post("/api/v1/schools/{id}/reviews", id)
                        .contentType(MediaType.APPLICATION_JSON).content(json(review(4))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.comment").value("Teachers respond quickly and the school communicates clearly with parents."))
                .andReturn().getResponse().getContentAsString();
        long reviewId = objectMapper.readTree(created).get("id").asLong();

        mockMvc.perform(get("/api/v1/schools/{id}/reviews", id)).andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(patch("/api/v1/admin/reviews/{id}", reviewId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "APPROVED"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/schools/{id}/reviews", id)).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools/{id}", id))
                .andExpect(jsonPath("$.averageRating").value(4.00))
                .andExpect(jsonPath("$.reviewCount").value(1));
    }

    @Test
    void reviewsRequireConsentAndValidRating() throws Exception {
        long id = createSchool(school("Consent School", Map.of()));
        Map<String, Object> noConsent = review(5);
        noConsent.put("consentGiven", false);
        noConsent.put("rating", 9);
        mockMvc.perform(post("/api/v1/schools/{id}/reviews", id).contentType(MediaType.APPLICATION_JSON).content(json(noConsent)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("consentGiven")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("rating")));
    }

    @Test
    void verificationRecordsHistoryAndRejectsOtherSchoolsRecords() throws Exception {
        long a = createSchool(school("Verify School A", Map.of()));
        long b = createSchool(school("Verify School B", Map.of()));

        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", a).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "SCHOOL", "status", "VERIFIED",
                                "sourceUrl", "https://www.edudel.nic.in/", "notes", "Checked against DoE directory"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.newStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.verifiedBy").value(EDITOR));

        mockMvc.perform(get("/api/v1/schools/{id}", a))
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.lastVerifiedDate").isNotEmpty());
        mockMvc.perform(get("/api/v1/admin/schools/{id}/verification-history", a).header("Authorization", editorToken()))
                .andExpect(jsonPath("$.length()").value(1));

        // A fee of school A cannot be verified through school B's URL.
        String fee = mockMvc.perform(post("/api/v1/admin/schools/{id}/fees", a).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("classCode", "I", "academicYear", "2026-27", "monthlyTuition", 1000,
                                "sourceUrl", "https://example.org/fees"))))
                .andReturn().getResponse().getContentAsString();
        long feeId = objectMapper.readTree(fee).get("id").asLong();
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", b).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "FEE", "entityId", feeId, "status", "VERIFIED",
                                "sourceUrl", "https://example.org/fees"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void imagesRequireLicenceAndSourceAndUploadExplainsWhenStorageIsNotConfigured() throws Exception {
        long id = createSchool(school("Image School", Map.of()));
        Map<String, Object> image = new HashMap<>(Map.of("imageType", "CAMPUS", "url", "https://example.org/campus.jpg",
                "altText", "Main building", "sourceUrl", "https://example.org/gallery", "permissionStatus", "PENDING"));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("license"));

        // Stored while permission is pending, but not published.
        image.put("license", "Used with written permission of the school");
        image.put("credit", "Image School");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/v1/schools/{id}/images", id)).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/v1/schools").param("name", "Image"))
                .andExpect(jsonPath("$.content[0].coverImageUrl").doesNotExist());
        mockMvc.perform(get("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken()))
                .andExpect(jsonPath("$[0].permissionStatus").value("PENDING"));

        image.put("permissionStatus", "WRITTEN_PERMISSION");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("permissionNote"));
        image.put("permissionNote", "E-mail from the principal, 2026-10-20");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/v1/schools/{id}/images", id))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].illustrative").value(false))
                .andExpect(jsonPath("$[0].permissionStatus").value("WRITTEN_PERMISSION"));
        mockMvc.perform(get("/api/v1/schools").param("name", "Image"))
                .andExpect(jsonPath("$.content[0].coverImageUrl").value("https://example.org/campus.jpg"));

        Map<String, Object> logo = new HashMap<>(image);
        logo.put("imageType", "LOGO");
        logo.put("illustrative", true);
        logo.put("permissionStatus", "OWN_WORK");
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(logo)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("illustrative"));

        var file = new org.springframework.mock.web.MockMultipartFile("file", "a.jpg", "image/jpeg", new byte[]{1, 2, 3});
        var metadata = new org.springframework.mock.web.MockMultipartFile("metadata", "", "application/json", json(image).getBytes());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/v1/admin/schools/{id}/images", id).file(file).file(metadata)
                        .header("Authorization", editorToken()))
                .andExpect(status().isServiceUnavailable());
    }
}
