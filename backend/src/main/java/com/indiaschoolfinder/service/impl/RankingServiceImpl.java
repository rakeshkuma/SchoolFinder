package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.CriterionScoreDto;
import com.indiaschoolfinder.dto.ranking.CriterionScoreRequest;
import com.indiaschoolfinder.dto.ranking.CriterionWeightsRequest;
import com.indiaschoolfinder.dto.ranking.ExternalRankingDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingRequest;
import com.indiaschoolfinder.dto.ranking.RankingMethodologyDto;
import com.indiaschoolfinder.dto.ranking.RankingScope;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDetailDto;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDto;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.RankingCriterion;
import com.indiaschoolfinder.entity.RankingSource;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolCriterionScore;
import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.entity.SchoolRanking;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.RankingStatus;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.RankingCriterionRepository;
import com.indiaschoolfinder.repository.RankingSourceRepository;
import com.indiaschoolfinder.repository.SchoolCriterionScoreRepository;
import com.indiaschoolfinder.repository.SchoolFacilityRepository;
import com.indiaschoolfinder.repository.SchoolRankingRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.DocumentedEvidence;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.service.ProfileScoreService;
import com.indiaschoolfinder.service.RankingEngine;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.ReferenceDataService;
import com.indiaschoolfinder.service.SchoolService;
import com.indiaschoolfinder.specification.RankingSpecifications;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RankingServiceImpl implements RankingService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final String TEACHING_QUALITY = "TEACHING_QUALITY";

    private final SchoolRankingRepository rankingRepository;
    private final SchoolFacilityRepository facilityRepository;
    private final SchoolService schoolService;
    private final ProfileScoreService profileScoreService;
    private final RankingCriterionRepository criterionRepository;
    private final SchoolCriterionScoreRepository scoreRepository;
    private final RankingSourceRepository sourceRepository;
    private final SchoolRepository schoolRepository;
    private final ReferenceDataService referenceData;
    private final RankingEngine engine;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;
    private final LocationService locationService;

    public RankingServiceImpl(SchoolRankingRepository rankingRepository, RankingCriterionRepository criterionRepository,
                              SchoolCriterionScoreRepository scoreRepository, RankingSourceRepository sourceRepository,
                              SchoolRepository schoolRepository, ReferenceDataService referenceData, RankingEngine engine,
                              AuditService auditService, AppProperties properties, Clock clock,
                              LocationService locationService, SchoolFacilityRepository facilityRepository,
                              SchoolService schoolService, ProfileScoreService profileScoreService) {
        this.profileScoreService = profileScoreService;
        this.locationService = locationService;
        this.facilityRepository = facilityRepository;
        this.schoolService = schoolService;
        this.rankingRepository = rankingRepository;
        this.criterionRepository = criterionRepository;
        this.scoreRepository = scoreRepository;
        this.sourceRepository = sourceRepository;
        this.schoolRepository = schoolRepository;
        this.referenceData = referenceData;
        this.engine = engine;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public PageResponse<SchoolRankingDto> rankings(String academicYear, String state, String district, String city,
                                                   String locality, String board, SchoolType schoolType,
                                                   boolean includeProvisional, int page, int size) {
        return rankings(academicYear, state, district, city, locality, board, schoolType, includeProvisional, false,
                List.of(), page, size);
    }

    @Override
    public PageResponse<SchoolRankingDto> rankings(String academicYear, String state, String district, String city,
                                                   String locality, String board, SchoolType schoolType,
                                                   boolean includeProvisional, boolean boardingOnly,
                                                   List<com.indiaschoolfinder.enums.ResidentialSystem> residentialSystems,
                                                   int page, int size) {
        String stateCode = blank(state) ? null : locationService.resolveStateCode(state, "state");
        if (!blank(district) && stateCode == null) {
            throw new BusinessValidationException("district", "choose a state first: district names repeat across states");
        }
        RankingScope scope = new RankingScope(academicYear != null ? academicYear : defaultYear(), stateCode,
                blank(district) ? null : district.trim().toLowerCase(Locale.ROOT),
                blank(city) ? null : city.trim(), blank(locality) ? null : locality.trim(),
                blank(board) ? null : board.trim().toUpperCase(Locale.ROOT), schoolType, includeProvisional, boardingOnly,
                residentialSystems == null ? List.of() : residentialSystems);
        Page<SchoolRanking> result = rankingRepository.findAll(RankingSpecifications.inScope(scope, false, null, true),
                PageRequest.of(page, size));
        return PageResponse.of(result, toDtos(result.getContent(), scopePositions(scope, result.getContent())));
    }

    @Override
    public List<SchoolRankingDto> topSchools(int limit) {
        int capped = Math.max(1, Math.min(limit, 50));
        return rankings(null, null, null, null, null, null, null, false, 0, capped).content();
    }

    /**
     * Competition-style positions within the scope: 1 + the number of definitive results in the scope with a strictly
     * higher score. With no filters this equals the all-India position.
     */
    private Map<Long, Integer> scopePositions(RankingScope scope, List<SchoolRanking> rows) {
        Map<BigDecimal, Integer> byScore = new HashMap<>();
        Map<Long, Integer> positions = new HashMap<>();
        for (SchoolRanking r : rows) {
            if (r.isProvisional()) {
                continue;
            }
            int position = byScore.computeIfAbsent(r.getTotalScore(), score ->
                    (int) rankingRepository.count(RankingSpecifications.inScope(scope, true, score, false)) + 1);
            positions.put(r.getSchoolId(), position);
        }
        return positions;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    @Override
    public SchoolRankingDetailDto forSchool(Long schoolId) {
        schoolRepository.findByIdAndActiveTrue(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        SchoolRankingDto site = rankingRepository.findBySchoolIdAndAcademicYear(schoolId, defaultYear())
                .map(r -> toDtos(List.of(r), java.util.Collections.singletonMap(r.getSchoolId(), r.getRankPosition())).get(0))
                .orElse(null);
        List<ExternalRankingDto> external = sourceRepository.findBySchoolIdOrderByRankingYearDesc(schoolId).stream()
                .map(RankingServiceImpl::toExternalDto).toList();
        return new SchoolRankingDetailDto(schoolId, site == null ? RankingStatus.NOT_YET_RANKED : site.status(), site,
                external, DISCLAIMER);
    }

    @Override
    public RankingMethodologyDto methodology() {
        String year = defaultYear();
        List<RankingMethodologyDto.CriterionDto> criteria = criterionRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(c -> new RankingMethodologyDto.CriterionDto(c.getId(), c.getCode(), c.getName(), c.getDescription(),
                        c.getWeight(), c.getDisplayOrder(), c.isActive()))
                .toList();
        AppProperties.Ranking cfg = properties.getRanking();
        String minCoverage = cfg.getMinCoveragePercent().stripTrailingZeros().toPlainString();
        List<String> rules = List.of(
                "Each criterion score is normalised to 0–100 (raw score ÷ maximum score × 100).",
                "Every piece of evidence cites a source. Administrator-verified scores take precedence over documented facts.",
                "Infrastructure, sports and accessibility can be scored from a fixed published checklist: the share of "
                        + "checklist items a cited source documents. This measures what a school documents, not its quality.",
                "Teaching quality can be scored from an officially published student-teacher ratio: "
                        + cfg.getStudentTeacherRatioBest().stripTrailingZeros().toPlainString() + ":1 or better = 100, "
                        + cfg.getStudentTeacherRatioWorst().stripTrailingZeros().toPlainString()
                        + ":1 or worse = 0, linear in between.",
                "Parent feedback uses approved reviews on this site and needs at least "
                        + cfg.getMinReviewsForParentFeedback() + " reviews; (average stars − 1) ÷ 4 × 100. "
                        + "Review counts and popularity are never used as a measure of academic quality.",
                "Missing evidence is never scored as zero: the score is re-weighted over the criteria that have evidence.",
                "Documented facts older than " + cfg.getMaxEvidenceAgeYears()
                        + " years, or marked outdated or disputed, are not scored.",
                "Evidence share = share of total criterion weight backed by any evidence. Verified share = share backed "
                        + "by verified evidence. A definitive rank needs a verified share of at least " + minCoverage
                        + "%; otherwise the result is provisional and receives no rank position.",
                "Provisional results are listed after ranked schools, ordered by evidence share and then score, so a "
                        + "school with one strong criterion cannot outrank well-documented schools.",
                "Schools with no usable evidence are shown as not yet ranked and are not scored.",
                "Rankings are recalculated whenever evidence is verified, reviews are moderated or weights change, and nightly.",
                "Independently published rankings are shown separately and are never mixed into this score.");
        List<RankingMethodologyDto.ChecklistDto> checklists = DocumentedEvidence.CHECKLISTS.entrySet().stream()
                .map(e -> new RankingMethodologyDto.ChecklistDto(e.getKey(),
                        e.getValue().stream().map(DocumentedEvidence::label).toList()))
                .toList();
        return new RankingMethodologyDto(cfg.getMethodologyVersion(), year, criteria, cfg.getMinCoveragePercent(),
                cfg.getMinReviewsForParentFeedback(), cfg.getMaxEvidenceAgeYears(), cfg.getStudentTeacherRatioBest(),
                cfg.getStudentTeacherRatioWorst(), checklists,
                rankingRepository.countByAcademicYearAndProvisionalFalse(year),
                rankingRepository.countByAcademicYearAndProvisionalTrue(year), rules, DISCLAIMER);
    }

    @Override
    @Transactional
    public int recalculate(String academicYear) {
        String year = academicYear != null ? academicYear : referenceData.currentAcademicYear();
        List<RankingCriterion> criteria = criterionRepository.findByActiveTrueOrderByDisplayOrderAsc();
        Map<Long, String> codeById = criteria.stream().collect(Collectors.toMap(RankingCriterion::getId, RankingCriterion::getCode));

        Map<Long, Map<String, RankingEngine.Evidence>> evidence = new HashMap<>();
        for (SchoolCriterionScore score : scoreRepository.findByAcademicYearAndVerificationStatus(year, VerificationStatus.VERIFIED)) {
            String code = codeById.get(score.getCriterionId());
            if (code != null && !RankingCriterion.PARENT_FEEDBACK.equals(code)) {
                evidence.computeIfAbsent(score.getSchoolId(), k -> new HashMap<>())
                        .put(code, new RankingEngine.Evidence(score.getNormalizedScore(), score.getSourceUrl()));
            }
        }
        boolean feedbackActive = codeById.containsValue(RankingCriterion.PARENT_FEEDBACK);
        AppProperties.Ranking cfg = properties.getRanking();
        int minReviews = cfg.getMinReviewsForParentFeedback();
        LocalDate cutoff = LocalDate.now(clock.withZone(ZoneId.of(properties.getTimezone())))
                .minusYears(cfg.getMaxEvidenceAgeYears());
        Map<Long, List<DocumentedEvidence.Item>> facilityItems = documentedFacilities();

        List<RankingEngine.Result> results = new ArrayList<>();
        for (School school : schoolRepository.findAllByActiveTrue()) {
            Map<String, RankingEngine.Evidence> schoolEvidence = new HashMap<>(evidence.getOrDefault(school.getId(), Map.of()));
            addDocumentedEvidence(school, schoolEvidence, facilityItems.getOrDefault(school.getId(), List.of()),
                    codeById, cutoff);
            if (feedbackActive && school.getAverageRating() != null && school.getReviewCount() >= minReviews) {
                schoolEvidence.put(RankingCriterion.PARENT_FEEDBACK,
                        new RankingEngine.Evidence(RankingEngine.normalizeRating(school.getAverageRating()), null, true,
                                SchoolRanking.EvidenceType.PARENT_REVIEWS, "Average of " + school.getReviewCount()
                                + " approved reviews on this site: " + school.getAverageRating().stripTrailingZeros()
                                .toPlainString() + " of 5"));
            }
            RankingEngine.Result result = engine.score(school.getId(), criteria, schoolEvidence,
                    properties.getRanking().getMinCoveragePercent());
            if (result != null) {
                results.add(result);
            }
        }

        Map<Long, Integer> positions = engine.positions(results);
        rankingRepository.deleteByAcademicYear(year);
        rankingRepository.flush();
        Instant now = Instant.now(clock);
        List<SchoolRanking> rows = results.stream().map(r -> {
            SchoolRanking row = new SchoolRanking();
            row.setSchoolId(r.schoolId());
            row.setAcademicYear(year);
            row.setTotalScore(r.totalScore());
            row.setCoveragePercent(r.coveragePercent());
            row.setVerifiedCoveragePercent(r.verifiedCoveragePercent());
            row.setProvisional(r.provisional());
            row.setRankPosition(positions.get(r.schoolId()));
            row.setBreakdown(r.breakdown());
            row.setMethodologyVersion(properties.getRanking().getMethodologyVersion());
            row.setCalculatedAt(now);
            return row;
        }).toList();
        rankingRepository.saveAll(rows);
        rankingRepository.flush();
        // Ranks feed the directory's recommended order.
        profileScoreService.recompute();
        return rows.size();
    }

    /** Current facility statements per school, from records that are not outdated or disputed. */
    private Map<Long, List<DocumentedEvidence.Item>> documentedFacilities() {
        java.util.Set<FacilityCategory> categories = DocumentedEvidence.CHECKLISTS.values().stream()
                .flatMap(List::stream).collect(Collectors.toSet());
        ZoneId zone = ZoneId.of(properties.getTimezone());
        Map<Long, List<DocumentedEvidence.Item>> bySchool = new HashMap<>();
        for (SchoolFacility f : facilityRepository.findByCategoryInAndAvailableIsNotNullAndVerificationStatusIn(categories,
                List.of(VerificationStatus.VERIFIED, VerificationStatus.UNVERIFIED))) {
            boolean verified = f.getVerificationStatus() == VerificationStatus.VERIFIED;
            LocalDate date = verified && f.getLastVerifiedDate() != null ? f.getLastVerifiedDate()
                    : f.getCreatedAt() == null ? null : LocalDate.ofInstant(f.getCreatedAt(), zone);
            bySchool.computeIfAbsent(f.getSchoolId(), k -> new ArrayList<>())
                    .add(new DocumentedEvidence.Item(f.getCategory(), f.getAvailable(), verified, f.getSourceUrl(), date));
        }
        return bySchool;
    }

    /**
     * Fills checklist criteria and teaching quality from documented facts, for active criteria that have no verified
     * score: a verified score always takes precedence.
     */
    private void addDocumentedEvidence(School school, Map<String, RankingEngine.Evidence> evidence,
                                       List<DocumentedEvidence.Item> facilities, Map<Long, String> activeCodes,
                                       LocalDate cutoff) {
        boolean profileUsable = school.getSourceUrl() != null && !school.getSourceUrl().isBlank()
                && school.getVerificationStatus() != VerificationStatus.OUTDATED
                && school.getVerificationStatus() != VerificationStatus.DISPUTED;
        boolean profileVerified = school.getVerificationStatus() == VerificationStatus.VERIFIED;
        LocalDate profileDate = school.getLastVerifiedDate() != null && profileVerified
                ? school.getLastVerifiedDate() : school.getSourceRetrievedDate();

        List<DocumentedEvidence.Item> items = facilities;
        if (profileUsable && school.getHasTransport() != null) {
            items = new ArrayList<>(facilities);
            items.add(new DocumentedEvidence.Item(FacilityCategory.TRANSPORT, school.getHasTransport(), profileVerified,
                    school.getSourceUrl(), profileDate));
        }
        for (Map.Entry<String, List<FacilityCategory>> checklist : DocumentedEvidence.CHECKLISTS.entrySet()) {
            String code = checklist.getKey();
            if (activeCodes.containsValue(code) && !evidence.containsKey(code)) {
                RankingEngine.Evidence e = DocumentedEvidence.fromChecklist(checklist.getValue(), items, cutoff);
                if (e != null) {
                    evidence.put(code, e);
                }
            }
        }
        if (profileUsable && activeCodes.containsValue(TEACHING_QUALITY) && !evidence.containsKey(TEACHING_QUALITY)) {
            AppProperties.Ranking cfg = properties.getRanking();
            RankingEngine.Evidence e = DocumentedEvidence.fromStudentTeacherRatio(school.getStudentTeacherRatio(),
                    cfg.getStudentTeacherRatioBest(), cfg.getStudentTeacherRatioWorst(), profileVerified,
                    school.getSourceUrl(), profileDate, cutoff);
            if (e != null) {
                evidence.put(TEACHING_QUALITY, e);
            }
        }
    }

    @Override
    @Transactional
    public RankingMethodologyDto updateWeights(CriterionWeightsRequest request) {
        Map<String, RankingCriterion> byCode = criterionRepository.findAll().stream()
                .collect(Collectors.toMap(RankingCriterion::getCode, Function.identity()));
        for (CriterionWeightsRequest.Weight w : request.weights()) {
            RankingCriterion criterion = byCode.get(w.code());
            if (criterion == null) {
                throw new BusinessValidationException("weights", "unknown criterion: " + w.code());
            }
            criterion.setWeight(w.weight());
            if (w.active() != null) {
                criterion.setActive(w.active());
            }
        }
        BigDecimal total = byCode.values().stream().filter(RankingCriterion::isActive)
                .map(RankingCriterion::getWeight).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(HUNDRED) != 0) {
            throw new BusinessValidationException("weights", "active criterion weights must sum to 100 (currently "
                    + total.stripTrailingZeros().toPlainString() + ")");
        }
        criterionRepository.saveAllAndFlush(byCode.values());
        auditService.record("RANKING_WEIGHTS_UPDATED", "RANKING_CRITERION", null, request.weights().toString());
        recalculate(null);
        return methodology();
    }

    @Override
    @Transactional
    public CriterionScoreDto upsertCriterionScore(Long schoolId, CriterionScoreRequest r) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        RankingCriterion criterion = criterionRepository.findByCode(r.criterionCode())
                .orElseThrow(() -> new BusinessValidationException("criterionCode", "unknown criterion: " + r.criterionCode()));
        if (RankingCriterion.PARENT_FEEDBACK.equals(criterion.getCode())) {
            throw new BusinessValidationException("criterionCode", "parent feedback is derived from approved reviews and cannot be entered");
        }
        SchoolCriterionScore score = scoreRepository
                .findBySchoolIdAndCriterionIdAndAcademicYear(schoolId, criterion.getId(), r.academicYear())
                .orElseGet(SchoolCriterionScore::new);
        score.setSchoolId(schoolId);
        score.setCriterionId(criterion.getId());
        score.setAcademicYear(r.academicYear());
        score.setRawScore(r.rawScore());
        score.setMaxScore(r.maxScore());
        score.setNormalizedScore(RankingEngine.normalize(r.rawScore(), r.maxScore()));
        score.setEvidenceNotes(InputSanitizer.clean(r.evidenceNotes()));
        score.setSourceUrl(r.sourceUrl().trim());
        // New or changed evidence must be verified before it affects rankings.
        score.setVerificationStatus(VerificationStatus.UNVERIFIED);
        score.setLastVerifiedDate(null);
        SchoolCriterionScore saved = scoreRepository.saveAndFlush(score);
        auditService.record("CRITERION_SCORE_SAVED", "CRITERION_SCORE", saved.getId(),
                "school=" + schoolId + ", criterion=" + criterion.getCode() + ", year=" + r.academicYear());
        recalculate(r.academicYear());
        return toScoreDto(saved, criterion.getCode());
    }

    @Override
    public List<CriterionScoreDto> criterionScores(Long schoolId, String academicYear) {
        String year = academicYear != null ? academicYear : referenceData.currentAcademicYear();
        Map<Long, String> codes = criterionRepository.findAll().stream()
                .collect(Collectors.toMap(RankingCriterion::getId, RankingCriterion::getCode));
        return scoreRepository.findBySchoolIdAndAcademicYear(schoolId, year).stream()
                .map(s -> toScoreDto(s, codes.get(s.getCriterionId()))).toList();
    }

    @Override
    @Transactional
    public ExternalRankingDto addExternalRanking(Long schoolId, ExternalRankingRequest r) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        RankingSource source = new RankingSource();
        source.setSchoolId(schoolId);
        source.setPublisher(InputSanitizer.clean(r.publisher()));
        source.setRankingName(InputSanitizer.clean(r.rankingName()));
        source.setRankingYear(InputSanitizer.clean(r.rankingYear()));
        source.setCategory(InputSanitizer.clean(r.category()));
        source.setRankPosition(r.rankPosition());
        source.setScoreText(InputSanitizer.clean(r.scoreText()));
        source.setSourceUrl(r.sourceUrl().trim());
        source.setRetrievedDate(r.retrievedDate());
        RankingSource saved = sourceRepository.save(source);
        auditService.record("EXTERNAL_RANKING_ADDED", "RANKING_SOURCE", saved.getId(), "school=" + schoolId + ", publisher=" + r.publisher());
        return toExternalDto(saved);
    }

    // ---------------------------------------------------------------------------------------------

    private String defaultYear() {
        return rankingRepository.findLatestAcademicYear().orElse(referenceData.currentAcademicYear());
    }

    private List<SchoolRankingDto> toDtos(List<SchoolRanking> rankings, Map<Long, Integer> scopePositions) {
        if (rankings.isEmpty()) {
            return List.of();
        }
        Map<Long, School> schools = schoolRepository.findAllById(rankings.stream().map(SchoolRanking::getSchoolId).toList())
                .stream().collect(Collectors.toMap(School::getId, Function.identity()));
        Map<String, State> states = locationService.statesByCode();
        Map<Long, District> districts = locationService.districtsById(schools.values().stream()
                .map(School::getDistrictId).filter(java.util.Objects::nonNull).collect(Collectors.toSet()));
        Map<Long, SchoolSummaryDto> cards = schoolService.summaries(schools.values());
        return rankings.stream().map(r -> {
            School s = schools.get(r.getSchoolId());
            List<SchoolClass> classes = s.getClassesOffered().stream()
                    .sorted(java.util.Comparator.comparingInt(SchoolClass::getSortOrder)).toList();
            State state = states.get(s.getStateCode());
            District district = s.getDistrictId() == null ? null : districts.get(s.getDistrictId());
            return new SchoolRankingDto(r.getSchoolId(), s.getName(), s.getSlug(), s.getLocality(), s.getCity(),
                    district == null ? null : district.getName(), s.getStateCode(), state == null ? null : state.getName(),
                    s.getEducationBoardCode(), s.getSchoolType(), r.getAcademicYear(), r.getTotalScore(), r.getRankPosition(),
                    scopePositions.get(r.getSchoolId()), r.isProvisional() ? RankingStatus.PROVISIONAL : RankingStatus.RANKED,
                    r.isProvisional(), r.getCoveragePercent(), r.getVerifiedCoveragePercent(), r.getBreakdown(),
                    r.getMethodologyVersion(), r.getCalculatedAt(), cards.get(r.getSchoolId()),
                    classes.isEmpty() ? null : classes.get(0).getName(),
                    classes.isEmpty() ? null : classes.get(classes.size() - 1).getName());
        }).toList();
    }

    private static CriterionScoreDto toScoreDto(SchoolCriterionScore s, String code) {
        return new CriterionScoreDto(s.getId(), s.getSchoolId(), code, s.getAcademicYear(), s.getRawScore(), s.getMaxScore(),
                s.getNormalizedScore(), s.getEvidenceNotes(), s.getSourceUrl(), s.getVerificationStatus(), s.getLastVerifiedDate());
    }

    private static ExternalRankingDto toExternalDto(RankingSource s) {
        return new ExternalRankingDto(s.getId(), s.getPublisher(), s.getRankingName(), s.getRankingYear(), s.getCategory(),
                s.getRankPosition(), s.getScoreText(), s.getSourceUrl(), s.getRetrievedDate(), s.getVerificationStatus());
    }
}
