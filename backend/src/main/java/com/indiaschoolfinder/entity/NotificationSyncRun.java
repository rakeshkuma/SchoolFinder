package com.indiaschoolfinder.entity;

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

/** One run of the daily check of official websites: when, why, how it went, and each source's result (details, JSON). */
@Getter
@Setter
@Entity
@Table(name = "notification_sync_run")
public class NotificationSyncRun {

    public enum Trigger { SCHEDULED, STARTUP, MANUAL }

    /** PARTIAL: some sources failed; FAILED: every source failed; ABANDONED: the server stopped during the run. */
    public enum Status { RUNNING, SUCCEEDED, PARTIAL, FAILED, ABANDONED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_kind", nullable = false, length = 12)
    private Trigger trigger;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status = Status.RUNNING;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant finishedAt;

    @Column(length = 100)
    private String triggeredBy;

    @Column(length = 100)
    private String instanceName;

    private int sourcesChecked;
    private int sourcesFailed;
    private int itemsFound;
    private int itemsCreated;
    private int itemsUpdated;
    private int itemsPublished;
    private int itemsPending;
    private int itemsExpired;
    private int itemsWithdrawn;

    @Column(columnDefinition = "TEXT")
    private String details;
}
