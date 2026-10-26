package com.indiaschoolfinder.dto.fee;

import com.indiaschoolfinder.validation.AcademicYear;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Fee schedule for one class and academic year. Leave a component null when the official
 * source does not state it; send 0 only when the source explicitly says there is no charge.
 * An existing record for the same class and year is updated (fee history is per academic year).
 */
public record FeeRequest(
        @NotBlank @Size(max = 20) String classCode,
        @NotBlank @AcademicYear String academicYear,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal registrationFee,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal admissionFee,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("1000000") BigDecimal monthlyTuition,
        @Min(1) @Max(12) Integer tuitionMonths,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("1000000") BigDecimal monthlyCharges,
        @Size(max = 500) String monthlyChargesDescription,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal annualCharges,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal developmentCharges,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal securityDeposit,
        Boolean securityDepositRefundable,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("1000000") BigDecimal transportMonthly,
        @Min(1) @Max(12) Integer transportMonths,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal booksUniformEstimate,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) @DecimalMax("10000000") BigDecimal otherCharges,
        @Size(max = 500) String otherChargesDescription,
        @NotBlank(message = "a source URL (fee circular or official page) is required") @HttpUrl String sourceUrl,
        @Size(max = 2000) String notes) {
}
