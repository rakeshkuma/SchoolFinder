package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.dto.exam.ExamContent;
import com.indiaschoolfinder.enums.ExamBoarding;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamMode;
import com.indiaschoolfinder.enums.ExamSchoolType;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamVerificationStatus;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** A school entrance exam or admission selection process, with its official sources and last verification date. */
@Getter
@Setter
@Entity
@Table(name = "exam")
@EntityListeners(AuditingEntityListener.class)
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(nullable = false, length = 40)
    private String shortName;

    @Column(nullable = false, length = 250)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamKind kind;

    @Column(nullable = false, length = 300)
    private String conductingAuthority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExamScope scope;

    /** ISO 3166-2:IN codes of the states whose candidates may apply; empty for national exams. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> stateCodes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<ExamSchoolType> schoolTypes = new ArrayList<>();

    /** Classes admitted through the exam, as numbers (6 = Class VI). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<Integer> entryClasses = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExamBoarding boarding;

    /** NULL when the official notice does not settle it. */
    private Boolean applicationFree;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ExamMode examMode;

    /** Label of the cycle the page describes, e.g. "JNVST-2027"; statuses use this cycle's dates only. */
    @Column(nullable = false, length = 40)
    private String currentCycle;

    @Column(length = 9)
    private String academicSession;

    @Column(nullable = false, length = 1000)
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private ExamContent content;

    @Column(nullable = false)
    private int displayOrder = 100;

    private LocalDate lastVerifiedOn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExamVerificationStatus verificationStatus = ExamVerificationStatus.DRAFT;

    @Column(nullable = false)
    private boolean published;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
