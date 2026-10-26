package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.RankingCriterion;
import com.indiaschoolfinder.entity.SchoolRanking.CriterionContribution;
import com.indiaschoolfinder.entity.SchoolRanking.EvidenceType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Pure scoring logic (no I/O) so it can be unit tested exhaustively.
 *
 * <pre>
 * normalized_i      = raw_i / max_i × 100                      (0–100, per criterion)
 * coverage          = Σ weight_i (criteria with any evidence) / Σ weight_i (all active criteria) × 100
 * verified coverage = Σ weight_i (criteria with verified evidence) / Σ weight_i (all active criteria) × 100
 * score             = Σ (weight_i × normalized_i) / Σ weight_i (criteria with evidence)     (0–100)
 * provisional       = verified coverage &lt; minimum coverage
 * </pre>
 * Missing criteria are not scored as zero; instead the result is re-weighted over the evidence
 * that exists and flagged provisional when verified evidence is insufficient. Documented but unverified evidence can
 * score a criterion but never makes a result definitive. Provisional results never receive a rank position.
 */
@Component
public class RankingEngine {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal FOUR = new BigDecimal("4");

    public record Evidence(BigDecimal normalizedScore, String sourceUrl, boolean verified, EvidenceType type,
                           String note) {

        /** An administrator-verified criterion score. */
        public Evidence(BigDecimal normalizedScore, String sourceUrl) {
            this(normalizedScore, sourceUrl, true, EvidenceType.VERIFIED_SCORE, null);
        }
    }

    public record Result(Long schoolId, BigDecimal totalScore, BigDecimal coveragePercent,
                         BigDecimal verifiedCoveragePercent, boolean provisional, List<CriterionContribution> breakdown) {
    }

    public static BigDecimal normalize(BigDecimal raw, BigDecimal max) {
        if (raw == null || max == null || max.signum() <= 0) {
            throw new IllegalArgumentException("raw and positive max are required");
        }
        BigDecimal value = raw.multiply(HUNDRED).divide(max, 2, RoundingMode.HALF_UP);
        return value.max(BigDecimal.ZERO).min(HUNDRED).setScale(2, RoundingMode.HALF_UP);
    }

    /** Maps an average 1–5 star rating to 0–100. */
    public static BigDecimal normalizeRating(BigDecimal averageRating) {
        return averageRating.subtract(BigDecimal.ONE).multiply(HUNDRED).divide(FOUR, 2, RoundingMode.HALF_UP)
                .max(BigDecimal.ZERO).min(HUNDRED);
    }

    /** @return null when the school has no evidence for any criterion */
    public Result score(Long schoolId, List<RankingCriterion> criteria, Map<String, Evidence> evidenceByCode,
                        BigDecimal minCoveragePercent) {
        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal coveredWeight = BigDecimal.ZERO;
        BigDecimal verifiedWeight = BigDecimal.ZERO;
        BigDecimal weightedSum = BigDecimal.ZERO;
        List<CriterionContribution> breakdown = new ArrayList<>();

        for (RankingCriterion criterion : criteria) {
            BigDecimal weight = criterion.getWeight();
            totalWeight = totalWeight.add(weight);
            Evidence evidence = evidenceByCode.get(criterion.getCode());
            if (evidence == null) {
                breakdown.add(new CriterionContribution(criterion.getCode(), criterion.getName(), weight,
                        null, null, false, null, null, null, null));
                continue;
            }
            coveredWeight = coveredWeight.add(weight);
            if (evidence.verified()) {
                verifiedWeight = verifiedWeight.add(weight);
            }
            weightedSum = weightedSum.add(weight.multiply(evidence.normalizedScore()));
            breakdown.add(new CriterionContribution(criterion.getCode(), criterion.getName(), weight,
                    evidence.normalizedScore(), null, true, evidence.sourceUrl(), evidence.verified(), evidence.type(),
                    evidence.note()));
        }
        if (coveredWeight.signum() == 0 || totalWeight.signum() == 0) {
            return null;
        }
        BigDecimal score = weightedSum.divide(coveredWeight, 2, RoundingMode.HALF_UP);
        BigDecimal coverage = coveredWeight.multiply(HUNDRED).divide(totalWeight, 2, RoundingMode.HALF_UP);
        BigDecimal verifiedCoverage = verifiedWeight.multiply(HUNDRED).divide(totalWeight, 2, RoundingMode.HALF_UP);

        // Contribution = points this criterion adds to the final score (sums to the score).
        final BigDecimal covered = coveredWeight;
        List<CriterionContribution> withContributions = breakdown.stream()
                .map(c -> c.dataAvailable()
                        ? new CriterionContribution(c.criterionCode(), c.criterionName(), c.weight(), c.normalizedScore(),
                        c.weight().multiply(c.normalizedScore()).divide(covered, 2, RoundingMode.HALF_UP), true,
                        c.sourceUrl(), c.verified(), c.evidenceType(), c.evidenceNote())
                        : c)
                .toList();
        return new Result(schoolId, score, coverage, verifiedCoverage, verifiedCoverage.compareTo(minCoveragePercent) < 0,
                withContributions);
    }

    /**
     * Assigns competition-style positions ("1, 2, 2, 4") to non-provisional results, highest score first.
     * Provisional results get null.
     */
    public Map<Long, Integer> positions(List<Result> results) {
        List<Result> definitive = results.stream().filter(r -> !r.provisional())
                .sorted(Comparator.comparing(Result::totalScore).reversed()).toList();
        Map<Long, Integer> positions = new java.util.HashMap<>();
        BigDecimal previous = null;
        int position = 0;
        for (int i = 0; i < definitive.size(); i++) {
            Result r = definitive.get(i);
            if (previous == null || r.totalScore().compareTo(previous) != 0) {
                position = i + 1;
                previous = r.totalScore();
            }
            positions.put(r.schoolId(), position);
        }
        return positions;
    }
}
