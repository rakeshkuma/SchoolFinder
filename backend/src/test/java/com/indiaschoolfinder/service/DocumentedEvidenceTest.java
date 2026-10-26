package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.SchoolRanking.EvidenceType;
import com.indiaschoolfinder.enums.FacilityCategory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.indiaschoolfinder.enums.FacilityCategory.COMPUTER;
import static com.indiaschoolfinder.enums.FacilityCategory.HOSTEL;
import static com.indiaschoolfinder.enums.FacilityCategory.LABORATORY;
import static com.indiaschoolfinder.enums.FacilityCategory.LIBRARY;
import static org.assertj.core.api.Assertions.assertThat;

class DocumentedEvidenceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 25);
    private static final LocalDate CUTOFF = TODAY.minusYears(3);
    private static final List<FacilityCategory> INFRA = DocumentedEvidence.CHECKLISTS.get("INFRASTRUCTURE");
    private static final BigDecimal BEST = new BigDecimal("20");
    private static final BigDecimal WORST = new BigDecimal("40");

    private static DocumentedEvidence.Item item(FacilityCategory c, boolean available, boolean verified, LocalDate date) {
        return new DocumentedEvidence.Item(c, available, verified, "https://example.org/" + c, date);
    }

    @Test
    void checklistScoreIsTheDocumentedShareAndCategoriesCountOnce() {
        RankingEngine.Evidence e = DocumentedEvidence.fromChecklist(INFRA, List.of(
                item(LIBRARY, true, false, TODAY), item(LABORATORY, true, false, TODAY),
                item(LABORATORY, true, false, TODAY), item(HOSTEL, true, false, TODAY)), CUTOFF);

        assertThat(e.normalizedScore()).isEqualByComparingTo("66.67");
        assertThat(e.verified()).isFalse();
        assertThat(e.type()).isEqualTo(EvidenceType.DOCUMENTED_FACILITIES);
        assertThat(e.note()).startsWith("2 of 3 checklist items documented: Library, Science laboratory")
                .contains("not yet verified");
    }

    @Test
    void nothingStatedMeansNoEvidenceRatherThanZero() {
        assertThat(DocumentedEvidence.fromChecklist(INFRA, List.of(), CUTOFF)).isNull();
        assertThat(DocumentedEvidence.fromChecklist(INFRA, List.of(item(HOSTEL, true, true, TODAY)), CUTOFF)).isNull();
    }

    @Test
    void statedAbsenceScoresZeroButIsStillEvidence() {
        RankingEngine.Evidence e = DocumentedEvidence.fromChecklist(INFRA,
                List.of(item(COMPUTER, false, true, TODAY)), CUTOFF);
        assertThat(e.normalizedScore()).isEqualByComparingTo("0");
        assertThat(e.verified()).isTrue();
    }

    @Test
    void outdatedOrUndatedStatementsAreIgnored() {
        assertThat(DocumentedEvidence.fromChecklist(INFRA, List.of(
                item(LIBRARY, true, true, CUTOFF.minusDays(1)), item(COMPUTER, true, true, null)), CUTOFF)).isNull();
        assertThat(DocumentedEvidence.fromChecklist(INFRA, List.of(item(LIBRARY, true, true, CUTOFF)), CUTOFF))
                .isNotNull();
    }

    @Test
    void evidenceIsVerifiedOnlyWhenEveryStatedItemIsVerified() {
        RankingEngine.Evidence mixed = DocumentedEvidence.fromChecklist(INFRA, List.of(
                item(LIBRARY, true, true, TODAY), item(COMPUTER, true, false, TODAY)), CUTOFF);
        assertThat(mixed.verified()).isFalse();
        // A verified statement for the same category replaces an unverified one.
        RankingEngine.Evidence upgraded = DocumentedEvidence.fromChecklist(INFRA, List.of(
                item(LIBRARY, true, true, TODAY), item(COMPUTER, true, false, TODAY), item(COMPUTER, true, true, TODAY)),
                CUTOFF);
        assertThat(upgraded.verified()).isTrue();
    }

    @Test
    void studentTeacherRatioUsesThePublishedLinearScale() {
        assertThat(ratio("15").normalizedScore()).isEqualByComparingTo("100");
        assertThat(ratio("20").normalizedScore()).isEqualByComparingTo("100");
        assertThat(ratio("30").normalizedScore()).isEqualByComparingTo("50");
        assertThat(ratio("40").normalizedScore()).isEqualByComparingTo("0");
        assertThat(ratio("55").normalizedScore()).isEqualByComparingTo("0");
        assertThat(ratio("30").type()).isEqualTo(EvidenceType.PUBLISHED_RATIO);
    }

    @Test
    void studentTeacherRatioNeedsASourceAndACurrentDate() {
        assertThat(DocumentedEvidence.fromStudentTeacherRatio(null, BEST, WORST, false, "https://x.org", TODAY, CUTOFF))
                .isNull();
        assertThat(DocumentedEvidence.fromStudentTeacherRatio(new BigDecimal("25"), BEST, WORST, false, null, TODAY,
                CUTOFF)).isNull();
        assertThat(DocumentedEvidence.fromStudentTeacherRatio(new BigDecimal("25"), BEST, WORST, false, "https://x.org",
                CUTOFF.minusDays(1), CUTOFF)).isNull();
    }

    private static RankingEngine.Evidence ratio(String value) {
        return DocumentedEvidence.fromStudentTeacherRatio(new BigDecimal(value), BEST, WORST, false,
                "https://example.org/udise", TODAY, CUTOFF);
    }
}
