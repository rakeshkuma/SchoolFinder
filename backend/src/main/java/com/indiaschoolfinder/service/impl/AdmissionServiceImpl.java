package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.admission.AdmissionRequest;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.AdmissionRequirement;
import com.indiaschoolfinder.entity.AdmissionSchedule;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.AdmissionRequirementRepository;
import com.indiaschoolfinder.repository.AdmissionScheduleRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.AdmissionStatusResolver;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.ReferenceDataService;
import com.indiaschoolfinder.util.InputSanitizer;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdmissionServiceImpl implements AdmissionService {

    private record Ordering(String property, boolean descending) {
    }

    /** Allowed sort keys; applied inside the query so NULL dates can be placed last. */
    private static final Map<String, Ordering> SORTS = Map.of(
            "deadline", new Ordering("applicationEndDate", false),
            "start", new Ordering("applicationStartDate", false),
            "updated", new Ordering("updatedAt", true));

    private final AdmissionScheduleRepository scheduleRepository;
    private final AdmissionRequirementRepository requirementRepository;
    private final SchoolRepository schoolRepository;
    private final ReferenceDataService referenceData;
    private final AdmissionStatusResolver statusResolver;
    private final AuditService auditService;
    private final Clock clock;
    private final com.indiaschoolfinder.service.ProfileScoreService profileScoreService;

    public AdmissionServiceImpl(AdmissionScheduleRepository scheduleRepository,
                                AdmissionRequirementRepository requirementRepository,
                                SchoolRepository schoolRepository, ReferenceDataService referenceData,
                                AdmissionStatusResolver statusResolver, AuditService auditService, Clock clock,
                                com.indiaschoolfinder.service.ProfileScoreService profileScoreService) {
        this.profileScoreService = profileScoreService;
        this.scheduleRepository = scheduleRepository;
        this.requirementRepository = requirementRepository;
        this.schoolRepository = schoolRepository;
        this.referenceData = referenceData;
        this.statusResolver = statusResolver;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Override
    public PageResponse<AdmissionDto> list(String academicYear, AdmissionStatus status, AdmissionCategory category,
                                           String classCode, com.indiaschoolfinder.enums.SchoolNetwork excludeNetwork,
                                           String sortBy, int page, int size) {
        Ordering sort = sortBy == null || sortBy.isBlank() ? SORTS.get("updated") : SORTS.get(sortBy.toLowerCase());
        if (sort == null) {
            throw new BusinessValidationException("sortBy", "must be one of " + String.join(", ", SORTS.keySet()));
        }
        Long classId = classCode == null || classCode.isBlank() ? null : referenceData.requireClass(classCode, "classCode").getId();
        Specification<AdmissionSchedule> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            Subquery<Long> activeSchool = query.subquery(Long.class);
            Root<School> s = activeSchool.from(School.class);
            List<Predicate> schoolMatches = new ArrayList<>(List.of(cb.equal(s.get("id"), root.get("schoolId")), cb.isTrue(s.get("active"))));
            if (excludeNetwork != null) {
                schoolMatches.add(cb.or(cb.isNull(s.get("network")), cb.notEqual(s.get("network"), excludeNetwork)));
            }
            activeSchool.select(s.get("id")).where(schoolMatches.toArray(Predicate[]::new));
            p.add(cb.exists(activeSchool));
            if (academicYear != null && !academicYear.isBlank()) {
                p.add(cb.equal(root.get("academicYear"), academicYear));
            }
            if (status != null) {
                p.add(cb.equal(root.get("status"), status));
            }
            if (category != null) {
                p.add(cb.equal(root.get("category"), category));
            }
            if (classId != null) {
                p.add(cb.equal(root.get("classId"), classId));
            }
            if (!Long.class.equals(query.getResultType())) {
                var key = root.get(sort.property());
                query.orderBy(cb.asc(cb.selectCase().when(cb.isNull(key), 1).otherwise(0)),
                        sort.descending() ? cb.desc(key) : cb.asc(key),
                        sort.descending() ? cb.desc(root.get("id")) : cb.asc(root.get("id")));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Page<AdmissionSchedule> result = scheduleRepository.findAll(spec, PageRequest.of(page, size));
        return PageResponse.of(result, toDtos(result.getContent()));
    }

    @Override
    public PageResponse<AdmissionDto> upcoming(int page, int size) {
        Page<AdmissionSchedule> result = scheduleRepository.findUpcoming(
                List.of(AdmissionStatus.UPCOMING, AdmissionStatus.OPEN), LocalDate.now(clock), PageRequest.of(page, size));
        return PageResponse.of(result, toDtos(result.getContent()));
    }

    @Override
    public AdmissionDto get(Long id) {
        AdmissionSchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission", id));
        schoolRepository.findByIdAndActiveTrue(schedule.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("Admission", id));
        return toDtos(List.of(schedule)).get(0);
    }

    @Override
    public List<AdmissionDto> bySchool(Long schoolId) {
        schoolRepository.findByIdAndActiveTrue(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        return toDtos(scheduleRepository.findBySchoolIdOrderByAcademicYearDescClassIdAsc(schoolId));
    }

    @Override
    @Transactional
    public AdmissionDto upsert(Long schoolId, AdmissionRequest r) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        SchoolClass schoolClass = referenceData.requireClass(r.classCode(), "classCode");
        AdmissionSchedule schedule = scheduleRepository.findAll((root, q, cb) -> cb.and(
                        cb.equal(root.get("schoolId"), schoolId),
                        cb.equal(root.get("classId"), schoolClass.getId()),
                        cb.equal(root.get("academicYear"), r.academicYear()),
                        cb.equal(root.get("category"), r.category())))
                .stream().findFirst().orElseGet(AdmissionSchedule::new);
        boolean created = schedule.getId() == null;

        schedule.setSchoolId(schoolId);
        schedule.setClassId(schoolClass.getId());
        schedule.setAcademicYear(r.academicYear());
        schedule.setCategory(r.category());
        schedule.setApplicationStartDate(r.applicationStartDate());
        schedule.setApplicationEndDate(r.applicationEndDate());
        if (r.statusOverride() != null) {
            schedule.setStatus(r.statusOverride());
            schedule.setStatusOverridden(true);
            schedule.setStatusOverrideReason(InputSanitizer.clean(r.statusOverrideReason()));
        } else {
            schedule.setStatusOverridden(false);
            schedule.setStatusOverrideReason(null);
            schedule.setStatus(statusResolver.resolve(r.applicationStartDate(), r.applicationEndDate(), LocalDate.now(clock)));
        }
        schedule.setAgeEligibility(InputSanitizer.clean(r.ageEligibility()));
        schedule.setSelectionCriteria(InputSanitizer.clean(r.selectionCriteria()));
        schedule.setOfficialNotificationUrl(blankToNull(r.officialNotificationUrl()));
        schedule.setApplicationUrl(blankToNull(r.applicationUrl()));
        schedule.setSourceUrl(r.sourceUrl().trim());
        schedule.setNotes(InputSanitizer.clean(r.notes()));
        schedule.setVerificationStatus(VerificationStatus.UNVERIFIED);
        schedule.setLastVerifiedDate(null);
        AdmissionSchedule saved = scheduleRepository.saveAndFlush(schedule);

        requirementRepository.deleteByScheduleId(saved.getId());
        if (r.requirements() != null) {
            int order = 0;
            List<AdmissionRequirement> requirements = new ArrayList<>();
            for (AdmissionRequest.RequirementRequest req : r.requirements()) {
                AdmissionRequirement entity = new AdmissionRequirement();
                entity.setAdmissionScheduleId(saved.getId());
                entity.setRequirementType(req.type());
                entity.setDescription(InputSanitizer.clean(req.description()));
                entity.setMandatory(req.mandatory() == null || req.mandatory());
                entity.setPoints(req.points());
                entity.setSortOrder(order++);
                requirements.add(entity);
            }
            requirementRepository.saveAll(requirements);
        }
        auditService.record(created ? "ADMISSION_CREATED" : "ADMISSION_UPDATED", "ADMISSION", saved.getId(),
                "school=" + schoolId + ", class=" + schoolClass.getCode() + ", year=" + r.academicYear()
                        + ", category=" + r.category() + ", status=" + saved.getStatus()
                        + (saved.isStatusOverridden() ? " (override)" : ""));
        profileScoreService.recompute(schoolId); // an official admission cycle counts towards the recommended order
        return toDtos(List.of(saved)).get(0);
    }

    @Override
    @Transactional
    public int refreshStatuses() {
        LocalDate today = LocalDate.now(clock);
        int changed = 0;
        for (AdmissionSchedule schedule : scheduleRepository.findByStatusOverriddenFalse()) {
            AdmissionStatus derived = statusResolver.resolve(schedule.getApplicationStartDate(), schedule.getApplicationEndDate(), today);
            if (derived != schedule.getStatus()) {
                schedule.setStatus(derived);
                changed++;
            }
        }
        return changed;
    }

    // ---------------------------------------------------------------------------------------------

    /** Maps a page of schedules with three batched queries (schools, classes, requirements). */
    private List<AdmissionDto> toDtos(List<AdmissionSchedule> schedules) {
        if (schedules.isEmpty()) {
            return List.of();
        }
        Map<Long, School> schools = schoolRepository.findAllById(
                        schedules.stream().map(AdmissionSchedule::getSchoolId).distinct().toList())
                .stream().collect(Collectors.toMap(School::getId, Function.identity()));
        Map<Long, SchoolClass> classes = referenceData.classesById();
        Map<Long, List<AdmissionRequirement>> requirements = requirementRepository
                .findByAdmissionScheduleIdInOrderByAdmissionScheduleIdAscSortOrderAsc(
                        schedules.stream().map(AdmissionSchedule::getId).toList())
                .stream().collect(Collectors.groupingBy(AdmissionRequirement::getAdmissionScheduleId));

        return schedules.stream().map(a -> {
            School school = schools.get(a.getSchoolId());
            SchoolClass cls = classes.get(a.getClassId());
            List<AdmissionDto.Requirement> reqs = requirements.getOrDefault(a.getId(), List.of()).stream()
                    .map(r -> new AdmissionDto.Requirement(r.getRequirementType(), r.getDescription(), r.isMandatory(), r.getPoints()))
                    .toList();
            return new AdmissionDto(a.getId(), a.getSchoolId(), school == null ? null : school.getName(),
                    school == null ? null : school.getSlug(), cls.getCode(), cls.getName(), a.getAcademicYear(),
                    a.getCategory(), a.getApplicationStartDate(), a.getApplicationEndDate(), a.getStatus(),
                    a.isStatusOverridden(), a.getStatusOverrideReason(), a.getAgeEligibility(), a.getSelectionCriteria(),
                    a.getOfficialNotificationUrl(), a.getApplicationUrl(), reqs, a.getSourceUrl(),
                    a.getVerificationStatus(), a.getLastVerifiedDate(), a.getNotes(), a.getUpdatedAt());
        }).toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
