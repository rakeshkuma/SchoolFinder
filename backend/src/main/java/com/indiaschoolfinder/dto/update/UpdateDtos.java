package com.indiaschoolfinder.dto.update;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class UpdateDtos {

    private UpdateDtos() {
    }

    /** Shown next to an update; worked out from its dates on every request, never stored. */
    public enum Badge { CLOSING_SOON, NEW, OPEN, UPDATED, UPCOMING }

    /** Where an update comes from. */
    public enum Origin { EXAM_NOTICE, ADMISSIONS, PRACTICE, EDITORIAL }

    /**
     * One item of the updates feed. {@code linkPath} is the page on this site to open (it may be null for an editorial
     * update, which then opens {@code sourceUrl}); {@code sourceUrl} is the official document it comes from (null for
     * SchoolDhundo's own practice sets).
     */
    public record UpdateItem(String id, SiteUpdate.Category category, String title, String summary, String imageUrl,
                             LocalDate publishedOn, Instant updatedAt, LocalDate eventDate, String eventLabel,
                             boolean deadline, Badge badge, String sourceUrl, String sourceName, String linkPath,
                             String actionLabel, boolean verified, Origin origin, String topic) {
    }

    /** An editorial update as an editor writes it. A source is required for every category except PREP. */
    public record UpdateRequest(
            @NotNull SiteUpdate.Category category,
            @NotBlank @Size(min = 10, max = 160) String title,
            @NotBlank @Size(min = 20, max = 400) String summary,
            @HttpUrl @Size(max = 600) String imageUrl,
            @NotNull LocalDate publishedOn,
            LocalDate eventDate,
            @Size(max = 60) String eventLabel,
            boolean deadline,
            @HttpUrl @Size(max = 600) String sourceUrl,
            @Size(max = 120) String sourceName,
            /* a page on this site, e.g. /exams/aissee; never another site */
            @Size(max = 300) @Pattern(regexp = "^/(?!/)\\S*$", message = "must be a path on this site, starting with /") String linkPath,
            @Size(max = 40) String actionLabel,
            VerificationStatus verificationStatus,
            LocalDate expiresOn,
            @Min(-100) @Max(100) int priority) {

        @AssertTrue(message = "an official source URL is required (except for practice updates)")
        public boolean isSourcePresent() {
            return category == null || category == SiteUpdate.Category.PREP || (sourceUrl != null && !sourceUrl.isBlank());
        }

        @AssertTrue(message = "expiresOn must not be before publishedOn")
        public boolean isExpiryValid() {
            return expiresOn == null || publishedOn == null || !expiresOn.isBefore(publishedOn);
        }

        @AssertTrue(message = "a deadline needs its date (eventDate)")
        public boolean isDeadlineDated() {
            return !deadline || eventDate != null;
        }
    }

    /** An editorial update as staff see it in the admin area. */
    public record AdminRow(long id, SiteUpdate.Category category, String title, String summary, String imageUrl,
                           LocalDate publishedOn, LocalDate eventDate, String eventLabel, boolean deadline, String sourceUrl,
                           String sourceName, String linkPath, String actionLabel, SiteUpdate.Status status,
                           VerificationStatus verificationStatus, LocalDate expiresOn, int priority, Instant createdAt,
                           Instant updatedAt, String createdBy, String updatedBy) {
    }
}
