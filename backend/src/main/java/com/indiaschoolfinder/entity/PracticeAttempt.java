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

    @Column(nullable = false)
    private Long accountId;

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
