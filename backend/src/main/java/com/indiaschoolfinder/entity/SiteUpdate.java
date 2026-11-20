package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * An update shown in the updates feed while published and not expired: either written by an editor (for example a
 * teaching job alert) or found by the daily check of an approved official website (origin OFFICIAL_SYNC), each citing
 * its official source. Exam catalogue notices, admission cycles and practice sets are derived, not stored here.
 */
@Getter
@Setter
@Entity
@Table(name = "site_update")
public class SiteUpdate extends AuditableEntity {

    public enum Category { ADMISSION, EXAM, PREP, JOB }

    /** PENDING_REVIEW: found automatically but not certain enough to publish without an editor. */
    public enum Status { DRAFT, PENDING_REVIEW, PUBLISHED, EXPIRED, ARCHIVED }

    public enum Origin { EDITORIAL, OFFICIAL_SYNC }

    /** Who runs the admitting or hiring institution. */
    public enum Sector { GOVERNMENT, PRIVATE }

    /**
     * What an admission or job notice is: an OPENING invites applications; the others are later steps of one (an
     * EXTENSION of its last date, a CORRIGENDUM, a SCHEDULE of tests or interviews, ADMIT_CARDs, a RESULT or list).
     */
    public enum NoticeType { OPENING, EXTENSION, CORRIGENDUM, SCHEDULE, ADMIT_CARD, RESULT, OTHER }

    public enum StaffKind { TEACHING, NON_TEACHING, MIXED }

    /** As the notice states it: regular (permanent) posts, contract or guest engagement, part-time, or temporary. */
    public enum EmploymentType { REGULAR, CONTRACT, PART_TIME, TEMPORARY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Category category;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 400)
    private String summary;

    @Column(length = 600)
    private String imageUrl;

    @Column(nullable = false)
    private LocalDate publishedOn;

    private LocalDate eventDate;

    @Column(length = 60)
    private String eventLabel;

    /** True when the event date is a last date (application or registration deadline). */
    @Column(nullable = false)
    private boolean deadline;

    @Column(length = 600)
    private String sourceUrl;

    @Column(length = 120)
    private String sourceName;

    @Column(length = 300)
    private String linkPath;

    @Column(length = 40)
    private String actionLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate expiresOn;

    @Column(nullable = false)
    private int priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Origin origin = Origin.EDITORIAL;

    /** The checker that found it, e.g. "nta-aissee"; null for editorial updates. */
    @Column(length = 40)
    private String sourceKey;

    /** The source's own identifier for the notice (or its canonical address). */
    @Column(length = 300)
    private String sourceItemId;

    /** The title exactly as the source printed it. */
    @Column(length = 400)
    private String officialTitle;

    @Column(length = 64)
    private String contentHash;

    /** False when publishedOn is only the day the checker first saw the notice (the source printed no date). */
    @Column(nullable = false)
    private boolean dateConfirmed = true;

    private Instant firstSeenAt;
    private Instant lastSeenAt;
    /** When the source last corrected the notice; the "Updated" badge reads this, never the publication date. */
    private Instant lastChangedAt;
    private Instant missingSince;
    private Instant withdrawnAt;

    @Column(name = "superseded_by")
    private Long supersededById;

    /** True once staff edited an automatically found update; later runs then keep the staff wording. */
    @Column(nullable = false)
    private boolean staffEdited;

    @Column(length = 40)
    private String topic;

    @Column(length = 600)
    private String reviewNote;

    // --- admissions and jobs (V47): each only as the official source states it; null means "not given" ------------

    /** The notice's own page here (/jobs/{slug} or /admissions/{slug}); set once, never changed. */
    @Column(length = 170)
    private String slug;

    @Column(length = 160)
    private String institutionName;

    @Column(length = 120)
    private String campus;

    @Column(name = "school_id")
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private Sector sector;

    private Boolean boarding;

    @Column(length = 2)
    private String stateCode;

    @Column(length = 80)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private NoticeType noticeType;

    private LocalDate opensOn;
    private LocalDate closesOn;
    private LocalDate examOn;

    @Column(length = 9)
    private String academicSession;

    @Column(length = 80)
    private String classes;

    /** Comma-separated post type codes, e.g. "PGT,TGT" (see OpportunityClassifier). */
    @Column(length = 160)
    private String postTypes;

    /** Comma-separated subjects, e.g. "Mathematics,Physics". */
    @Column(length = 240)
    private String subjects;

    @Enumerated(EnumType.STRING)
    @Column(length = 14)
    private StaffKind staffKind;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private EmploymentType employmentType;

    private Integer vacancies;

    @Column(length = 600)
    private String eligibility;

    @Column(length = 300)
    private String experience;

    @Column(length = 200)
    private String tetRequirement;

    @Column(length = 200)
    private String ageLimit;

    @Column(length = 200)
    private String salaryText;

    @Column(length = 200)
    private String applicationFee;

    @Column(length = 400)
    private String selectionProcess;

    @Column(length = 600)
    private String applyUrl;

    public boolean isOfficialSync() {
        return origin == Origin.OFFICIAL_SYNC;
    }

    /** An admission or job notice: these have a page of their own and the facts above. */
    public boolean isOpportunity() {
        return category == Category.ADMISSION || category == Category.JOB;
    }
}
