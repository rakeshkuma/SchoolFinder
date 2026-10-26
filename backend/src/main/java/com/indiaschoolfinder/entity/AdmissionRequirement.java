package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.RequirementType;
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

/** A required document, an eligibility rule, or a selection criterion (with optional points). */
@Getter
@Setter
@Entity
@Table(name = "admission_requirement")
public class AdmissionRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long admissionScheduleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequirementType requirementType;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private boolean mandatory = true;

    private Integer points;

    @Column(nullable = false)
    private int sortOrder;
}
