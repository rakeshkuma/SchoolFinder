package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * A school profile. Nullable columns mean "unknown / not published by an official source";
 * they must never be filled with placeholder values. Child records (fees, admissions, images …)
 * reference the school through an explicit school_id column rather than a bidirectional graph.
 */
@Getter
@Setter
@Entity
@Table(name = "school")
public class School extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SchoolType schoolType;

    /** FK to education_board.code. Kept as a plain column: filters only need the code. */
    @Column(name = "education_board_code", length = 20)
    private String educationBoardCode;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private GenderType genderType;

    /** Derived on save: name initials ("dps", "kv"), compact name and board code, for search. */
    @Setter(lombok.AccessLevel.NONE)
    @Column(length = 1000)
    private String searchKeywords;

    private String mediumOfInstruction;
    private String websiteUrl;
    private String admissionPortalUrl;
    private String phone;
    private String email;
    private String addressLine;
    private String locality;
    private String city;

    /** FK to state.code (ISO 3166-2:IN). */
    @Column(name = "state_code", nullable = false, length = 2)
    private String stateCode;

    /** FK to district.id; null when no source has stated the district. */
    @Column(name = "district_id")
    private Long districtId;

    @Column(length = 6)
    private String pinCode;

    /** 11-digit UDISE+ code; the school's identity when present. */
    @Column(length = 11)
    private String udiseCode;

    /** Board affiliation / school number as published by the board. */
    @Column(length = 30)
    private String affiliationNumber;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SchoolManagement management;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private SchoolNetwork network;

    /** Head of institution as published by the board or the school. */
    @Column(length = 150)
    private String principalName;

    /** Trust, society or authority that runs the school, as published. */
    @Column(length = 300)
    private String managingBody;

    private Double latitude;
    private Double longitude;

    /** Students per teacher; only stored when published by an official source. */
    private BigDecimal studentTeacherRatio;

    private String schoolTimings;
    private Integer establishedYear;
    private Boolean hasTransport;
    private Boolean hasHostel;
    private String accessibilityFeatures;
    private String logoUrl;

    /** Denormalised from approved reviews to avoid aggregate queries on every listing. */
    private BigDecimal averageRating;

    @Column(nullable = false)
    private int reviewCount;

    @Column(nullable = false)
    private String sourceUrl;

    private LocalDate sourceRetrievedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    private LocalDate lastVerifiedDate;

    @Column(nullable = false)
    private boolean active = true;

    /** Recommended-order score maintained by ProfileScoreService in SQL; never written through the entity. */
    @Column(nullable = false, insertable = false, updatable = false)
    private int profileScore;

    /** Turn of this school's state within its profile_score tier (ProfileScoreService); never written through the entity. */
    @Column(insertable = false, updatable = false)
    private Integer recommendedTurn;

    @Version
    private long version;

    /** Many-to-many is justified: class filters and directory pages need the offered levels. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "school_class_offered",
            joinColumns = @JoinColumn(name = "school_id"),
            inverseJoinColumns = @JoinColumn(name = "class_id"))
    private Set<SchoolClass> classesOffered = new LinkedHashSet<>();

    @PrePersist
    @PreUpdate
    void deriveSearchKeywords() {
        searchKeywords = keywordsFor(name, educationBoardCode);
    }

    /** Same algorithm as the V3 migration backfill. */
    public static String keywordsFor(String name, String boardCode) {
        String lower = name == null ? "" : name.toLowerCase(Locale.ROOT);
        StringBuilder initials = new StringBuilder();
        for (String word : lower.split("[^a-z0-9]+")) {
            if (!word.isEmpty()) {
                initials.append(word.charAt(0));
            }
        }
        String compact = lower.replaceAll("[^a-z0-9]+", "");
        String board = boardCode == null ? "" : " " + boardCode.toLowerCase(Locale.ROOT);
        return (initials + " " + compact + board).trim();
    }
}
