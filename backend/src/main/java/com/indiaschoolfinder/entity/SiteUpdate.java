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

import java.time.LocalDate;

/**
 * An update an editor adds by hand (for example a teaching job alert), citing its official source. Shown in the updates
 * feed only while published and not expired. Exam notices, admissions and practice sets are derived, not stored here.
 */
@Getter
@Setter
@Entity
@Table(name = "site_update")
public class SiteUpdate extends AuditableEntity {

    public enum Category { ADMISSION, EXAM, PREP, JOB }

    public enum Status { DRAFT, PUBLISHED, ARCHIVED }

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
    @Column(nullable = false, length = 10)
    private Status status = Status.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate expiresOn;

    @Column(nullable = false)
    private int priority;
}
