package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.RankingPublisherKind;
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

/** A publisher of independent rankings. Its website and methodology come from the publisher's own pages. */
@Getter
@Setter
@Entity
@Table(name = "ranking_publisher")
public class RankingPublisher extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RankingPublisherKind kind;

    @Column(length = 500)
    private String websiteUrl;

    @Column(length = 500)
    private String methodologyUrl;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private boolean active = true;
}
