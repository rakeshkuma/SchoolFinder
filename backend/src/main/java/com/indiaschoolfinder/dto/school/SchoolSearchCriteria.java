package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.BoardingType;
import com.indiaschoolfinder.enums.EntranceExam;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolStage;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.validation.AcademicYear;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** Query parameters accepted by GET /api/v1/schools and /api/v1/schools/search. */
public record SchoolSearchCriteria(
        @Size(max = 100) String q,
        @Size(max = 100) String name,
        @Size(max = 120) String locality,
        /* ISO code ("UP") or slug ("uttar-pradesh") */
        @Size(max = 80) String state,
        /* district slug; combine with state, as slugs are unique only within a state */
        @Size(max = 110) String district,
        @Size(max = 80) String city,
        @Pattern(regexp = "^\\d{6}$", message = "must be a 6-digit PIN code") String pinCode,
        @Size(max = 20) String board,
        SchoolType schoolType,
        SchoolManagement management,
        SchoolNetwork network,
        @Size(max = 20) String className,
        SchoolStage stage,
        @DecimalMin("0") BigDecimal minAnnualFee,
        @DecimalMin("0") BigDecimal maxAnnualFee,
        @AcademicYear String feeAcademicYear,
        AdmissionStatus admissionStatus,
        @DecimalMin("1") @DecimalMax("5") BigDecimal minRating,
        /* true = boarding (source states a hostel); false = day schools (source states no hostel) */
        Boolean hasHostel,
        /* true = source states that school transport is available */
        Boolean hasTransport,
        /* medium of instruction as stated by the source, e.g. "English" (matches "English, Hindi") */
        @Size(max = 40) String medium,
        GenderType genderType,
        /* every listed facility category must be stated as available, e.g. facility=LIBRARY,LABORATORY */
        @Size(max = 11) List<FacilityCategory> facility,
        /* true = has a boarding profile (residential school); false = has none */
        Boolean boarding,
        BoardingType boardingType,
        /* any of the listed systems, e.g. residentialSystem=SAINIK,MILITARY_SCHOOL,MILITARY_COLLEGE */
        @Size(max = 7) List<ResidentialSystem> residentialSystem,
        EntranceExam entranceExam,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @DecimalMin("0.1") @DecimalMax("50") Double radiusKm,
        String sortBy,
        String sortDirection,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size) {

    /** Free-text query only, every filter unset. */
    public static SchoolSearchCriteria ofQuery(String q) {
        return new SchoolSearchCriteria(q, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    public int pageOrDefault() {
        return page == null ? 0 : page;
    }

    public int sizeOrDefault() {
        return size == null ? 20 : size;
    }

    public boolean hasLocation() {
        return latitude != null && longitude != null;
    }
}
