package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.BoardingType;
import com.indiaschoolfinder.enums.EntranceExam;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Boarding profile of a residential school (at most one per school). Every text field holds only what the cited source
 * states; null means "not stated by the source".
 */
@Getter
@Setter
@Entity
@Table(name = "school_boarding")
public class SchoolBoarding extends AuditableEntity {

    @Id
    private Long schoolId;

    /** null = the source says the school is residential but not whether every student boards. */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BoardingType boardingType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResidentialSystem residentialSystem;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EntranceExam entranceExam;

    /** e.g. "VI and IX"; free text because entry rules differ by system. */
    @Column(length = 100)
    private String entryClasses;

    /** One or two sentences for cards, written from the cited source. */
    @Column(length = 500)
    private String summary;

    @Column(length = 2000)
    private String accommodation;

    @Column(length = 2000)
    private String pastoralCare;

    @Column(length = 1000)
    private String dining;

    @Column(length = 1000)
    private String medicalCare;

    @Column(length = 500)
    private String nearestTransport;

    @Column(length = 200)
    private String academicSession;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate lastVerifiedDate;

    @Version
    private long version;
}
