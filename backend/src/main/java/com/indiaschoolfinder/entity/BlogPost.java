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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/** A blog article. A draft has no {@code publishedAt} and is visible to staff only. */
@Getter
@Setter
@Entity
@Table(name = "blog_post")
@EntityListeners(AuditingEntityListener.class)
public class BlogPost {

    public enum Category { ADMISSIONS, BOARD_COMPARISON, FEES_SCHOLARSHIPS, PARENTING_TIPS, SCHOOL_REVIEWS }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 300)
    private String excerpt;

    /** Plain text with light formatting: ## and ### headings, - and 1. lists, **bold** and [links](url). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Column(length = 500)
    private String coverImageUrl;

    @Column(length = 200)
    private String coverImageAlt;

    @Column(nullable = false, length = 100)
    private String authorName;

    @Column(length = 400)
    private String authorBio;

    @Column(length = 70)
    private String metaTitle;

    @Column(length = 170)
    private String metaDescription;

    private Instant publishedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
