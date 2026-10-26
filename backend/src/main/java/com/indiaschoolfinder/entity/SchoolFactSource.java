package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.SchoolFact;
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

import java.time.LocalDate;

/** The source of one fact of a school profile, when it differs from the profile's own source_url. */
@Getter
@Setter
@Entity
@Table(name = "school_fact_source")
public class SchoolFactSource extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SchoolFact fact;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDate sourceRetrievedDate;

    /** e.g. the page's own wording, or how a map match was confirmed. */
    @Column(length = 500)
    private String note;
}
