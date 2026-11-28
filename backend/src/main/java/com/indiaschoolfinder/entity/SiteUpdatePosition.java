package com.indiaschoolfinder.entity;

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

/**
 * One post advertised by a recruitment notice (a site_update of category JOB): "PGT" in "Physics", say. Read from the
 * notice's title by the daily check (origin TITLE), or entered by an editor from the notice itself (origin EDITOR),
 * which then replaces the ones read from the title. Every field other than the post's name is optional and is filled
 * only from the notice.
 */
@Getter
@Setter
@Entity
@Table(name = "site_update_position")
public class SiteUpdatePosition {

    public enum Origin { TITLE, EDITOR }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "site_update_id", nullable = false)
    private Long siteUpdateId;

    @Column(nullable = false, length = 120)
    private String postName;

    /** A post type code (PGT, TGT, PRT, PRINCIPAL...), see OpportunityClassifier. */
    @Column(length = 20)
    private String postType;

    @Column(length = 80)
    private String subject;

    @Column(length = 40)
    private String postCode;

    private Integer vacancies;

    @Column(length = 120)
    private String payScale;

    @Column(length = 400)
    private String qualification;

    @Column(nullable = false)
    private int sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Origin origin = Origin.TITLE;
}
