package com.indiaschoolfinder.dto.fee;

import com.indiaschoolfinder.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Result for one school/class. Totals are null when a required official component is unknown
 * (see missingComponents) — the calculator never treats an unknown amount as zero.
 */
public record FeeEstimate(
        Long schoolId,
        String schoolName,
        String classCode,
        String academicYear,
        boolean feeDataAvailable,
        List<FeeLine> lines,
        BigDecimal recurringAnnualTotal,
        BigDecimal firstYearTotal,
        BigDecimal refundableDeposit,
        BigDecimal firstYearCashOutlay,
        List<String> missingComponents,
        List<String> formula,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate) {

    public enum Frequency { ONE_TIME, MONTHLY, ANNUAL }

    /** official=false marks estimates (books/uniform); refundable=true marks deposits. */
    public record FeeLine(
            String component,
            String label,
            Frequency frequency,
            BigDecimal amount,
            int multiplier,
            BigDecimal annualisedAmount,
            boolean official,
            boolean refundable,
            boolean optional,
            boolean includedInFirstYear,
            boolean includedInRecurring) {
    }
}
