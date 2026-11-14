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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** A practice quiz or timed mock test written by this site, optionally tied to an exam guide by slug. */
@Getter
@Setter
@Entity
@Table(name = "practice_set")
@EntityListeners(AuditingEntityListener.class)
public class PracticeSet {

    public enum Kind { QUIZ, MOCK }

    /** What the set prepares for: school subjects, school entrance tests, Olympiads or competitive exams. */
    public enum Category { SCHOOL, ENTRANCE, OLYMPIAD, COMPETITIVE }

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category = Category.ENTRANCE;

    @Column(nullable = false, length = 100)
    private String level;

    /** Marks for a correct answer. */
    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal marksPerQuestion = BigDecimal.ONE;

    /** Marks deducted for a wrong answer (never for a skipped one). */
    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal negativeMarks = BigDecimal.ZERO;

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

    /** When a reviewer last checked every question, answer and explanation. */
    private LocalDate reviewedOn;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
