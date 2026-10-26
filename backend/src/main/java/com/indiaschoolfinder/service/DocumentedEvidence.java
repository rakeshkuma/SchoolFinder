package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.SchoolRanking.EvidenceType;
import com.indiaschoolfinder.enums.FacilityCategory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.indiaschoolfinder.enums.FacilityCategory.ACCESSIBILITY;
import static com.indiaschoolfinder.enums.FacilityCategory.ARTS;
import static com.indiaschoolfinder.enums.FacilityCategory.COMPUTER;
import static com.indiaschoolfinder.enums.FacilityCategory.EXTRACURRICULAR;
import static com.indiaschoolfinder.enums.FacilityCategory.LABORATORY;
import static com.indiaschoolfinder.enums.FacilityCategory.LIBRARY;
import static com.indiaschoolfinder.enums.FacilityCategory.SPORTS;
import static com.indiaschoolfinder.enums.FacilityCategory.TRANSPORT;

/**
 * Turns documented facts (facility records with a cited source, an officially published student-teacher ratio) into
 * criterion evidence on fixed, published scales. Pure logic, no I/O.
 *
 * <p>A checklist criterion has evidence only when at least one of its items is stated by a source; otherwise it stays
 * unscored (never zero). Once scored, items no source mentions earn no credit, so the score is the documented share of
 * the checklist. This measures what a school documents, not its quality, and is labelled that way.
 */
public final class DocumentedEvidence {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    /** Published checklists: criterion code → items. Changing these changes the methodology version. */
    public static final Map<String, List<FacilityCategory>> CHECKLISTS = checklists();

    private DocumentedEvidence() {
    }

    private static Map<String, List<FacilityCategory>> checklists() {
        Map<String, List<FacilityCategory>> m = new LinkedHashMap<>();
        m.put("INFRASTRUCTURE", List.of(LIBRARY, LABORATORY, COMPUTER));
        m.put("SPORTS_EXTRACURRICULAR", List.of(SPORTS, EXTRACURRICULAR, ARTS));
        m.put("ACCESSIBILITY_TRANSPORT", List.of(TRANSPORT, ACCESSIBILITY));
        return java.util.Collections.unmodifiableMap(m);
    }

    /** One documented statement about a facility category. */
    public record Item(FacilityCategory category, boolean available, boolean verified, String sourceUrl,
                       LocalDate evidenceDate) {
    }

    /**
     * @param items  statements from any source; several per category are allowed (any "available" wins)
     * @param cutoff statements dated before this are outdated and ignored; null = no age limit
     * @return null when no current statement covers any checklist item
     */
    public static RankingEngine.Evidence fromChecklist(List<FacilityCategory> checklist, List<Item> items, LocalDate cutoff) {
        Map<FacilityCategory, Item> stated = new LinkedHashMap<>();
        for (Item item : items) {
            if (!checklist.contains(item.category()) || item.evidenceDate() == null
                    || (cutoff != null && item.evidenceDate().isBefore(cutoff))) {
                continue;
            }
            Item previous = stated.get(item.category());
            if (previous == null || better(item, previous)) {
                stated.put(item.category(), item);
            }
        }
        if (stated.isEmpty()) {
            return null;
        }
        List<String> documented = new ArrayList<>();
        boolean allVerified = true;
        String source = null;
        for (FacilityCategory category : checklist) {
            Item item = stated.get(category);
            if (item == null) {
                continue;
            }
            allVerified &= item.verified();
            if (item.available()) {
                documented.add(label(category));
                if (source == null) {
                    source = item.sourceUrl();
                }
            }
        }
        if (source == null) {
            source = stated.values().iterator().next().sourceUrl();
        }
        BigDecimal score = new BigDecimal(documented.size()).multiply(HUNDRED)
                .divide(new BigDecimal(checklist.size()), 2, RoundingMode.HALF_UP);
        String note = documented.size() + " of " + checklist.size() + " checklist items documented"
                + (documented.isEmpty() ? "" : ": " + String.join(", ", documented))
                + (allVerified ? "" : " (documented by the cited source, not yet verified)");
        return new RankingEngine.Evidence(score, source, allVerified, EvidenceType.DOCUMENTED_FACILITIES, note);
    }

    /** An "available" statement beats "not available"; a verified one beats an unverified one. */
    private static boolean better(Item candidate, Item current) {
        if (candidate.available() != current.available()) {
            return candidate.available();
        }
        return candidate.verified() && !current.verified();
    }

    /**
     * Linear scale: at or below {@code best} pupils per teacher = 100, at or above {@code worst} = 0.
     *
     * @return null when the ratio is not published, undated, outdated or has no source
     */
    public static RankingEngine.Evidence fromStudentTeacherRatio(BigDecimal ratio, BigDecimal best, BigDecimal worst,
                                                                 boolean verified, String sourceUrl,
                                                                 LocalDate evidenceDate, LocalDate cutoff) {
        if (ratio == null || ratio.signum() <= 0 || sourceUrl == null || sourceUrl.isBlank() || evidenceDate == null
                || (cutoff != null && evidenceDate.isBefore(cutoff)) || worst.compareTo(best) <= 0) {
            return null;
        }
        BigDecimal score = worst.subtract(ratio).multiply(HUNDRED).divide(worst.subtract(best), 2, RoundingMode.HALF_UP)
                .max(BigDecimal.ZERO).min(HUNDRED).setScale(2, RoundingMode.HALF_UP);
        String note = "Student-teacher ratio " + ratio.stripTrailingZeros().toPlainString() + ":1 (scale: "
                + best.stripTrailingZeros().toPlainString() + ":1 or better = 100, "
                + worst.stripTrailingZeros().toPlainString() + ":1 or worse = 0)"
                + (verified ? "" : " (published by the cited source, not yet verified)");
        return new RankingEngine.Evidence(score, sourceUrl, verified, EvidenceType.PUBLISHED_RATIO, note);
    }

    public static String label(FacilityCategory category) {
        return switch (category) {
            case LIBRARY -> "Library";
            case LABORATORY -> "Science laboratory";
            case COMPUTER -> "Computer lab";
            case SPORTS -> "Sports facilities";
            case EXTRACURRICULAR -> "Co-curricular programmes";
            case ARTS -> "Arts (music, dance, visual arts)";
            case TRANSPORT -> "School transport";
            case ACCESSIBILITY -> "Barrier-free access / CWSN support";
            default -> category.name();
        };
    }
}
