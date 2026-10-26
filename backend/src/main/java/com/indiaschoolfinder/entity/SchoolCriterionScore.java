package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Evidence-backed score for one ranking criterion; only VERIFIED rows count toward rankings. */
@Getter
@Setter
@Entity
@Table(name = "school_criterion_score")
public class SchoolCriterionScore extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private Long criterionId;

    @Column(nullable = false, length = 7)
    private String academicYear;

    @Column(nullable = false)
    private BigDecimal rawScore;

    @Column(nullable = false)
    private BigDecimal maxScore;

    /** rawScore / maxScore × 100, rounded to two decimals. */
    @Column(nullable = false)
    private BigDecimal normalizedScore;

    private String evidenceNotes;

    @Column(nullable = false)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate lastVerifiedDate;

    @Version
    private long version;
}
