package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.BoardingType;
import com.indiaschoolfinder.enums.EntranceExam;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.LocalDate;

/** Boarding profile; null text fields are "not stated by the source". */
public record BoardingProfileDto(
        Long schoolId,
        BoardingType boardingType,
        ResidentialSystem residentialSystem,
        boolean governmentSystem,
        boolean defenceOriented,
        EntranceExam entranceExam,
        String entryClasses,
        String summary,
        String accommodation,
        String pastoralCare,
        String dining,
        String medicalCare,
        String nearestTransport,
        String academicSession,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate) {
}
