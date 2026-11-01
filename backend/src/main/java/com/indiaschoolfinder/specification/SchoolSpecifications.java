package com.indiaschoolfinder.specification;

import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.entity.AdmissionSchedule;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.entity.SchoolFee;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.util.GeoUtil;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Builds the dynamic directory/search filter. Child-table filters use EXISTS sub-queries, so the
 * main query never needs DISTINCT and pagination counts stay correct.
 */
public final class SchoolSpecifications {

    private static final char ESCAPE = '\\';
    /** Ordering property that sorts by the lowest published annual fee instead of a School column. */
    public static final String ANNUAL_FEE = "annualFee";
    /** Ordering property for the recommended order: profile score, then states taking turns within a score tier. */
    public static final String RECOMMENDED = "recommended";
    /** Ordering property for the location order: state, district, town and locality by name, then school name. */
    public static final String LOCATION = "location";

    private SchoolSpecifications() {
    }

    /**
     * Ordering applied inside the query (Spring Data cannot apply NULLS LAST to criteria queries).
     * property == null means "nearest first" and requires a location.
     */
    public record Ordering(String property, boolean descending) {
        public static Ordering byDistance() {
            return new Ordering(null, false);
        }
    }

    /**
     * @param stateCode           the criteria's state already resolved to an ISO code (null = all of India)
     * @param feeAcademicYears    academic years the annual-fee filter may use; each school is judged on its
     *                            latest complete schedule among them
     * @param admissionYears      academic years considered by the admission-status filter
     * @param ordering            sort applied to the data query (ignored for the count query)
     */
    public static Specification<School> matching(SchoolSearchCriteria c, String stateCode, Collection<String> feeAcademicYears,
                                                 Collection<String> admissionYears, Ordering ordering) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));

            if (hasText(c.q())) {
                // Every word must match somewhere: "dps rk puram", "kv andrews", "cbse lucknow".
                for (String token : searchTokens(c.q())) {
                    if (token.matches("\\d{11}")) {
                        predicates.add(cb.equal(root.get("udiseCode"), token));
                        continue;
                    }
                    String like = likePattern(token);
                    List<Predicate> any = new ArrayList<>(List.of(
                            cb.like(cb.lower(root.get("name")), like, ESCAPE),
                            cb.like(cb.lower(root.get("locality")), like, ESCAPE),
                            cb.like(cb.lower(root.get("city")), like, ESCAPE),
                            cb.like(cb.lower(root.get("addressLine")), like, ESCAPE),
                            cb.like(root.get("pinCode"), like, ESCAPE)));
                    String compact = token.replaceAll("[^a-z0-9]+", "");
                    if (!compact.isEmpty()) {
                        any.add(cb.like(root.get("searchKeywords"), likePattern(compact), ESCAPE));
                    }
                    // Other spellings of a place ("arrah" → Ara). Short ones would match inside unrelated words
                    // ("ara" in "Saraswati"), so they match the town exactly; longer ones may appear anywhere.
                    for (String other : com.indiaschoolfinder.util.PlaceAliases.othersOf(token)) {
                        any.add(cb.equal(cb.lower(root.get("city")), other));
                        if (other.length() >= 5) {
                            any.add(cb.like(cb.lower(root.get("name")), likePattern(other), ESCAPE));
                            any.add(cb.like(cb.lower(root.get("addressLine")), likePattern(other), ESCAPE));
                        }
                    }
                    predicates.add(cb.or(any.toArray(Predicate[]::new)));
                }
            }
            if (stateCode != null) {
                predicates.add(cb.equal(root.get("stateCode"), stateCode));
            }
            if (hasText(c.district())) {
                Subquery<Long> d = query.subquery(Long.class);
                Root<District> dr = d.from(District.class);
                List<Predicate> dp = new ArrayList<>();
                dp.add(cb.equal(dr.get("slug"), c.district().trim().toLowerCase(Locale.ROOT)));
                if (stateCode != null) {
                    dp.add(cb.equal(dr.get("stateCode"), stateCode));
                }
                d.select(dr.get("id")).where(dp.toArray(Predicate[]::new));
                predicates.add(root.get("districtId").in(d));
            }
            if (hasText(c.city())) {
                predicates.add(cb.equal(cb.lower(root.get("city")), c.city().trim().toLowerCase(Locale.ROOT)));
            }
            if (c.management() != null) {
                predicates.add(cb.equal(root.get("management"), c.management()));
            }
            if (c.network() != null) {
                predicates.add(cb.equal(root.get("network"), c.network()));
            }
            if (c.hasTransport() != null) {
                predicates.add(cb.equal(root.get("hasTransport"), c.hasTransport()));
            }
            if (hasText(c.medium())) {
                predicates.add(cb.like(cb.lower(root.get("mediumOfInstruction")), likePattern(c.medium()), ESCAPE));
            }
            if (c.genderType() != null) {
                predicates.add(cb.equal(root.get("genderType"), c.genderType()));
            }
            if (c.facility() != null) {
                for (FacilityCategory category : new LinkedHashSet<>(c.facility())) {
                    Subquery<Long> fac = query.subquery(Long.class);
                    Root<SchoolFacility> f = fac.from(SchoolFacility.class);
                    fac.select(f.get("id")).where(
                            cb.equal(f.get("schoolId"), root.get("id")),
                            cb.equal(f.get("category"), category),
                            cb.isTrue(f.get("available")));
                    predicates.add(cb.exists(fac));
                }
            }
            if (c.boarding() != null || c.boardingType() != null || c.entranceExam() != null
                    || (c.residentialSystem() != null && !c.residentialSystem().isEmpty())) {
                Subquery<Long> bq = query.subquery(Long.class);
                Root<SchoolBoarding> b = bq.from(SchoolBoarding.class);
                List<Predicate> bp = new ArrayList<>();
                bp.add(cb.equal(b.get("schoolId"), root.get("id")));
                if (c.boardingType() != null) {
                    bp.add(cb.equal(b.get("boardingType"), c.boardingType()));
                }
                if (c.entranceExam() != null) {
                    bp.add(cb.equal(b.get("entranceExam"), c.entranceExam()));
                }
                if (c.residentialSystem() != null && !c.residentialSystem().isEmpty()) {
                    bp.add(b.get("residentialSystem").in(c.residentialSystem()));
                }
                bq.select(b.get("schoolId")).where(bp.toArray(Predicate[]::new));
                // boarding=false asks for schools without a profile; any other boarding filter implies a profile.
                boolean wantsProfile = !Boolean.FALSE.equals(c.boarding()) || bp.size() > 1;
                predicates.add(wantsProfile ? cb.exists(bq) : cb.not(cb.exists(bq)));
            }
            if (hasText(c.name())) {
                predicates.add(cb.like(cb.lower(root.get("name")), likePattern(c.name()), ESCAPE));
            }
            if (hasText(c.locality())) {
                predicates.add(cb.like(cb.lower(root.get("locality")), likePattern(c.locality()), ESCAPE));
            }
            if (hasText(c.pinCode())) {
                predicates.add(cb.equal(root.get("pinCode"), c.pinCode().trim()));
            }
            if (hasText(c.board())) {
                predicates.add(cb.equal(root.get("educationBoardCode"), c.board().trim().toUpperCase(Locale.ROOT)));
            }
            if (c.schoolType() != null) {
                predicates.add(cb.equal(root.get("schoolType"), c.schoolType()));
            }
            if (hasText(c.className())) {
                predicates.add(offersClass(root, query, cb, "code", c.className().trim().toUpperCase(Locale.ROOT)));
            }
            if (c.stage() != null) {
                predicates.add(offersClass(root, query, cb, "stage", c.stage()));
            }
            if (c.minAnnualFee() != null || c.maxAnnualFee() != null) {
                Subquery<Long> fee = query.subquery(Long.class);
                Root<SchoolFee> f = fee.from(SchoolFee.class);
                List<Predicate> feePredicates = new ArrayList<>();
                feePredicates.add(cb.equal(f.get("schoolId"), root.get("id")));
                feePredicates.add(cb.isNotNull(f.get("recurringAnnualOfficial")));
                // latest year (among the allowed ones) in which this school has a complete schedule
                Subquery<String> latest = query.subquery(String.class);
                Root<SchoolFee> f2 = latest.from(SchoolFee.class);
                latest.select(cb.greatest(f2.<String>get("academicYear"))).where(
                        cb.equal(f2.get("schoolId"), root.get("id")),
                        cb.isNotNull(f2.get("recurringAnnualOfficial")),
                        f2.get("academicYear").in(feeAcademicYears));
                feePredicates.add(cb.equal(f.get("academicYear"), latest));
                if (c.minAnnualFee() != null) {
                    feePredicates.add(cb.greaterThanOrEqualTo(f.get("recurringAnnualOfficial"), c.minAnnualFee()));
                }
                if (c.maxAnnualFee() != null) {
                    feePredicates.add(cb.lessThanOrEqualTo(f.get("recurringAnnualOfficial"), c.maxAnnualFee()));
                }
                fee.select(f.get("id")).where(feePredicates.toArray(Predicate[]::new));
                predicates.add(cb.exists(fee));
            }
            if (c.admissionStatus() != null) {
                Subquery<Long> adm = query.subquery(Long.class);
                Root<AdmissionSchedule> a = adm.from(AdmissionSchedule.class);
                adm.select(a.get("id")).where(
                        cb.equal(a.get("schoolId"), root.get("id")),
                        cb.equal(a.get("status"), c.admissionStatus()),
                        a.get("academicYear").in(admissionYears));
                predicates.add(cb.exists(adm));
            }
            if (c.hasHostel() != null) {
                // Unknown (null) matches neither boarding nor day: we only list what a source states.
                predicates.add(cb.equal(root.get("hasHostel"), c.hasHostel()));
            }
            if (c.minRating() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("averageRating"), c.minRating()));
            }
            if (c.hasLocation() && c.radiusKm() != null) {
                GeoUtil.BoundingBox box = GeoUtil.boundingBox(c.latitude(), c.longitude(), c.radiusKm());
                predicates.add(cb.between(root.get("latitude"), box.minLat(), box.maxLat()));
                predicates.add(cb.between(root.get("longitude"), box.minLon(), box.maxLon()));
                predicates.add(cb.lessThanOrEqualTo(distanceKm(root, cb, c.latitude(), c.longitude()), c.radiusKm()));
            }

            boolean isCountQuery = Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType());
            if (ordering != null && !isCountQuery) {
                if (ordering.property() == null && c.hasLocation()) {
                    query.orderBy(
                            cb.asc(cb.selectCase().when(cb.isNull(root.get("latitude")), 1).otherwise(0)),
                            cb.asc(distanceKm(root, cb, c.latitude(), c.longitude())),
                            cb.asc(root.get("id")));
                } else if (RECOMMENDED.equals(ordering.property())) {
                    Expression<Integer> turn = root.get("recommendedTurn");
                    boolean best = ordering.descending();
                    query.orderBy(
                            best ? cb.desc(root.get("profileScore")) : cb.asc(root.get("profileScore")),
                            cb.asc(cb.selectCase().when(cb.isNull(turn), 1).otherwise(0)), // not yet computed: end of tier
                            best ? cb.asc(turn) : cb.desc(turn),
                            cb.asc(root.get("name")),
                            cb.asc(root.get("id")));
                } else if (LOCATION.equals(ordering.property())) {
                    Subquery<String> state = query.subquery(String.class);
                    Root<State> st = state.from(State.class);
                    state.select(st.get("name")).where(cb.equal(st.get("code"), root.get("stateCode")));
                    Subquery<String> district = query.subquery(String.class);
                    Root<District> d = district.from(District.class);
                    district.select(d.get("name")).where(cb.equal(d.get("id"), root.get("districtId")));
                    List<jakarta.persistence.criteria.Order> order = new ArrayList<>();
                    for (Expression<?> key : List.of(state, district, root.get("city"), root.get("locality"))) {
                        order.add(cb.asc(cb.selectCase().when(cb.isNull(key), 1).otherwise(0))); // unknown last
                        order.add(ordering.descending() ? cb.desc(key) : cb.asc(key));
                    }
                    order.add(cb.asc(root.get("name")));
                    order.add(cb.asc(root.get("id")));
                    query.orderBy(order);
                } else if (ordering.property() != null) {
                    Expression<?> sortKey = ANNUAL_FEE.equals(ordering.property())
                            ? lowestAnnualFee(root, query, cb, feeAcademicYears)
                            : root.get(ordering.property());
                    query.orderBy(
                            cb.asc(cb.selectCase().when(cb.isNull(sortKey), 1).otherwise(0)), // nulls last
                            ordering.descending() ? cb.desc(sortKey) : cb.asc(sortKey),
                            cb.asc(root.get("name")),
                            cb.asc(root.get("id")));
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /**
     * Lowest official recurring annual fee (any class) in the allowed years; NULL when the school has published none,
     * so schools without fee data sort last instead of looking cheap.
     */
    private static Expression<BigDecimal> lowestAnnualFee(Root<School> root, CriteriaQuery<?> query, CriteriaBuilder cb,
                                                          Collection<String> feeAcademicYears) {
        Subquery<BigDecimal> fee = query.subquery(BigDecimal.class);
        Root<SchoolFee> f = fee.from(SchoolFee.class);
        fee.select(cb.min(f.get("recurringAnnualOfficial"))).where(
                cb.equal(f.get("schoolId"), root.get("id")),
                f.get("academicYear").in(feeAcademicYears));
        return fee;
    }

    /** Haversine distance in km, evaluated by PostgreSQL. */
    static Expression<Double> distanceKm(Root<School> root, CriteriaBuilder cb, double lat, double lon) {
        Expression<Double> latCol = root.get("latitude");
        Expression<Double> lonCol = root.get("longitude");
        Expression<Double> dLat = radians(cb, cb.diff(latCol, lat));
        Expression<Double> dLon = radians(cb, cb.diff(lonCol, lon));
        Expression<Double> sinHalfDLat = cb.function("sin", Double.class, cb.quot(dLat, 2.0).as(Double.class));
        Expression<Double> sinHalfDLon = cb.function("sin", Double.class, cb.quot(dLon, 2.0).as(Double.class));
        Expression<Double> a = cb.sum(
                cb.prod(sinHalfDLat, sinHalfDLat),
                cb.prod(cb.prod(cb.literal(Math.cos(Math.toRadians(lat))),
                                cb.function("cos", Double.class, radians(cb, latCol))),
                        cb.prod(sinHalfDLon, sinHalfDLon)));
        Expression<Double> c = cb.function("asin", Double.class, cb.sqrt(a).as(Double.class));
        return cb.prod(cb.literal(2 * GeoUtil.EARTH_RADIUS_KM), c);
    }

    private static Expression<Double> radians(CriteriaBuilder cb, Expression<? extends Number> degrees) {
        return cb.function("radians", Double.class, degrees);
    }

    private static Predicate offersClass(Root<School> root, CriteriaQuery<?> query, CriteriaBuilder cb,
                                         String attribute, Object value) {
        Subquery<Long> sq = query.subquery(Long.class);
        Root<School> s2 = sq.from(School.class);
        Join<School, SchoolClass> cls = s2.join("classesOffered");
        sq.select(s2.get("id")).where(cb.equal(s2.get("id"), root.get("id")), cb.equal(cls.get(attribute), value));
        return cb.exists(sq);
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /** Lower-cased words of a free-text query (at most 8, so a pasted paragraph cannot build a huge query). */
    static List<String> searchTokens(String raw) {
        return java.util.Arrays.stream(raw.trim().toLowerCase(Locale.ROOT).split("\\s+"))
                .filter(t -> !t.isBlank())
                .limit(8)
                .toList();
    }

    /** Lower-cased contains-pattern with LIKE wildcards escaped. */
    static String likePattern(String raw) {
        String escaped = raw.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
