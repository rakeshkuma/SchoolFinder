package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.dto.practice.PracticeMode;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A member's scored practice attempt; the score is the server's, computed from the stored answers. */
@Getter
@Setter
@Entity
@Table(name = "practice_attempt")
@EntityListeners(AuditingEntityListener.class)
public class PracticeAttempt {

    /** The answers as submitted and the result as scored, kept together so a past result can be shown again. */
    public record Responses(List<String> questionIds, Map<String, Integer> answers, ScoreResultDto score) {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The member's account; NULL for a guest participant's attempt. */
    private Long accountId;

    /** Who the attempt counts for in rankings (members get a participant on their first attempt). */
    private Long participantId;

    /** Leaderboard points awarded for this attempt; separate from its raw marks. */
    private int points;

    /** The daily-quiz date this attempt counted for, if it was that day's quiz. */
    private java.time.LocalDate dailyDate;

    /** Why the attempt earned no points despite correct answers (TOO_FAST), for moderators. */
    @Column(length = 30)
    private String reviewFlag;

    /** The challenge this attempt was for, if any. */
    private Long challengeId;

    /** Until this time the attempt is kept from the student, as its challenge releases results at the end. */
    private Instant resultsHiddenUntil;

    @Column(nullable = false)
    private UUID clientId;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PracticeMode mode;

    @Column(length = 80)
    private String examSlug;

    @Column(length = 80)
    private String setSlug;

    private int total;

    private int attempted;

    private int correct;

    /** Marks scored under each question's set marking; NULL for attempts saved before marking was recorded. */
    @Column(precision = 7, scale = 2)
    private BigDecimal marks;

    @Column(precision = 7, scale = 2)
    private BigDecimal maxMarks;

    private Integer durationSeconds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Responses responses;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
