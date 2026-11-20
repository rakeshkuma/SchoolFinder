package com.indiaschoolfinder.dto.update;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.notifications.opportunity.ApplicationStatus;
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
                             String actionLabel, boolean verified, Origin origin, String topic,
                             /* Admissions and jobs only (null otherwise): where applications stand today, and what kind of notice it is. */
                             ApplicationStatus applicationStatus, SiteUpdate.NoticeType noticeType) {

        /** An item that is not an admission or job notice. */
        public UpdateItem(String id, SiteUpdate.Category category, String title, String summary, String imageUrl,
                          LocalDate publishedOn, Instant updatedAt, LocalDate eventDate, String eventLabel,
                          boolean deadline, Badge badge, String sourceUrl, String sourceName, String linkPath,
                          String actionLabel, boolean verified, Origin origin, String topic) {
            this(id, category, title, summary, imageUrl, publishedOn, updatedAt, eventDate, eventLabel, deadline, badge, sourceUrl,
                    sourceName, linkPath, actionLabel, verified, origin, topic, null, null);
        }
    }

    /**
     * The facts of an admission or job notice as an editor enters or confirms them from the official notice. Sent with
     * an update, it replaces the stored facts (a field left empty means "not given in the notice"); not sent, the
     * stored facts are kept.
     */
    public record OpportunityFields(
            @Size(max = 160) String institutionName,
            @Size(max = 120) String campus,
            Long schoolId,
            SiteUpdate.Sector sector,
            Boolean boarding,
            @Pattern(regexp = "^[A-Z]{2}$", message = "must be a two-letter state code") String stateCode,
            @Size(max = 80) String city,
            SiteUpdate.NoticeType noticeType,
            LocalDate opensOn,
            LocalDate closesOn,
            LocalDate examOn,
            @Pattern(regexp = "^20\\d{2}-\\d{2}$", message = "must look like 2027-28") String academicSession,
            @Size(max = 80) String classes,
            @Size(max = 160) @Pattern(regexp = "^[A-Z_]+(,[A-Z_]+)*$", message = "must be post codes separated by commas") String postTypes,
            @Size(max = 240) String subjects,
            SiteUpdate.StaffKind staffKind,
            SiteUpdate.EmploymentType employmentType,
            @Min(1) @Max(100_000) Integer vacancies,
            @Size(max = 600) String eligibility,
            @Size(max = 300) String experience,
            @Size(max = 200) String tetRequirement,
            @Size(max = 200) String ageLimit,
            @Size(max = 200) String salaryText,
            @Size(max = 200) String applicationFee,
            @Size(max = 400) String selectionProcess,
            @HttpUrl @Size(max = 600) String applyUrl) {

        @AssertTrue(message = "opensOn must not be after closesOn")
        public boolean isWindowValid() {
            return opensOn == null || closesOn == null || !opensOn.isAfter(closesOn);
        }
    }

    /** One post of a recruitment notice, as an editor enters it from the notice. */
    public record PositionRequest(
            @NotBlank @Size(max = 120) String postName,
            @Size(max = 20) @Pattern(regexp = "^[A-Z_]*$", message = "must be a post code") String postType,
            @Size(max = 80) String subject,
            @Size(max = 40) String postCode,
            @Min(1) @Max(100_000) Integer vacancies,
            @Size(max = 120) String payScale,
            @Size(max = 400) String qualification) {
    }

    public record PositionRow(long id, String postName, String postType, String postTypeLabel, String subject, String postCode,
                              Integer vacancies, String payScale, String qualification, String origin) {
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
            @Min(-100) @Max(100) int priority,
            /* Admissions and jobs: the notice's facts (optional; see OpportunityFields). */
            @jakarta.validation.Valid OpportunityFields details) {

        /** The request as editors sent it before admission and job facts existed (facts are then kept as they are). */
        public UpdateRequest(SiteUpdate.Category category, String title, String summary, String imageUrl, LocalDate publishedOn,
                             LocalDate eventDate, String eventLabel, boolean deadline, String sourceUrl, String sourceName,
                             String linkPath, String actionLabel, VerificationStatus verificationStatus, LocalDate expiresOn,
                             int priority) {
            this(category, title, summary, imageUrl, publishedOn, eventDate, eventLabel, deadline, sourceUrl, sourceName, linkPath,
                    actionLabel, verificationStatus, expiresOn, priority, null);
        }

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
                           boolean staffEdited, String topic,
                           /* Admissions and jobs: the page address and the facts (null for other categories). */
                           String slug, OpportunityFields details, java.util.List<PositionRow> positions) {
    }

    /** What the public site may know about the daily check: when it last ran and when it runs next. */
    public record SyncStatus(Instant lastCheckedAt, Instant nextCheckAt, String schedule, int sources) {
    }

    /** One source's result in one run. */
    public record SourceRow(String key, String name, String outcome, String error, long durationMs, int requests,
                            int listed, int relevant, int ignored, int created, int updated, int unchanged, int published,
                            int pending, int tooOld, int duplicates, int withdrawn, int createdJobs, int createdAdmissions) {
    }

    /** {@code newJobs}, {@code newAdmissions}, {@code duplicates} and {@code tooOld} are summed over the run's sources. */
    public record SyncRunRow(long id, String trigger, String status, Instant startedAt, Instant finishedAt, String triggeredBy,
                             String instanceName, int sourcesChecked, int sourcesFailed, int itemsFound, int itemsCreated,
                             int itemsUpdated, int itemsPublished, int itemsPending, int itemsExpired, int itemsWithdrawn,
                             java.util.List<SourceRow> sources, int newJobs, int newAdmissions, int duplicates, int tooOld) {
    }

    /**
     * A configured source as staff see it: how it is read and published, what it is (from the source registry), and
     * how its checks have gone (last attempt, last success, outcome, error, failures in a row).
     */
    public record SourceInfo(String key, String name, String listingUrl, java.util.List<String> hosts, boolean autoPublish,
                             String reviewOnlyReason, boolean completeListing, boolean enabled,
                             String institution, String sourceCategory, SiteUpdate.Sector sector, Boolean boarding, String stateCode,
                             String city, java.util.List<String> noticeTypes, String method, String reliability, boolean schoolPostsOnly,
                             Instant lastAttemptAt, Instant lastSuccessAt, String lastOutcome, String lastError, int consecutiveFailures) {
    }

    /** The checker's state for staff; {@code registryProblems} lists registry entries left out, with why. */
    public record AdminSyncStatus(boolean enabled, boolean running, String cron, String timezone, String schedule,
                                  Instant nextCheckAt, Instant lastSuccessAt, SyncRunRow lastRun, long pendingReview,
                                  java.util.List<SourceInfo> sources, java.util.List<String> registryProblems, int sourcesFailing) {
    }

    /** The answer to a staff "check now". */
    public record SyncStartResult(String result, String message) {
    }
}
