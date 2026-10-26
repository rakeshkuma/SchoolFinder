package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** This site's own computed ranking. Never an official government ranking. */
@Getter
@Setter
@Entity
@Table(name = "school_ranking")
public class SchoolRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false, length = 7)
    private String academicYear;

    @Column(nullable = false)
    private BigDecimal totalScore;

    /** NULL for provisional results: they are listed but not given a definitive position. */
    private Integer rankPosition;

    @Column(nullable = false)
    private boolean provisional;

    /** Share of total weight backed by any evidence, verified or documented. */
    @Column(nullable = false)
    private BigDecimal coveragePercent;

    /** Share of total weight backed by verified evidence; decides whether the result is definitive. */
    @Column(nullable = false)
    private BigDecimal verifiedCoveragePercent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<CriterionContribution> breakdown = new ArrayList<>();

    @Column(nullable = false, length = 20)
    private String methodologyVersion;

    @Column(nullable = false)
    private Instant calculatedAt;

    public record CriterionContribution(
            String criterionCode,
            String criterionName,
            BigDecimal weight,
            BigDecimal normalizedScore,
            BigDecimal contribution,
            boolean dataAvailable,
            String sourceUrl,
            /* null on rows calculated before methodology 2.0 */
            Boolean verified,
            EvidenceType evidenceType,
            String evidenceNote) {
    }

    public enum EvidenceType {
        /** Administrator-verified criterion score with a cited source. */
        VERIFIED_SCORE,
        /** Average of approved reviews on this site (minimum count applies). */
        PARENT_REVIEWS,
        /** Share of the published facility checklist documented by a cited source. */
        DOCUMENTED_FACILITIES,
        /** Officially published student-teacher ratio on the published scale. */
        PUBLISHED_RATIO
    }
}
