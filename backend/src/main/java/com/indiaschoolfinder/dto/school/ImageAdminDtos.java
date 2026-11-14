package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Image discovery and review for administrators. */
public final class ImageAdminDtos {

    private ImageAdminDtos() {
    }

    /**
     * A possible photograph found on Wikimedia Commons or Wikipedia, with the licence its source states.
     * {@code suggestedPermission} is null when the licence does not allow reuse here (do not use the image).
     * Nothing is stored until an administrator adds it, and it is added as PENDING.
     */
    public record ImageCandidate(String source, String title, String pageUrl, String imageUrl, String thumbnailUrl,
                                 Integer width, Integer height, String mime, String author, String licence,
                                 String licenceUrl, boolean attributionRequired, String description,
                                 ImagePermission suggestedPermission, String attributionText, boolean alreadyAdded) {
    }

    /** Edits an image's details. Changing the permission sends it back for review. */
    public record UpdateRequest(
            @NotNull ImageType imageType,
            @Size(max = 300) String caption,
            @NotBlank @Size(max = 300) String altText,
            @Size(max = 200) String author,
            @Size(max = 300) String title,
            @Size(max = 200) String credit,
            @NotBlank @Size(max = 200) String license,
            @Size(max = 500) String attributionText,
            @NotNull ImagePermission permissionStatus,
            @Size(max = 500) String permissionNote) {
    }

    /**
     * Publishes an image after checking it shows this school (and branch) and that the stated permission is right.
     * {@code permissionStatus} must be a publishable one.
     */
    public record ApproveRequest(@NotNull ImagePermission permissionStatus, @Size(max = 500) String note) {
    }

    /** Takes an image down: wrong school, wrong branch, unclear licence or out of date. */
    public record RejectRequest(@NotBlank @Size(max = 500) String reason) {
    }
}
