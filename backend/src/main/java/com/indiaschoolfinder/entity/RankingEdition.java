package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.RankingScope;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** One published list: a publisher's list for one year, category and place. Positions compare only within it. */
@Getter
@Setter
@Entity
@Table(name = "ranking_edition")
public class RankingEdition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long publisherId;

    private Long categoryId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 20)
    private String rankingYear;

    private String categoryLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RankingScope scope = RankingScope.NATIONAL;

    private String region;

    @Column(nullable = false)
    private String sourceUrl;

    private LocalDate publishedOn;

    @Column(nullable = false)
    private LocalDate collectedOn;

    private BigDecimal maxScore;

    private boolean ratingBased;

    private String methodologySummary;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
