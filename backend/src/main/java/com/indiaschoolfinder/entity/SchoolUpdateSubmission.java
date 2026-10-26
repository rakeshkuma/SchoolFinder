package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.SubmissionStatus;
import com.indiaschoolfinder.enums.SubmitterRole;
import com.indiaschoolfinder.enums.UpdateTopic;
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
 * An update or correction suggested by a school or a parent, citing the official page that states it. It is never
 * published as such: an editor checks the source and applies the change with the normal admin tools. The only personal
 * data is an optional reply e-mail, which is erased when the submission is closed.
 */
@Getter
@Setter
@Entity
@Table(name = "school_update_submission")
@EntityListeners(AuditingEntityListener.class)
public class SchoolUpdateSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UpdateTopic topic;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "submitter_role", nullable = false, length = 20)
    private SubmitterRole role;

    @Column(length = 200)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.NEW;

    @Column(length = 500)
    private String reviewerNote;

    @Column(length = 100)
    private String reviewedBy;

    private Instant reviewedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
