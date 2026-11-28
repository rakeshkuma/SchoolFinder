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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/** A problem a visitor reported in a practice question, reviewed by an editor. */
@Getter
@Setter
@Entity
@Table(name = "practice_question_report")
@EntityListeners(AuditingEntityListener.class)
public class PracticeQuestionReport {

    public enum Reason { WRONG_ANSWER, UNCLEAR, TYPO, TRANSLATION, OTHER }

    public enum Status { OPEN, FIXED, DISMISSED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Bank id: "set-slug/question-id". */
    @Column(nullable = false, length = 170)
    private String questionId;

    @Column(nullable = false, length = 80)
    private String setSlug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Reason reason;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status = Status.OPEN;

    private Long accountId;

    @Column(length = 1000)
    private String resolutionNote;

    @Column(length = 100)
    private String resolvedBy;

    private Instant resolvedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
