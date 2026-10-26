package com.indiaschoolfinder.dto.fee;

import com.indiaschoolfinder.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record FeeDto(
        Long id,
        Long schoolId,
        String classCode,
        String className,
        String academicYear,
        BigDecimal registrationFee,
        BigDecimal admissionFee,
        BigDecimal monthlyTuition,
        int tuitionMonths,
        BigDecimal monthlyCharges,
        String monthlyChargesDescription,
        BigDecimal annualCharges,
        BigDecimal developmentCharges,
        BigDecimal securityDeposit,
        boolean securityDepositRefundable,
        BigDecimal transportMonthly,
        Integer transportMonths,
        BigDecimal booksUniformEstimate,
        BigDecimal otherCharges,
        String otherChargesDescription,
        BigDecimal recurringAnnualOfficial,
        BigDecimal firstYearOfficial,
        List<String> missingComponents,
        String currency,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate,
        String notes) {
}
