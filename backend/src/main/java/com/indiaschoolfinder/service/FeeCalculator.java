package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.fee.FeeEstimate;
import com.indiaschoolfinder.dto.fee.FeeEstimate.FeeLine;
import com.indiaschoolfinder.dto.fee.FeeEstimate.Frequency;
import com.indiaschoolfinder.entity.SchoolFee;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure BigDecimal fee arithmetic.
 *
 * <pre>
 * Recurring annual (official) = (monthly tuition + monthly charges) × tuition months + annual charges
 *                               + development charges + other charges
 *                               (monthly charges and other charges are optional: null means none listed)
 * First year (official)       = registration fee + admission fee + recurring annual (official)
 * Optional additions          = transport monthly × transport months (official, if selected)
 *                             + books &amp; uniform (estimate, if selected) — added to both totals
 * Refundable deposit          = security deposit, reported separately and only added to "first-year cash outlay"
 * </pre>
 *
 * Each monthly component is multiplied exactly once and annual components are never multiplied,
 * so nothing is double counted. A component that is unknown (null) makes the dependent total
 * null and is listed in missingComponents — it is never treated as zero.
 */
@Component
public class FeeCalculator {

    private static final int SCALE = 2;

    public record OfficialTotals(BigDecimal recurringAnnual, BigDecimal firstYear, List<String> missingComponents) {
    }

    public record Options(boolean includeTransport, Integer transportMonths, boolean includeBooksAndUniform) {
        public static final Options NONE = new Options(false, null, false);
    }

    /** Derived values persisted on SchoolFee for filtering and display. */
    public OfficialTotals officialTotals(SchoolFee fee) {
        List<String> missing = new ArrayList<>();
        BigDecimal tuitionAnnual = fee.getMonthlyTuition() == null ? null
                : fee.getMonthlyTuition().multiply(BigDecimal.valueOf(fee.getTuitionMonths()));
        BigDecimal recurring = sum(missing,
                new Part("monthlyTuition", tuitionAnnual),
                new Part("annualCharges", fee.getAnnualCharges()),
                new Part("developmentCharges", fee.getDevelopmentCharges()));
        if (recurring != null) {
            recurring = recurring.add(monthlyChargesAnnual(fee)).add(orZero(fee.getOtherCharges()));
        }
        BigDecimal oneTime = sum(missing,
                new Part("registrationFee", fee.getRegistrationFee()),
                new Part("admissionFee", fee.getAdmissionFee()));
        BigDecimal firstYear = recurring == null || oneTime == null ? null : scale(recurring.add(oneTime));
        return new OfficialTotals(recurring == null ? null : scale(recurring), firstYear, List.copyOf(missing));
    }

    public FeeEstimate estimate(SchoolFee fee, Long schoolId, String schoolName, String classCode, Options options) {
        List<FeeLine> lines = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> formula = new ArrayList<>();

        addOneTime(lines, "registrationFee", "Registration fee", fee.getRegistrationFee(), true, false, false);
        addOneTime(lines, "admissionFee", "Admission fee (one-time)", fee.getAdmissionFee(), true, false, false);
        addLine(lines, "monthlyTuition", "Tuition fee", Frequency.MONTHLY, fee.getMonthlyTuition(), fee.getTuitionMonths(), true, false);
        addLine(lines, "monthlyCharges", fee.getMonthlyChargesDescription() == null ? "Other monthly charges"
                : "Monthly: " + fee.getMonthlyChargesDescription(), Frequency.MONTHLY, fee.getMonthlyCharges(), fee.getTuitionMonths(), true, false);
        // A yearly component billed monthly is stored as 0 and already appears in the monthly-charges line.
        boolean billedMonthly = fee.getMonthlyCharges() != null;
        if (!(billedMonthly && isZero(fee.getAnnualCharges()))) {
            addLine(lines, "annualCharges", "Annual charges", Frequency.ANNUAL, fee.getAnnualCharges(), 1, true, false);
        }
        if (!(billedMonthly && isZero(fee.getDevelopmentCharges()))) {
            addLine(lines, "developmentCharges", "Development charges", Frequency.ANNUAL, fee.getDevelopmentCharges(), 1, true, false);
        }
        addLine(lines, "otherCharges", fee.getOtherChargesDescription() == null ? "Other charges"
                : "Other charges: " + fee.getOtherChargesDescription(), Frequency.ANNUAL, fee.getOtherCharges(), 1, true, false);

        OfficialTotals official = officialTotals(fee);
        missing.addAll(official.missingComponents());
        BigDecimal recurring = official.recurringAnnual();
        BigDecimal firstYear = official.firstYear();
        formula.add("Recurring annual = (tuition " + fmt(fee.getMonthlyTuition())
                + (fee.getMonthlyCharges() == null ? "" : " + monthly charges " + fmt(fee.getMonthlyCharges()))
                + ") × " + fee.getTuitionMonths() + " months + annual " + fmt(fee.getAnnualCharges())
                + " + development " + fmt(fee.getDevelopmentCharges())
                + (fee.getOtherCharges() == null ? "" : " + other " + fmt(fee.getOtherCharges())));
        formula.add("First year = registration " + fmt(fee.getRegistrationFee()) + " + admission "
                + fmt(fee.getAdmissionFee()) + " + recurring annual");

        if (options.includeTransport()) {
            int months = options.transportMonths() != null ? options.transportMonths()
                    : fee.getTransportMonths() != null ? fee.getTransportMonths() : fee.getTuitionMonths();
            if (fee.getTransportMonthly() == null) {
                missing.add("transportMonthly");
                recurring = null;
                firstYear = null;
            } else {
                BigDecimal transport = fee.getTransportMonthly().multiply(BigDecimal.valueOf(months));
                lines.add(new FeeLine("transport", "School transport (optional)", Frequency.MONTHLY,
                        scale(fee.getTransportMonthly()), months, scale(transport), true, false, true, true, true));
                recurring = addIfKnown(recurring, transport);
                firstYear = addIfKnown(firstYear, transport);
                formula.add("+ transport " + fmt(fee.getTransportMonthly()) + " × " + months + " months");
            }
        }
        if (options.includeBooksAndUniform()) {
            if (fee.getBooksUniformEstimate() == null) {
                missing.add("booksUniformEstimate");
                recurring = null;
                firstYear = null;
            } else {
                lines.add(new FeeLine("booksUniform", "Books & uniform (estimate)", Frequency.ANNUAL,
                        scale(fee.getBooksUniformEstimate()), 1, scale(fee.getBooksUniformEstimate()),
                        false, false, true, true, true));
                recurring = addIfKnown(recurring, fee.getBooksUniformEstimate());
                firstYear = addIfKnown(firstYear, fee.getBooksUniformEstimate());
                formula.add("+ books & uniform estimate " + fmt(fee.getBooksUniformEstimate()) + " (not an official fee)");
            }
        }

        BigDecimal deposit = null;
        if (fee.getSecurityDeposit() != null) {
            deposit = scale(fee.getSecurityDeposit());
            lines.add(new FeeLine("securityDeposit", fee.isSecurityDepositRefundable()
                    ? "Security deposit (refundable)" : "Security deposit (non-refundable)", Frequency.ONE_TIME,
                    deposit, 1, deposit, true, fee.isSecurityDepositRefundable(), false, true, false));
        }
        BigDecimal cashOutlay = firstYear == null ? null
                : scale(deposit == null ? firstYear : firstYear.add(deposit));
        if (deposit != null) {
            formula.add("First-year cash outlay = first year + security deposit " + fmt(deposit)
                    + (fee.isSecurityDepositRefundable() ? " (refundable)" : ""));
        }

        return new FeeEstimate(schoolId, schoolName, classCode, fee.getAcademicYear(), true, lines,
                recurring == null ? null : scale(recurring), firstYear == null ? null : scale(firstYear),
                deposit, cashOutlay, List.copyOf(missing), formula, fee.getSourceUrl(),
                fee.getVerificationStatus(), fee.getLastVerifiedDate());
    }

    // ---------------------------------------------------------------------------------------------

    private record Part(String name, BigDecimal value) {
    }

    private static BigDecimal sum(List<String> missing, Part... parts) {
        BigDecimal total = BigDecimal.ZERO;
        boolean complete = true;
        for (Part part : parts) {
            if (part.value() == null) {
                missing.add(part.name());
                complete = false;
            } else {
                total = total.add(part.value());
            }
        }
        return complete ? total : null;
    }

    private static void addOneTime(List<FeeLine> lines, String component, String label, BigDecimal amount,
                                   boolean official, boolean refundable, boolean optional) {
        if (amount != null) {
            lines.add(new FeeLine(component, label, Frequency.ONE_TIME, scale(amount), 1, scale(amount),
                    official, refundable, optional, true, false));
        }
    }

    private static void addLine(List<FeeLine> lines, String component, String label, Frequency frequency,
                                BigDecimal amount, int multiplier, boolean official, boolean optional) {
        if (amount != null) {
            BigDecimal annual = amount.multiply(BigDecimal.valueOf(multiplier));
            lines.add(new FeeLine(component, label, frequency, scale(amount), multiplier, scale(annual),
                    official, false, optional, true, true));
        }
    }

    private static BigDecimal monthlyChargesAnnual(SchoolFee fee) {
        return orZero(fee.getMonthlyCharges()).multiply(BigDecimal.valueOf(fee.getTuitionMonths()));
    }

    private static boolean isZero(BigDecimal value) {
        return value != null && value.signum() == 0;
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal addIfKnown(BigDecimal total, BigDecimal addition) {
        return total == null ? null : total.add(addition);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String fmt(BigDecimal value) {
        return value == null ? "[not available]" : "₹" + scale(value).toPlainString();
    }
}
