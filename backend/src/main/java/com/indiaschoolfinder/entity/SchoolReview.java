package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.ReviewStatus;
import com.indiaschoolfinder.enums.ReviewerRelationship;
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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Parent review. Deliberately stores no email, phone, IP address or child details:
 * only an optional display name chosen by the reviewer.
 */
@Getter
@Setter
@Entity
@Table(name = "school_review")
@EntityListeners(AuditingEntityListener.class)
public class SchoolReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Column(length = 80)
    private String reviewerName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewerRelationship relationship;

    @Column(nullable = false)
    private short rating;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 3000)
    private String comment;

    @Column(nullable = false)
    private boolean consentGiven;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewStatus status = ReviewStatus.PENDING;

    private String moderationNote;
    private String moderatedBy;
    private Instant moderatedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
