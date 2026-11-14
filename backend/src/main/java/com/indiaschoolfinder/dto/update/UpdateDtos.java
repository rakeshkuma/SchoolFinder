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

    /** Shown next to an update; worked out from its dates on every request, never stored. EXPIRED only in past updates. */
    public enum Badge { CLOSING_SOON, NEW, OPEN, UPDATED, UPCOMING, EXPIRED }

    /**
     * Where an update comes from. OFFICIAL_SOURCE: found by the daily check of an official website and published from
     * it automatically (title, date and link as the source gives them; not checked by an editor).
     */
    public enum Origin { EXAM_NOTICE, ADMISSIONS, PRACTICE, EDITORIAL, OFFICIAL_SOURCE }

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

    /** An update as staff see it in the admin area (editorial or found by the daily check). */
    public record AdminRow(long id, SiteUpdate.Category category, String title, String summary, String imageUrl,
                           LocalDate publishedOn, LocalDate eventDate, String eventLabel, boolean deadline, String sourceUrl,
                           String sourceName, String linkPath, String actionLabel, SiteUpdate.Status status,
                           VerificationStatus verificationStatus, LocalDate expiresOn, int priority, Instant createdAt,
                           Instant updatedAt, String createdBy, String updatedBy, SiteUpdate.Origin origin, String sourceKey,
                           String officialTitle, boolean dateConfirmed, String reviewNote, Instant firstSeenAt,
                           Instant lastSeenAt, Instant lastChangedAt, Instant withdrawnAt, Long supersededById,
                           boolean staffEdited, String topic) {
    }

    /** What the public site may know about the daily check: when it last ran and when it runs next. */
    public record SyncStatus(Instant lastCheckedAt, Instant nextCheckAt, String schedule, int sources) {
    }

    /** One source's result in one run. */
    public record SourceRow(String key, String name, String outcome, String error, long durationMs, int requests,
                            int listed, int relevant, int ignored, int created, int updated, int unchanged, int published,
                            int pending, int tooOld, int duplicates, int withdrawn) {
    }

    public record SyncRunRow(long id, String trigger, String status, Instant startedAt, Instant finishedAt, String triggeredBy,
                             String instanceName, int sourcesChecked, int sourcesFailed, int itemsFound, int itemsCreated,
                             int itemsUpdated, int itemsPublished, int itemsPending, int itemsExpired, int itemsWithdrawn,
                             java.util.List<SourceRow> sources) {
    }

    /** A configured source as staff see it. */
    public record SourceInfo(String key, String name, String listingUrl, java.util.List<String> hosts, boolean autoPublish,
                             String reviewOnlyReason, boolean completeListing, boolean enabled) {
    }

    /** The checker's state for staff. */
    public record AdminSyncStatus(boolean enabled, boolean running, String cron, String timezone, String schedule,
                                  Instant nextCheckAt, Instant lastSuccessAt, SyncRunRow lastRun, long pendingReview,
                                  java.util.List<SourceInfo> sources) {
    }

    /** The answer to a staff "check now". */
    public record SyncStartResult(String result, String message) {
    }
}
