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

    public boolean isOfficialSync() {
        return origin == Origin.OFFICIAL_SYNC;
    }
}
