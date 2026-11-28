package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.List;

/** A scheduled test over existing bank questions, which it lists by id and never copies. */
@Getter
@Setter
@Entity
@Table(name = "challenge")
@EntityListeners(AuditingEntityListener.class)
public class Challenge {

    public enum Kind { DAILY, WEEKLY, MONTHLY, EXAM, SPECIAL }

    public enum Difficulty { EASY, MEDIUM, HARD, MIXED }

    /** When a student sees their score and the answers. */
    public enum ResultRelease { IMMEDIATE, AFTER_END }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(length = 2000)
    private String rules;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Kind kind;

    @Column(length = 80)
    private String examSlug;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PracticeSet.Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Difficulty difficulty;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> questionIds;

    private int durationMinutes;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    private int pointsPerCorrect;

    private int completionBonus;

    private int maxAttempts;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ResultRelease resultRelease;

    private boolean leaderboardEnabled;

    private boolean published;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
