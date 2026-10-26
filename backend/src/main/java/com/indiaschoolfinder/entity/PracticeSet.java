package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.dto.practice.PracticeContent;
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

/** A practice quiz or timed mock test written by this site, optionally tied to an exam guide by slug. */
@Getter
@Setter
@Entity
@Table(name = "practice_set")
@EntityListeners(AuditingEntityListener.class)
public class PracticeSet {

    public enum Kind { QUIZ, MOCK }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(length = 80)
    private String examSlug;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Kind kind;

    @Column(nullable = false, length = 100)
    private String level;

    @Column(nullable = false, length = 1000)
    private String description;

    /** NULL for untimed practice. */
    private Integer durationMinutes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private PracticeContent content;

    @Column(nullable = false)
    private int displayOrder = 100;

    @Column(nullable = false)
    private boolean published;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
