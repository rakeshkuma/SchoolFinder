package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;
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

import java.time.LocalDate;

/** One admission cycle: school × class × academic year × category (general / EWS-DG / CWSN). */
@Getter
@Setter
@Entity
@Table(name = "admission_schedule")
public class AdmissionSchedule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private Long classId;

    @Column(nullable = false, length = 7)
    private String academicYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdmissionCategory category;

    private LocalDate applicationStartDate;
    private LocalDate applicationEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdmissionStatus status;

    /** When true the scheduler leaves status alone; an administrator set it from an official notice. */
    @Column(nullable = false)
    private boolean statusOverridden;

    private String statusOverrideReason;
    private String ageEligibility;
    private String selectionCriteria;
    private String officialNotificationUrl;
    private String applicationUrl;

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
