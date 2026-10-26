package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.BoardingType;
import com.indiaschoolfinder.enums.EntranceExam;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Creates or replaces a school's boarding profile. Write only what the cited source states; leave the rest blank.
 * A saved profile is unverified until an editor verifies it against the source.
 */
public record BoardingProfileRequest(
        /* null when the source does not say whether every student boards */
        BoardingType boardingType,
        @NotNull ResidentialSystem residentialSystem,
        EntranceExam entranceExam,
        @Size(max = 100) String entryClasses,
        @Size(max = 500) String summary,
        @Size(max = 2000) String accommodation,
        @Size(max = 2000) String pastoralCare,
        @Size(max = 1000) String dining,
        @Size(max = 1000) String medicalCare,
        @Size(max = 500) String nearestTransport,
        @Size(max = 200) String academicSession,
        @NotBlank(message = "cite the source that states the boarding arrangement") @HttpUrl String sourceUrl) {
}
