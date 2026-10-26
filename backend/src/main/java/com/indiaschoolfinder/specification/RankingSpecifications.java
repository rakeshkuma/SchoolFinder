package com.indiaschoolfinder.specification;

import com.indiaschoolfinder.dto.ranking.RankingScope;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.entity.SchoolRanking;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * One definition of "the schools in this ranking scope", used both for the ranked list and for the scope-relative
 * rank positions, so filtering, ordering and positions can never disagree.
 */
public final class RankingSpecifications {

    private RankingSpecifications() {
    }

    /**
     * @param definitiveOnly only non-provisional results (used to compute positions)
     * @param scoreAbove     only results scoring strictly more than this (used to compute positions); null = any
     * @param ordered        apply the public order: definitive first by score; then provisional by evidence share and
     *                       score; ties by name and id (stable pages)
     */
    public static Specification<SchoolRanking> inScope(RankingScope scope, boolean definitiveOnly, BigDecimal scoreAbove,
                                                       boolean ordered) {
        return (r, query, cb) -> {
            Root<School> s = query.from(School.class);
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(s.get("id"), r.get("schoolId")));
            p.add(cb.isTrue(s.get("active")));
            p.add(cb.equal(r.get("academicYear"), scope.academicYear()));
            if (definitiveOnly || !scope.includeProvisional()) {
                p.add(cb.isFalse(r.get("provisional")));
            }
            if (scoreAbove != null) {
                p.add(cb.greaterThan(r.get("totalScore"), scoreAbove));
            }
            if (scope.stateCode() != null) {
                p.add(cb.equal(s.get("stateCode"), scope.stateCode()));
            }
            if (scope.districtSlug() != null) {
                Subquery<Long> d = query.subquery(Long.class);
                Root<District> dr = d.from(District.class);
                d.select(dr.get("id")).where(
                        cb.equal(dr.get("slug"), scope.districtSlug()),
                        cb.equal(dr.get("stateCode"), scope.stateCode()));
                p.add(s.get("districtId").in(d));
            }
            if (scope.city() != null) {
                p.add(cb.equal(cb.lower(s.get("city")), scope.city().toLowerCase(Locale.ROOT)));
            }
            if (scope.locality() != null) {
                p.add(cb.equal(cb.lower(s.get("locality")), scope.locality().toLowerCase(Locale.ROOT)));
            }
            if (scope.board() != null) {
                p.add(cb.equal(s.get("educationBoardCode"), scope.board()));
            }
            if (scope.schoolType() != null) {
                p.add(cb.equal(s.get("schoolType"), scope.schoolType()));
            }
            boolean bySystem = scope.residentialSystems() != null && !scope.residentialSystems().isEmpty();
            if (scope.boardingOnly() || bySystem) {
                Subquery<Long> b = query.subquery(Long.class);
                Root<SchoolBoarding> br = b.from(SchoolBoarding.class);
                List<Predicate> bp = new ArrayList<>();
                bp.add(cb.equal(br.get("schoolId"), r.get("schoolId")));
                if (bySystem) {
                    bp.add(br.get("residentialSystem").in(scope.residentialSystems()));
                }
                b.select(br.get("schoolId")).where(bp.toArray(Predicate[]::new));
                p.add(cb.exists(b));
            }
            boolean countQuery = Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType());
            if (ordered && !countQuery) {
                // Provisional rows are ordered by evidence share before score, so thin evidence cannot float to the top.
                Expression<BigDecimal> provisionalCoverage = cb.<BigDecimal>selectCase()
                        .when(cb.isTrue(r.get("provisional")), r.<BigDecimal>get("coveragePercent"))
                        .otherwise(BigDecimal.ZERO);
                query.orderBy(cb.asc(r.get("provisional")), cb.desc(provisionalCoverage), cb.desc(r.get("totalScore")),
                        cb.asc(s.get("name")), cb.asc(s.get("id")));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
}
