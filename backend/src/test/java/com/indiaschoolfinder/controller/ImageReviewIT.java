package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.service.ImageDiscoveryService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Finding, checking and publishing school photographs. Wikimedia itself is stubbed. */
class ImageReviewIT extends AbstractIntegrationTest {

    private static final String PAGE = "https://commons.wikimedia.org/wiki/File:Review_School.jpg";
    private static final String FILE = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Review_School.jpg";

    @MockitoBean
    ImageDiscoveryService discovery;

    private static ImageCandidate candidate(String licence, ImagePermission permission) {
        return new ImageCandidate("Wikimedia Commons", "File:Review School.jpg", PAGE, FILE,
                FILE.replace("/commons/", "/commons/thumb/") + "/640px-Review_School.jpg", 1600, 1200, "image/jpeg",
                "Jane Doe", licence, "https://creativecommons.org/licenses/by-sa/4.0", true, "Main building",
                permission, "Jane Doe, " + licence + ", via Wikimedia Commons", false);
    }

    private long addPending(long schoolId) throws Exception {
        Map<String, Object> image = new HashMap<>(Map.of("imageType", "MAIN_BUILDING", "url", FILE,
                "altText", "Main building of Review School", "sourceUrl", PAGE, "permissionStatus", "PENDING",
                "license", "CC BY-SA 4.0", "author", "Jane Doe", "title", "File:Review School.jpg"));
        image.put("width", 1600);
        image.put("height", 1200);
        return body(mockMvc.perform(post("/api/v1/admin/schools/{id}/images", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(image)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author").value("Jane Doe"))
                .andExpect(jsonPath("$.sourceWebsite").value("commons.wikimedia.org"))
                .andExpect(jsonPath("$.width").value(1600))
                .andReturn()).get("id").asLong();
    }

    @Test
    void candidatesAreSuggestionsAndMarkFilesAlreadyAdded() throws Exception {
        long id = createSchool(school("Review School", Map.of("city", "Ranchi")));
        when(discovery.search(eq("Review School Ranchi"), anyInt()))
                .thenReturn(List.of(candidate("CC BY-SA 4.0", ImagePermission.OPEN_LICENCE)));

        mockMvc.perform(get("/api/v1/admin/schools/{id}/images/candidates", id).header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].suggestedPermission").value("OPEN_LICENCE"))
                .andExpect(jsonPath("$[0].alreadyAdded").value(false));
        // Searching stores nothing.
        mockMvc.perform(get("/api/v1/admin/schools/{id}/images", id).header("Authorization", editorToken()))
                .andExpect(jsonPath("$.length()").value(0));

        addPending(id);
        mockMvc.perform(get("/api/v1/admin/schools/{id}/images/candidates", id).header("Authorization", editorToken()))
                .andExpect(jsonPath("$[0].alreadyAdded").value(true));
        mockMvc.perform(get("/api/v1/admin/schools/{id}/images/candidates", id))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anImageIsPublishedOnlyAfterApprovalAndCanBeTakenDown() throws Exception {
        long id = createSchool(school("Review School", Map.of()));
        long imageId = addPending(id);
        mockMvc.perform(get("/api/v1/schools/{id}/images", id)).andExpect(jsonPath("$.length()").value(0));

        // An open licence needs its attribution before it can be approved.
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/approve", id, imageId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("permissionStatus", "OPEN_LICENCE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("attributionText"));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/approve", id, imageId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("permissionStatus", "PENDING"))))
                .andExpect(status().isBadRequest());

        Map<String, Object> edit = new HashMap<>(Map.of("imageType", "MAIN_BUILDING", "altText", "Main building",
                "license", "CC BY-SA 4.0", "permissionStatus", "PENDING",
                "attributionText", "Jane Doe, CC BY-SA 4.0, via Wikimedia Commons"));
        mockMvc.perform(put("/api/v1/admin/schools/{id}/images/{imageId}", id, imageId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(edit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attributionText").value("Jane Doe, CC BY-SA 4.0, via Wikimedia Commons"));
        // Editing cannot publish; only Approve can.
        edit.put("permissionStatus", "OPEN_LICENCE");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/images/{imageId}", id, imageId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(edit)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("permissionStatus"));

        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/approve", id, imageId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("permissionStatus", "OPEN_LICENCE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.lastVerifiedDate").isNotEmpty());
        mockMvc.perform(get("/api/v1/schools/{id}/images", id)).andExpect(jsonPath("$.length()").value(1));

        // Changing the licence of a published image takes it down until it is checked again.
        edit.put("license", "CC BY 4.0");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/images/{imageId}", id, imageId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(edit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissionStatus").value("PENDING"))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"));
        mockMvc.perform(get("/api/v1/schools/{id}/images", id)).andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/reject", id, imageId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("reason", "Shows a different branch"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissionStatus").value("REVOKED"))
                .andExpect(jsonPath("$.permissionNote").value("Rejected: Shows a different branch"));
    }

    @Test
    void theMainPhotoComesFirstAndCommonsRecordsCanBeRefreshed() throws Exception {
        long id = createSchool(school("Review School", Map.of()));
        long first = addPending(id);
        long second = addPending(id);
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/primary", id, second)
                        .header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(second))
                .andExpect(jsonPath("$[1].id").value(first))
                .andExpect(jsonPath("$[1].sortOrder").value(1));

        when(discovery.commonsFile("File:Review School.jpg"))
                .thenReturn(Optional.of(candidate("CC BY-NC 2.0", null)));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/images/{imageId}/refresh", id, first)
                        .header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.thumbnailUrl").value(org.hamcrest.Matchers.containsString("/640px-")))
                .andExpect(jsonPath("$.verificationStatus").value("OUTDATED"))
                .andExpect(jsonPath("$.permissionStatus").value("PENDING"));
    }
}
