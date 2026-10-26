package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.admin.CoverageReport;
import com.indiaschoolfinder.dto.admin.DataQualityReport;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.enums.ReviewStatus;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.repository.AdmissionScheduleRepository;
import com.indiaschoolfinder.repository.SchoolFeeRepository;
import com.indiaschoolfinder.repository.SchoolRankingRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SchoolReviewRepository;
import com.indiaschoolfinder.repository.StateRepository;
import com.indiaschoolfinder.service.DataQualityService;
import com.indiaschoolfinder.util.AcademicYears;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class DataQualityServiceImpl implements DataQualityService {

    private static final int MAX_LISTED = 100;

    private final SchoolRepository schoolRepository;
    private final SchoolFeeRepository feeRepository;
    private final AdmissionScheduleRepository admissionRepository;
    private final SchoolReviewRepository reviewRepository;
    private final SchoolRankingRepository rankingRepository;
    private final StateRepository stateRepository;
    private final AppProperties properties;
    private final Clock clock;

    public DataQualityServiceImpl(SchoolRepository schoolRepository, SchoolFeeRepository feeRepository,
                                  AdmissionScheduleRepository admissionRepository, SchoolReviewRepository reviewRepository,
                                  SchoolRankingRepository rankingRepository, StateRepository stateRepository,
                                  AppProperties properties, Clock clock) {
        this.stateRepository = stateRepository;
        this.schoolRepository = schoolRepository;
        this.feeRepository = feeRepository;
        this.admissionRepository = admissionRepository;
        this.reviewRepository = reviewRepository;
        this.rankingRepository = rankingRepository;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public CoverageReport coverage() {
        Map<String, Object[]> rows = new HashMap<>();
        for (Object[] row : schoolRepository.coverageByState()) {
            rows.put((String) row[0], row);
        }
        List<String> priority = properties.getDataQuality().getPriorityStates().stream()
                .map(c -> c.trim().toUpperCase(Locale.ROOT)).toList();
        List<CoverageReport.StateCoverage> states = new ArrayList<>();
        for (State state : stateRepository.findAllByOrderByNameAsc()) {
            Object[] r = rows.get(state.getCode());
            long[] n = new long[9];
            if (r != null) {
                for (int i = 0; i < n.length; i++) {
                    n[i] = ((Number) r[i + 1]).longValue();
                }
            }
            states.add(new CoverageReport.StateCoverage(state.getCode(), state.getName(), priority.contains(state.getCode()),
                    n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7], n[8], r == null ? null : toInstant(r[10])));
        }
        // Priority states in their configured order, then the rest alphabetically.
        states.sort(Comparator.comparingInt((CoverageReport.StateCoverage s) ->
                s.priority() ? priority.indexOf(s.code()) : priority.size()));
        return new CoverageReport(Instant.now(clock), states);
    }

    private static Instant toInstant(Object value) {
        if (value instanceof Instant i) {
            return i;
        }
        if (value instanceof OffsetDateTime o) {
            return o.toInstant();
        }
        if (value instanceof java.sql.Timestamp t) {
            return t.toInstant();
        }
        return null;
    }

    @Override
    public DataQualityReport report() {
        LocalDate today = LocalDate.now(clock);
        String year = AcademicYears.of(today);
        LocalDate staleBefore = today.minusDays(properties.getDataQuality().getStaleAfterDays());
        Set<Long> withFees = new HashSet<>(feeRepository.findSchoolIdsWithFees(year));

        List<School> schools = schoolRepository.findAll();
        long active = 0, verified = 0, unverified = 0, stale = 0, noCoords = 0, noContact = 0, noBoard = 0, noFees = 0;
        List<DataQualityReport.SchoolIssues> attention = new ArrayList<>();

        for (School s : schools) {
            if (!s.isActive()) {
                continue;
            }
            active++;
            List<String> issues = new ArrayList<>();
            if (s.getVerificationStatus() == VerificationStatus.VERIFIED) {
                verified++;
                if (s.getLastVerifiedDate() == null || s.getLastVerifiedDate().isBefore(staleBefore)) {
                    stale++;
                    issues.add("Verification older than " + properties.getDataQuality().getStaleAfterDays() + " days");
                }
            } else {
                unverified++;
                issues.add("Profile " + s.getVerificationStatus().name().toLowerCase());
            }
            if (s.getLatitude() == null) {
                noCoords++;
                issues.add("Missing map coordinates");
            }
            if (s.getPhone() == null && s.getEmail() == null) {
                noContact++;
                issues.add("No public phone or email");
            }
            if (s.getEducationBoardCode() == null) {
                noBoard++;
                issues.add("Education board not recorded");
            }
            if (!withFees.contains(s.getId())) {
                noFees++;
                issues.add("No fee schedule for " + year);
            }
            if (!issues.isEmpty()) {
                attention.add(new DataQualityReport.SchoolIssues(s.getId(), s.getName(), s.getSlug(), issues));
            }
        }
        attention.sort(Comparator.comparingInt((DataQualityReport.SchoolIssues i) -> i.issues().size()).reversed()
                .thenComparing(DataQualityReport.SchoolIssues::name));

        return new DataQualityReport(Instant.now(clock), year, schools.size(), active, verified, unverified, stale,
                noCoords, noContact, noBoard, noFees,
                admissionRepository.countByApplicationStartDateIsNullAndApplicationEndDateIsNull(),
                reviewRepository.countByStatus(ReviewStatus.PENDING),
                rankingRepository.countByAcademicYearAndProvisionalTrue(year),
                rankingRepository.countByAcademicYearAndProvisionalFalse(year),
                attention.stream().limit(MAX_LISTED).toList());
    }
}
