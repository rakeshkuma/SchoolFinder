package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.DocumentStatus;
import com.indiaschoolfinder.enums.ExtractionMethod;
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

import java.time.Instant;
import java.time.LocalDate;

/** An official notice (PDF or image) kept for review, with the text read from it and the reviewer's corrected text. */
@Getter
@Setter
@Entity
@Table(name = "source_document")
public class SourceDocument extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long schoolId;

    @Column(length = 60)
    private String examSlug;

    @Column(nullable = false, length = 300)
    private String title;

    /** The page where the notice is published. */
    @Column(nullable = false, length = 600)
    private String sourceUrl;

    private LocalDate publishedOn;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false, length = 100)
    private String contentType;

    @Column(nullable = false)
    private long sizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private int pageCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExtractionMethod extractionMethod;

    @Column(columnDefinition = "text")
    private String extractedText;

    @Column(columnDefinition = "text")
    private String reviewedText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentStatus status = DocumentStatus.PENDING_REVIEW;

    @Column(length = 1000)
    private String reviewNote;

    @Column(length = 100)
    private String reviewedBy;

    private Instant reviewedAt;
}
