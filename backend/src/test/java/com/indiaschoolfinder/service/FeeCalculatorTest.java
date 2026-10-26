package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.fee.FeeEstimate;
import com.indiaschoolfinder.entity.SchoolFee;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FeeCalculatorTest {

    private final FeeCalculator calculator = new FeeCalculator();

    private static SchoolFee completeFee() {
        SchoolFee fee = new SchoolFee();
        fee.setAcademicYear("2026-27");
        fee.setRegistrationFee(new BigDecimal("25.00"));
        fee.setAdmissionFee(new BigDecimal("200.00"));
        fee.setMonthlyTuition(new BigDecimal("4500.50"));
        fee.setTuitionMonths(12);
        fee.setAnnualCharges(new BigDecimal("6000"));
        fee.setDevelopmentCharges(new BigDecimal("3000"));
        fee.setOtherCharges(BigDecimal.ZERO);
        fee.setSecurityDeposit(new BigDecimal("500"));
        fee.setSecurityDepositRefundable(true);
        fee.setTransportMonthly(new BigDecimal("1800"));
        fee.setTransportMonths(11);
        fee.setBooksUniformEstimate(new BigDecimal("7500"));
        fee.setSourceUrl("https://example.org/fee-circular.pdf");
        return fee;
    }

    @Test
    void monthlyChargesAreMultipliedOnceAndAnnualChargesAreNot() {
        FeeCalculator.OfficialTotals totals = calculator.officialTotals(completeFee());

        // 4500.50 × 12 = 54006.00; + 6000 + 3000 + 0 = 63006.00
        assertThat(totals.recurringAnnual()).isEqualByComparingTo("63006.00");
        // + registration 25 + admission 200
        assertThat(totals.firstYear()).isEqualByComparingTo("63231.00");
        assertThat(totals.missingComponents()).isEmpty();
    }

    @Test
    void refundableDepositIsExcludedFromTotalsButIncludedInCashOutlay() {
        FeeEstimate estimate = calculator.estimate(completeFee(), 1L, "School", "NURSERY", FeeCalculator.Options.NONE);

        assertThat(estimate.firstYearTotal()).isEqualByComparingTo("63231.00");
        assertThat(estimate.refundableDeposit()).isEqualByComparingTo("500.00");
        assertThat(estimate.firstYearCashOutlay()).isEqualByComparingTo("63731.00");
        assertThat(estimate.lines()).filteredOn(l -> l.component().equals("securityDeposit"))
                .singleElement().satisfies(l -> {
                    assertThat(l.refundable()).isTrue();
                    assertThat(l.includedInRecurring()).isFalse();
                });
    }

    @Test
    void optionalTransportAndBooksAreAddedAndBooksAreMarkedAsEstimate() {
        FeeEstimate estimate = calculator.estimate(completeFee(), 1L, "School", "I",
                new FeeCalculator.Options(true, null, true));

        // transport 1800 × 11 = 19800; books estimate 7500
        assertThat(estimate.recurringAnnualTotal()).isEqualByComparingTo("90306.00");
        assertThat(estimate.firstYearTotal()).isEqualByComparingTo("90531.00");
        assertThat(estimate.lines()).filteredOn(l -> l.component().equals("booksUniform"))
                .singleElement().satisfies(l -> assertThat(l.official()).isFalse());
        assertThat(estimate.lines()).filteredOn(l -> l.component().equals("transport"))
                .singleElement().satisfies(l -> assertThat(l.multiplier()).isEqualTo(11));
        assertThat(estimate.formula()).anyMatch(f -> f.contains("not an official fee"));
    }

    @Test
    void requestedTransportMonthsOverrideTheSchoolDefault() {
        FeeEstimate estimate = calculator.estimate(completeFee(), 1L, "School", "I",
                new FeeCalculator.Options(true, 10, false));
        assertThat(estimate.recurringAnnualTotal()).isEqualByComparingTo("81006.00"); // 63006 + 1800 × 10
    }

    @Test
    void unknownComponentMakesTotalsUnavailableInsteadOfTreatingItAsZero() {
        SchoolFee fee = completeFee();
        fee.setDevelopmentCharges(null);

        FeeCalculator.OfficialTotals totals = calculator.officialTotals(fee);

        assertThat(totals.recurringAnnual()).isNull();
        assertThat(totals.firstYear()).isNull();
        assertThat(totals.missingComponents()).containsExactly("developmentCharges");
    }

    @Test
    void unknownOneTimeFeeKeepsRecurringButNotFirstYear() {
        SchoolFee fee = completeFee();
        fee.setRegistrationFee(null);

        FeeCalculator.OfficialTotals totals = calculator.officialTotals(fee);

        assertThat(totals.recurringAnnual()).isEqualByComparingTo("63006.00");
        assertThat(totals.firstYear()).isNull();
        assertThat(totals.missingComponents()).containsExactly("registrationFee");
    }

    @Test
    void requestingTransportWithoutPublishedTransportFeeIsReportedAsMissing() {
        SchoolFee fee = completeFee();
        fee.setTransportMonthly(null);

        FeeEstimate estimate = calculator.estimate(fee, 1L, "School", "I", new FeeCalculator.Options(true, null, false));

        assertThat(estimate.recurringAnnualTotal()).isNull();
        assertThat(estimate.missingComponents()).contains("transportMonthly");
    }

    @Test
    void moneyIsRoundedHalfUpToTwoDecimals() {
        SchoolFee fee = completeFee();
        fee.setMonthlyTuition(new BigDecimal("1000.005"));
        fee.setTuitionMonths(1);
        fee.setAnnualCharges(BigDecimal.ZERO);
        fee.setDevelopmentCharges(BigDecimal.ZERO);

        assertThat(calculator.officialTotals(fee).recurringAnnual()).isEqualByComparingTo("1000.01");
    }
}
