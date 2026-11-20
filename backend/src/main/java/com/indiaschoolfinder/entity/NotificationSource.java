package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * One official website in the registry of sources the daily check reads: what it is and how it is read (written from
 * the application's definitions on every run) and how its recent checks went (written by the check). Staff only.
 */
@Getter
@Setter
@Entity
@Table(name = "notification_source")
public class NotificationSource {

    @Id
    @Column(name = "source_key", length = 40)
    private String key;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 160)
    private String institution;

    @Column(length = 120)
    private String officialDomain;

    @Column(nullable = false, length = 600)
    private String listingUrl;

    @Column(nullable = false, length = 24)
    private String sourceCategory;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private SiteUpdate.Sector sector;

    private Boolean boarding;

    @Column(length = 2)
    private String stateCode;

    @Column(length = 80)
    private String city;

    /** Comma-separated categories, e.g. "ADMISSION,JOB". */
    @Column(nullable = false, length = 60)
    private String noticeTypes;

    @Column(nullable = false, length = 20)
    private String extractionMethod;

    @Column(nullable = false, length = 24)
    private String reliability;

    @Column(nullable = false)
    private boolean autoPublish;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "school_id")
    private Long schoolId;

    private Instant lastAttemptAt;
    private Instant lastSuccessAt;

    @Column(length = 10)
    private String lastOutcome;

    @Column(length = 300)
    private String lastError;

    @Column(nullable = false)
    private int consecutiveFailures;

    private Integer lastListed;
    private Integer lastRelevant;

    @Column(nullable = false)
    private Instant registeredAt;

    @Column(nullable = false)
    private Instant updatedAt;
}
