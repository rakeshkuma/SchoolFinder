package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Create/update payload. Only editable fields are present, which prevents mass assignment of
 * id, slug, ratings, active flag, verification status or audit columns.
 * Coordinates are restricted to a bounding box around India, including the island territories.
 */
public record SchoolRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 5000) String description,
        @NotNull SchoolType schoolType,
        SchoolManagement management,
        SchoolNetwork network,
        @Size(max = 20) String boardCode,
        @Size(max = 30) @Pattern(regexp = "^[A-Za-z0-9/\\-]*$", message = "may contain only letters, digits, / and -") String affiliationNumber,
        @Pattern(regexp = "^\\d{11}$", message = "must be an 11-digit UDISE+ code") String udiseCode,
        @Size(max = 150) String principalName,
        @Size(max = 300) String managingBody,
        GenderType genderType,
        @Size(max = 100) String mediumOfInstruction,
        List<@NotBlank @Size(max = 20) String> classCodes,
        @HttpUrl String websiteUrl,
        @HttpUrl String admissionPortalUrl,
        @Size(max = 120) @Pattern(regexp = "^[0-9+()\\-\\s,/]*$", message = "may contain only digits, spaces and + ( ) - , /") String phone,
        @Email @Size(max = 150) String email,
        @Size(max = 400) String addressLine,
        @Size(max = 120) String locality,
        @Size(max = 80) String city,
        @Size(max = 100) String district,
        /* ISO 3166-2:IN code ("UP") or full name ("Uttar Pradesh") */
        @NotBlank(message = "a state or union territory is required") @Size(max = 80) String stateCode,
        @Pattern(regexp = "^[1-9]\\d{5}$", message = "must be a 6-digit Indian PIN code") String pinCode,
        @DecimalMin("6.0") @DecimalMax("37.5") Double latitude,
        @DecimalMin("68.0") @DecimalMax("97.5") Double longitude,
        @DecimalMin(value = "1.0") @DecimalMax(value = "200.0") BigDecimal studentTeacherRatio,
        @Size(max = 200) String schoolTimings,
        @Min(1800) @Max(2100) Integer establishedYear,
        Boolean hasTransport,
        Boolean hasHostel,
        @Size(max = 2000) String accessibilityFeatures,
        @HttpUrl String logoUrl,
        @NotBlank(message = "a source URL is required for every school record") @HttpUrl String sourceUrl,
        @PastOrPresent LocalDate sourceRetrievedDate) {
}
