package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Card-sized view used by directory, search and nearby results. Null fields are "not available". */
public record SchoolSummaryDto(
        Long id,
        String name,
        String slug,
        SchoolType schoolType,
        SchoolManagement management,
        SchoolNetwork network,
        String boardCode,
        String locality,
        String city,
        String districtName,
        String stateCode,
        String stateName,
        String pinCode,
        Boolean hasHostel,
        String logoUrl,
        String coverImageUrl,
        String coverImageCredit,
        BigDecimal averageRating,
        int reviewCount,
        Double latitude,
        Double longitude,
        Double distanceKm,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate,
        /* lowest complete official recurring annual fee in the latest year with one, or null */
        BigDecimal annualFeeFrom,
        String annualFeeYear,
        /* OPEN if any cycle is open, else UPCOMING if any is upcoming, else null */
        com.indiaschoolfinder.enums.AdmissionStatus admissionStatus,
        com.indiaschoolfinder.enums.GenderType genderType,
        String websiteUrl,
        /* boarding profile facts; all null for schools without a boarding profile */
        com.indiaschoolfinder.enums.BoardingType boardingType,
        com.indiaschoolfinder.enums.ResidentialSystem residentialSystem,
        com.indiaschoolfinder.enums.EntranceExam entranceExam,
        String entryClasses,
        String boardingSummary,
        VerificationStatus boardingVerificationStatus,
        /* lowest and highest class offered (names), null when the classes are not published */
        String classesFrom,
        String classesTo,
        /* facility categories a cited source states are available, in enum order */
        java.util.List<com.indiaschoolfinder.enums.FacilityCategory> facilityCategories,
        String admissionPortalUrl,
        /* date the cited source was read; lastVerifiedDate is set only after an editor's verification */
        LocalDate sourceRetrievedDate,
        /* true when the cover is an illustration, not a photograph of this school */
        boolean coverImageIllustrative) {
}
