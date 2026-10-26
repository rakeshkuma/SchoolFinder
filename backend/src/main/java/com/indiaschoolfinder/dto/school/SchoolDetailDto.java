package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record SchoolDetailDto(
        Long id,
        String name,
        String slug,
        String description,
        SchoolType schoolType,
        SchoolManagement management,
        SchoolNetwork network,
        EducationBoardDto board,
        String affiliationNumber,
        String udiseCode,
        String principalName,
        String managingBody,
        GenderType genderType,
        String mediumOfInstruction,
        List<SchoolClassDto> classesOffered,
        String websiteUrl,
        String admissionPortalUrl,
        String phone,
        String email,
        String addressLine,
        String locality,
        String city,
        DistrictRef district,
        String stateCode,
        String stateName,
        String stateSlug,
        String pinCode,
        Double latitude,
        Double longitude,
        BigDecimal studentTeacherRatio,
        String schoolTimings,
        Integer establishedYear,
        Boolean hasTransport,
        Boolean hasHostel,
        String accessibilityFeatures,
        String logoUrl,
        BigDecimal averageRating,
        int reviewCount,
        String sourceUrl,
        LocalDate sourceRetrievedDate,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate,
        boolean active,
        long version,
        Instant updatedAt,
        /* null when the school has no boarding profile */
        BoardingProfileDto boarding) {

    public record DistrictRef(String name, String slug) {
    }
}
