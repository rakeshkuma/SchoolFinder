package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Registers an externally hosted image (e.g. on the school's official site or Cloudinary).
 * license, sourceUrl and permissionStatus are mandatory so that only official or properly licensed photos are used;
 * PENDING images are stored but not published until the permission is confirmed.
 */
public record ImageRequest(
        @NotNull ImageType imageType,
        @NotBlank @HttpUrl String url,
        @HttpUrl String thumbnailUrl,
        @Size(max = 300) String caption,
        @NotBlank @Size(max = 300) String altText,
        @Size(max = 200) String credit,
        @NotBlank(message = "state the licence or permission under which the image is used") @Size(max = 200) String license,
        @Size(max = 500) String attributionText,
        @NotNull(message = "state the basis for publishing the image (use PENDING if not yet confirmed)") ImagePermission permissionStatus,
        @Size(max = 500) String permissionNote,
        Boolean illustrative,
        @NotBlank(message = "a source URL is required") @HttpUrl String sourceUrl,
        @Min(0) Integer sortOrder) {

    public ImageRequest withUrl(String newUrl) {
        return new ImageRequest(imageType, newUrl, thumbnailUrl, caption, altText, credit, license, attributionText,
                permissionStatus, permissionNote, illustrative, sourceUrl, sortOrder);
    }
}
