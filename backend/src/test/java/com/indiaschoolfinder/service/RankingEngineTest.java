package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.RankingCriterion;
import com.indiaschoolfinder.entity.SchoolRanking;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RankingEngineTest {

    private static final BigDecimal MIN_COVERAGE = new BigDecimal("70");
    private final RankingEngine engine = new RankingEngine();

    private static RankingCriterion criterion(String code, String weight) {
        RankingCriterion c = new RankingCriterion();
        c.setCode(code);
        c.setName(code);
        c.setWeight(new BigDecimal(weight));
        return c;
    }

    private static final List<RankingCriterion> CRITERIA = List.of(
            criterion("ACADEMIC_PERFORMANCE", "25"), criterion("TEACHING_QUALITY", "20"),
            criterion("INFRASTRUCTURE", "15"), criterion("SAFETY_WELLBEING", "15"),
            criterion("SPORTS_EXTRACURRICULAR", "10"), criterion("PARENT_FEEDBACK", "10"),
            criterion("ACCESSIBILITY_TRANSPORT", "5"));

    private static RankingEngine.Evidence ev(String score) {
        return new RankingEngine.Evidence(new BigDecimal(score), "https://example.org/evidence");
    }

    @Test
    void normalizesRawScoresToHundredAndRejectsInvalidMaximum() {
        assertThat(RankingEngine.normalize(new BigDecimal("45"), new BigDecimal("50"))).isEqualByComparingTo("90.00");
        assertThat(RankingEngine.normalize(new BigDecimal("1"), new BigDecimal("3"))).isEqualByComparingTo("33.33");
        assertThatThrownBy(() -> RankingEngine.normalize(BigDecimal.ONE, BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void ratingMapsOneToFiveStarsOntoZeroToHundred() {
        assertThat(RankingEngine.normalizeRating(new BigDecimal("1"))).isEqualByComparingTo("0");
        assertThat(RankingEngine.normalizeRating(new BigDecimal("3"))).isEqualByComparingTo("50");
        assertThat(RankingEngine.normalizeRating(new BigDecimal("5"))).isEqualByComparingTo("100");
    }

    @Test
    void fullEvidenceGivesWeightedAverageAndDefinitiveResult() {
        Map<String, RankingEngine.Evidence> evidence = Map.of(
                "ACADEMIC_PERFORMANCE", ev("80"), "TEACHING_QUALITY", ev("70"), "INFRASTRUCTURE", ev("90"),
                "SAFETY_WELLBEING", ev("60"), "SPORTS_EXTRACURRICULAR", ev("50"), "PARENT_FEEDBACK", ev("75"),
                "ACCESSIBILITY_TRANSPORT", ev("100"));

        RankingEngine.Result result = engine.score(1L, CRITERIA, evidence, MIN_COVERAGE);

        // (25×80 + 20×70 + 15×90 + 15×60 + 10×50 + 10×75 + 5×100) / 100 = 74.00
        assertThat(result.totalScore()).isEqualByComparingTo("74.00");
        assertThat(result.coveragePercent()).isEqualByComparingTo("100.00");
        assertThat(result.provisional()).isFalse();
        BigDecimal contributionSum = result.breakdown().stream().map(c -> c.contribution())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(contributionSum).isEqualByComparingTo("74.00");
    }

    @Test
    void missingCriteriaAreNotScoredAsZeroButLowerCoverageMakesResultProvisional() {
        Map<String, RankingEngine.Evidence> evidence = Map.of("ACADEMIC_PERFORMANCE", ev("80"), "INFRASTRUCTURE", ev("60"));

        RankingEngine.Result result = engine.score(1L, CRITERIA, evidence, MIN_COVERAGE);

        // Re-weighted over available evidence: (25×80 + 15×60) / 40 = 72.50, not (2000+900)/100 = 29
        assertThat(result.totalScore()).isEqualByComparingTo("72.50");
        assertThat(result.coveragePercent()).isEqualByComparingTo("40.00");
        assertThat(result.provisional()).isTrue();
        assertThat(result.breakdown()).filteredOn(c -> !c.dataAvailable()).hasSize(5);
    }

    @Test
    void coverageExactlyAtThresholdIsDefinitive() {
        Map<String, RankingEngine.Evidence> evidence = Map.of("ACADEMIC_PERFORMANCE", ev("50"), "TEACHING_QUALITY", ev("50"),
                "INFRASTRUCTURE", ev("50"), "SPORTS_EXTRACURRICULAR", ev("50")); // 25+20+15+10 = 70
        assertThat(engine.score(1L, CRITERIA, evidence, MIN_COVERAGE).provisional()).isFalse();
    }

    @Test
    void schoolWithoutAnyEvidenceIsNotScored() {
        assertThat(engine.score(1L, CRITERIA, Map.of(), MIN_COVERAGE)).isNull();
    }

    private static RankingEngine.Result result(long id, String score, String coverage, boolean provisional) {
        return new RankingEngine.Result(id, new BigDecimal(score), new BigDecimal(coverage), new BigDecimal(coverage),
                provisional, List.of());
    }

    private static RankingEngine.Evidence documented(String score) {
        return new RankingEngine.Evidence(new BigDecimal(score), "https://example.org/facilities", false,
                SchoolRanking.EvidenceType.DOCUMENTED_FACILITIES, "documented");
    }

    @Test
    void unverifiedEvidenceScoresButOnlyVerifiedEvidenceCountsTowardADefinitiveResult() {
        Map<String, RankingEngine.Evidence> evidence = Map.of(
                "ACADEMIC_PERFORMANCE", ev("80"), "SAFETY_WELLBEING", ev("60"),
                "TEACHING_QUALITY", documented("75"), "INFRASTRUCTURE", documented("100"));

        RankingEngine.Result result = engine.score(1L, CRITERIA, evidence, MIN_COVERAGE);

        // (25×80 + 15×60 + 20×75 + 15×100) / 75 = 78.67 over 75% evidence share, but only 40% verified.
        assertThat(result.totalScore()).isEqualByComparingTo("78.67");
        assertThat(result.coveragePercent()).isEqualByComparingTo("75.00");
        assertThat(result.verifiedCoveragePercent()).isEqualByComparingTo("40.00");
        assertThat(result.provisional()).isTrue();
        assertThat(result.breakdown()).filteredOn(c -> "INFRASTRUCTURE".equals(c.criterionCode())).singleElement()
                .satisfies(c -> {
                    assertThat(c.verified()).isFalse();
                    assertThat(c.evidenceType()).isEqualTo(SchoolRanking.EvidenceType.DOCUMENTED_FACILITIES);
                });
    }

    @Test
    void positionsUseCompetitionRankingAndSkipProvisionalResults() {
        List<RankingEngine.Result> results = List.of(
                result(1L, "90", "100", false), result(2L, "85", "100", false), result(3L, "85", "100", false),
                result(4L, "99", "30", true), result(5L, "70", "80", false));

        Map<Long, Integer> positions = engine.positions(results);

        assertThat(positions).containsEntry(1L, 1).containsEntry(2L, 2).containsEntry(3L, 2).containsEntry(5L, 4)
                .doesNotContainKey(4L);
    }
}
