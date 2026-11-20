package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Someone who takes part in practice rankings: a member (accountId) or a guest holding a secret browser token (only
 * its hash is kept). Shown only by nickname, and only after opting in; see V28 for the consent rules.
 */
@Getter
@Setter
@Entity
@Table(name = "participant")
@EntityListeners(AuditingEntityListener.class)
public class Participant {

    public enum AgeBand { ADULT, MINOR, UNKNOWN }

    public enum ConsentMethod { GUEST_DECLARATION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 12, updatable = false)
    private String publicId;

    private Long accountId;

    @Column(length = 64)
    private String guestTokenHash;

    @Column(nullable = false, length = 24)
    private String nickname;

    @Column(length = 2)
    private String stateCode;

    @Column(length = 80)
    private String city;

    private boolean showCity;

    @Column(length = 40)
    private String track;

    @Column(nullable = false, length = 10)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private AgeBand ageBand = AgeBand.UNKNOWN;

    private boolean publicListing;

    private Instant guardianConsentAt;

    @Column(length = 20)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private ConsentMethod consentMethod;

    private boolean hidden;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    /** Listed publicly: opted in, allowed for their age, and not hidden by a moderator. */
    public boolean isListed() {
        return publicListing && !hidden
                && (ageBand == AgeBand.ADULT || (ageBand == AgeBand.MINOR && guardianConsentAt != null));
    }
}
