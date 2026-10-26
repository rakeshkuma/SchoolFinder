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

/**
 * Fee schedule for one school, class and academic year. A NULL component means the amount is
 * unknown; an explicit 0 means the official source states there is no such charge.
 * recurringAnnualOfficial and firstYearOfficial are derived by FeeCalculator on every save.
 */
@Getter
@Setter
@Entity
@Table(name = "school_fee")
public class SchoolFee extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private Long classId;

    @Column(nullable = false, length = 7)
    private String academicYear;

    private BigDecimal registrationFee;
    private BigDecimal admissionFee;
    private BigDecimal monthlyTuition;

    @Column(nullable = false)
    private int tuitionMonths = 12;

    /** Other charges billed every month with tuition (e.g. monthly development fund); optional. */
    private BigDecimal monthlyCharges;
    private String monthlyChargesDescription;

    private BigDecimal annualCharges;
    private BigDecimal developmentCharges;
    private BigDecimal securityDeposit;

    @Column(nullable = false)
    private boolean securityDepositRefundable = true;

    private BigDecimal transportMonthly;
    private Integer transportMonths;

    /** Always an estimate: books and uniforms are bought separately and vary. */
    private BigDecimal booksUniformEstimate;

    private BigDecimal otherCharges;
    private String otherChargesDescription;

    private BigDecimal recurringAnnualOfficial;
    private BigDecimal firstYearOfficial;

    @Column(nullable = false, length = 3)
    private String currency = "INR";

    @Column(nullable = false)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate lastVerifiedDate;
    private String notes;

    @Version
    private long version;
}
