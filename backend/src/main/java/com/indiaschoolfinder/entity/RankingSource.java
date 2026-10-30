package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;
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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

/** A ranking published independently by a third party, displayed separately from this site's score. */
@Getter
@Setter
@Entity
@Table(name = "ranking_source")
@EntityListeners(AuditingEntityListener.class)
public class RankingSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(nullable = false)
    private String publisher;

    @Column(nullable = false)
    private String rankingName;

    @Column(nullable = false, length = 20)
    private String rankingYear;

    private String category;
    private Integer rankPosition;
    private String scoreText;

    @Column(nullable = false)
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDate retrievedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private Long publisherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RankingScope scope = RankingScope.NATIONAL;

    /** The state or city named by the publisher for a STATE or CITY ranking. */
    @Column(length = 100)
    private String region;

    /** A paid or "featured" listing: shown only with that label, never as a ranking position. */
    @Column(nullable = false)
    private boolean sponsored;

    @Column(length = 500)
    private String notes;

    private LocalDate lastVerifiedDate;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
