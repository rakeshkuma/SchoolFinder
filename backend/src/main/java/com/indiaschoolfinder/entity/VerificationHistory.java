package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.VerifiableEntityType;
import com.indiaschoolfinder.enums.VerificationStatus;
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

import java.time.Instant;

/** Append-only log of verification decisions. */
@Getter
@Setter
@Entity
@Table(name = "verification_history")
public class VerificationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private VerifiableEntityType entityType;

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false)
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VerificationStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus newStatus;

    @Column(nullable = false)
    private String sourceUrl;

    private String notes;

    @Column(nullable = false)
    private String verifiedBy;

    @Column(nullable = false)
    private Instant verifiedAt;
}
