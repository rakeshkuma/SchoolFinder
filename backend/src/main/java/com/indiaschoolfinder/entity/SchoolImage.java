package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.VerificationStatus;
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

/** Image metadata only; the binary lives in Cloudinary or at the official source URL. */
@Getter
@Setter
@Entity
@Table(name = "school_image")
public class SchoolImage extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImageType imageType;

    @Column(nullable = false, length = 600)
    private String url;

    private String storagePublicId;
    private String caption;

    @Column(nullable = false)
    private String altText;

    private String credit;

    @Column(nullable = false)
    private String license;

    @Column(nullable = false)
    private String sourceUrl;

    @Column(length = 600)
    private String thumbnailUrl;

    @Column(length = 500)
    private String attributionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ImagePermission permissionStatus = ImagePermission.PENDING;

    @Column(length = 500)
    private String permissionNote;

    /** A generic illustration, not a photograph of this school. */
    @Column(nullable = false)
    private boolean illustrative;

    private Integer width;
    private Integer height;

    @Column(nullable = false)
    private int sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate lastVerifiedDate;
}
