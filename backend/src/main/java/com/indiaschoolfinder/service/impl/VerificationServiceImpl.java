package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.admin.BatchVerifyRequest;
import com.indiaschoolfinder.dto.admin.FacilityQueueItemDto;
import com.indiaschoolfinder.dto.admin.VerificationHistoryDto;
import com.indiaschoolfinder.dto.admin.VerifyRequest;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.AdmissionSchedule;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.entity.SchoolCriterionScore;
import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.entity.SchoolFee;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.entity.VerificationHistory;
import com.indiaschoolfinder.enums.VerifiableEntityType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.AdmissionScheduleRepository;
import com.indiaschoolfinder.repository.SchoolBoardingRepository;
import com.indiaschoolfinder.repository.SchoolCriterionScoreRepository;
import com.indiaschoolfinder.repository.SchoolFacilityRepository;
import com.indiaschoolfinder.repository.SchoolFeeRepository;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.VerificationHistoryRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.VerificationService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VerificationServiceImpl implements VerificationService {

    private final SchoolRepository schoolRepository;
    private final SchoolFeeRepository feeRepository;
    private final AdmissionScheduleRepository admissionRepository;
    private final SchoolImageRepository imageRepository;
    private final SchoolFacilityRepository facilityRepository;
    private final SchoolCriterionScoreRepository scoreRepository;
    private final VerificationHistoryRepository historyRepository;
    private final RankingService rankingService;
    private final AuditService auditService;
    private final AuditorAware<String> auditorAware;
    private final Clock clock;
    private final SchoolMapper mapper;
    private final LocationService locationService;
    private final SchoolBoardingRepository boardingRepository;

    public VerificationServiceImpl(SchoolRepository schoolRepository, SchoolFeeRepository feeRepository,
                                   AdmissionScheduleRepository admissionRepository, SchoolImageRepository imageRepository,
                                   SchoolFacilityRepository facilityRepository, SchoolCriterionScoreRepository scoreRepository,
                                   VerificationHistoryRepository historyRepository, RankingService rankingService,
                                   AuditService auditService, AuditorAware<String> auditorAware, Clock clock,
                                   SchoolMapper mapper, LocationService locationService,
                                   SchoolBoardingRepository boardingRepository) {
        this.boardingRepository = boardingRepository;
        this.mapper = mapper;
        this.locationService = locationService;
        this.schoolRepository = schoolRepository;
        this.feeRepository = feeRepository;
        this.admissionRepository = admissionRepository;
        this.imageRepository = imageRepository;
        this.facilityRepository = facilityRepository;
        this.scoreRepository = scoreRepository;
        this.historyRepository = historyRepository;
        this.rankingService = rankingService;
        this.auditService = auditService;
        this.auditorAware = auditorAware;
        this.clock = clock;
    }

    @Override
    @Transactional
    public VerificationHistoryDto verify(Long schoolId, VerifyRequest r) {
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        VerificationHistoryDto result = toDto(verifyOne(school, r));
        if (affectsRankings(r.entityType())) {
            rankingService.recalculate(null);
        }
        return result;
    }

    @Override
    @Transactional
    public List<VerificationHistoryDto> verifyBatch(Long schoolId, BatchVerifyRequest r) {
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        if (r.entityType() == VerifiableEntityType.SCHOOL) {
            throw new BusinessValidationException("entityType", "verify the school profile with a single decision");
        }
        // Any id that is unknown or belongs to another school fails the whole batch (the transaction rolls back).
        List<VerificationHistoryDto> results = r.entityIds().stream().distinct()
                .map(id -> toDto(verifyOne(school, new VerifyRequest(r.entityType(), id, r.status(), r.sourceUrl(), r.notes()))))
                .toList();
        if (affectsRankings(r.entityType())) {
            rankingService.recalculate(null);
        }
        return results;
    }

    @Override
    public PageResponse<FacilityQueueItemDto> facilityQueue(String state, int page, int size) {
        String stateCode = state == null || state.isBlank() ? "" : locationService.resolveStateCode(state, "state");
        Page<Long> ids = facilityRepository.findSchoolIdsWithFacilityStatus(stateCode, VerificationStatus.UNVERIFIED,
                PageRequest.of(page, size));
        if (ids.isEmpty()) {
            return PageResponse.of(ids, List.of());
        }
        Map<Long, School> schools = schoolRepository.findAllById(ids.getContent()).stream()
                .collect(Collectors.toMap(School::getId, Function.identity()));
        Map<Long, List<SchoolFacility>> facilities = facilityRepository.findBySchoolIdInOrderByCategoryAscNameAsc(ids.getContent())
                .stream().collect(Collectors.groupingBy(SchoolFacility::getSchoolId));
        Map<String, State> states = locationService.statesByCode();
        List<FacilityQueueItemDto> items = ids.getContent().stream().map(id -> {
            School s = schools.get(id);
            List<SchoolFacility> list = facilities.getOrDefault(id, List.of());
            State st = states.get(s.getStateCode());
            return new FacilityQueueItemDto(id, s.getName(), s.getSlug(), s.getStateCode(), st == null ? null : st.getName(),
                    s.getWebsiteUrl(), s.getSourceUrl(),
                    list.stream().filter(f -> f.getVerificationStatus() == VerificationStatus.UNVERIFIED).count(),
                    list.stream().map(mapper::toFacilityDto).toList());
        }).toList();
        return PageResponse.of(ids, items);
    }

    /** Facility statuses feed the documented-facility checklists (methodology 2.0). */
    private static boolean affectsRankings(VerifiableEntityType type) {
        return type == VerifiableEntityType.CRITERION_SCORE || type == VerifiableEntityType.FACILITY;
    }

    private VerificationHistory verifyOne(School school, VerifyRequest r) {
        Long schoolId = school.getId();
        LocalDate today = LocalDate.now(clock);
        LocalDate verifiedDate = r.status() == VerificationStatus.VERIFIED ? today : null;

        VerificationStatus previous;
        Long entityId;
        switch (r.entityType()) {
            case SCHOOL -> {
                if (r.entityId() != null && !r.entityId().equals(schoolId)) {
                    throw new BusinessValidationException("entityId", "entityId must be the school id or omitted for SCHOOL");
                }
                previous = school.getVerificationStatus();
                school.setVerificationStatus(r.status());
                if (verifiedDate != null) {
                    school.setLastVerifiedDate(verifiedDate);
                }
                entityId = schoolId;
            }
            case FEE -> {
                SchoolFee fee = child(feeRepository, r, SchoolFee::getSchoolId, schoolId);
                previous = fee.getVerificationStatus();
                apply(fee, r.status(), verifiedDate, SchoolFee::setVerificationStatus, SchoolFee::setLastVerifiedDate);
                entityId = fee.getId();
            }
            case ADMISSION -> {
                AdmissionSchedule adm = child(admissionRepository, r, AdmissionSchedule::getSchoolId, schoolId);
                previous = adm.getVerificationStatus();
                apply(adm, r.status(), verifiedDate, AdmissionSchedule::setVerificationStatus, AdmissionSchedule::setLastVerifiedDate);
                entityId = adm.getId();
            }
            case IMAGE -> {
                SchoolImage image = child(imageRepository, r, SchoolImage::getSchoolId, schoolId);
                previous = image.getVerificationStatus();
                apply(image, r.status(), verifiedDate, SchoolImage::setVerificationStatus, SchoolImage::setLastVerifiedDate);
                entityId = image.getId();
            }
            case FACILITY -> {
                SchoolFacility facility = child(facilityRepository, r, SchoolFacility::getSchoolId, schoolId);
                previous = facility.getVerificationStatus();
                apply(facility, r.status(), verifiedDate, SchoolFacility::setVerificationStatus, SchoolFacility::setLastVerifiedDate);
                entityId = facility.getId();
            }
            case CRITERION_SCORE -> {
                SchoolCriterionScore score = child(scoreRepository, r, SchoolCriterionScore::getSchoolId, schoolId);
                previous = score.getVerificationStatus();
                apply(score, r.status(), verifiedDate, SchoolCriterionScore::setVerificationStatus, SchoolCriterionScore::setLastVerifiedDate);
                entityId = score.getId();
            }
            case BOARDING -> {
                if (r.entityId() != null && !r.entityId().equals(schoolId)) {
                    throw new BusinessValidationException("entityId", "entityId must be the school id or omitted for BOARDING");
                }
                SchoolBoarding boarding = boardingRepository.findById(schoolId)
                        .orElseThrow(() -> new ResourceNotFoundException("Boarding profile", schoolId));
                previous = boarding.getVerificationStatus();
                apply(boarding, r.status(), verifiedDate, SchoolBoarding::setVerificationStatus, SchoolBoarding::setLastVerifiedDate);
                entityId = schoolId;
            }
            default -> throw new BusinessValidationException("entityType", "unsupported entity type");
        }

        VerificationHistory history = new VerificationHistory();
        history.setEntityType(r.entityType());
        history.setEntityId(entityId);
        history.setSchoolId(schoolId);
        history.setPreviousStatus(previous);
        history.setNewStatus(r.status());
        history.setSourceUrl(r.sourceUrl().trim());
        history.setNotes(InputSanitizer.clean(r.notes()));
        history.setVerifiedBy(auditorAware.getCurrentAuditor().orElse("system"));
        history.setVerifiedAt(Instant.now(clock));
        VerificationHistory saved = historyRepository.save(history);

        auditService.record("VERIFY_" + r.entityType(), r.entityType().name(), entityId,
                previous + " -> " + r.status() + ", source=" + r.sourceUrl());
        return saved;
    }

    @Override
    public List<VerificationHistoryDto> history(Long schoolId) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        return historyRepository.findTop50BySchoolIdOrderByVerifiedAtDesc(schoolId).stream().map(VerificationServiceImpl::toDto).toList();
    }

    /** Loads a child record and checks it belongs to the school in the URL (prevents cross-school edits). */
    private static <T> T child(JpaRepository<T, Long> repository, VerifyRequest r, Function<T, Long> schoolIdOf, Long schoolId) {
        if (r.entityId() == null) {
            throw new BusinessValidationException("entityId", "entityId is required for " + r.entityType());
        }
        T entity = repository.findById(r.entityId())
                .orElseThrow(() -> new ResourceNotFoundException(r.entityType().name(), r.entityId()));
        if (!schoolId.equals(schoolIdOf.apply(entity))) {
            throw new ResourceNotFoundException(r.entityType().name(), r.entityId());
        }
        return entity;
    }

    private static <T> void apply(T entity, VerificationStatus status, LocalDate verifiedDate,
                                  BiConsumer<T, VerificationStatus> setStatus, BiConsumer<T, LocalDate> setDate) {
        setStatus.accept(entity, status);
        if (verifiedDate != null) {
            setDate.accept(entity, verifiedDate);
        }
    }

    private static VerificationHistoryDto toDto(VerificationHistory h) {
        return new VerificationHistoryDto(h.getId(), h.getEntityType(), h.getEntityId(), h.getPreviousStatus(),
                h.getNewStatus(), h.getSourceUrl(), h.getNotes(), h.getVerifiedBy(), h.getVerifiedAt());
    }
}
