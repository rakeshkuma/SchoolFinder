package com.indiaschoolfinder.entity;

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
 * A parent's admission enquiry about one school. The parent agreed to it being shared with that school; staff forward it
 * by hand. Name, phone and email are removed when it is closed.
 */
@Getter
@Setter
@Entity
@Table(name = "admission_enquiry")
@EntityListeners(AuditingEntityListener.class)
public class AdmissionEnquiry {

    public enum Status { NEW, FORWARDED, CLOSED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(length = 100)
    private String parentName;

    @Column(length = 15)
    private String phone;

    @Column(length = 254)
    private String email;

    @Column(nullable = false, length = 20)
    private String classCode;

    @Column(length = 9)
    private String academicYear;

    @Column(length = 1000)
    private String message;

    @Column(nullable = false)
    private Instant consentedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status = Status.NEW;

    @Column(length = 500)
    private String staffNote;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @Column(length = 100)
    private String handledBy;
}
