package com.indiaschoolfinder.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * A blog article. It is public only when its status is PUBLISHED and {@code publishedAt} has passed (a later time schedules
 * it); every other status is visible to staff only.
 */
@Getter
@Setter
@Entity
@Table(name = "blog_post")
@EntityListeners(AuditingEntityListener.class)
public class BlogPost {

    /** Codes stay stable (they are in URLs and the API); each has a page address and a reader-facing label. */
    public enum Category {
        ADMISSIONS("school-admissions", "School Admissions"),
        BOARDING_SCHOOLS("boarding-schools", "Boarding Schools"),
        GOVERNMENT_SCHOOLS("government-schools", "Government Schools"),
        ENTRANCE_EXAMS("entrance-exams", "Entrance Examinations"),
        EDUCATION_NEWS("education-news", "Education News and Updates"),
        PARENTING_TIPS("parenting", "Parenting and Child Development"),
        BOARD_COMPARISON("academic-guidance", "Academic Guidance"),
        SCHOOL_REVIEWS("school-comparisons", "School Reviews and Comparisons"),
        FEES_SCHOLARSHIPS("fees-and-scholarships", "Fees and Scholarships");

        private final String slug;
        private final String label;

        Category(String slug, String label) {
            this.slug = slug;
            this.label = label;
        }

        public String slug() {
            return slug;
        }

        public String label() {
            return label;
        }

        public static java.util.Optional<Category> bySlug(String slug) {
            return java.util.Arrays.stream(values()).filter(c -> c.slug.equals(slug)).findFirst();
        }
    }

    /** Draft, fact check, editorial review, approved, published. */
    public enum Status { DRAFT, FACT_CHECK, REVIEW, APPROVED, PUBLISHED }

    /** A source the article relies on, with the day it was checked. */
    @Embeddable
    @Getter
    @Setter
    public static class Source {
        @Column(nullable = false, length = 200)
        private String title;
        @Column(nullable = false, length = 500)
        private String url;
        private java.time.LocalDate checkedOn;
    }

    @Embeddable
    @Getter
    @Setter
    public static class Faq {
        @Column(nullable = false, length = 300)
        private String question;
        @Column(nullable = false, length = 2000)
        private String answer;
    }

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.DRAFT;

    @Column(nullable = false)
    private boolean featured;

    @Column(nullable = false)
    private boolean sponsored;

    @Column(length = 300)
    private String tags;

    private java.time.LocalDate lastReviewedOn;

    @ElementCollection
    @CollectionTable(name = "blog_post_source", joinColumns = @JoinColumn(name = "post_id"))
    @OrderColumn(name = "position")
    private java.util.List<Source> sources = new java.util.ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "blog_post_faq", joinColumns = @JoinColumn(name = "post_id"))
    @OrderColumn(name = "position")
    private java.util.List<Faq> faqs = new java.util.ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;
}
