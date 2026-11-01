package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.location.SuggestionDto;
import com.indiaschoolfinder.dto.school.FacilityDto;
import com.indiaschoolfinder.dto.school.FacilityRequest;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.dto.school.SchoolStatusRequest;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.entity.AdmissionSchedule;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.entity.SchoolFee;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.DuplicateResourceException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.AdmissionScheduleRepository;
import com.indiaschoolfinder.repository.EducationBoardRepository;
import com.indiaschoolfinder.repository.SchoolBoardingRepository;
import com.indiaschoolfinder.repository.SchoolFeeRepository;
import com.indiaschoolfinder.repository.SchoolClassRepository;
import com.indiaschoolfinder.repository.SchoolFacilityRepository;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.service.SchoolService;
import com.indiaschoolfinder.specification.SchoolSpecifications;
import com.indiaschoolfinder.util.AcademicYears;
import com.indiaschoolfinder.util.GeoUtil;
import com.indiaschoolfinder.util.InputSanitizer;
import com.indiaschoolfinder.util.SlugUtil;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SchoolServiceImpl implements SchoolService {

    /** Public sort keys → entity properties. Anything else is rejected with 400. */
    static final Map<String, String> SORT_FIELDS = Map.ofEntries(
            Map.entry("name", "name"),
            Map.entry("fee", SchoolSpecifications.ANNUAL_FEE),
            Map.entry("locality", "locality"),
            Map.entry("city", "city"),
            Map.entry("location", SchoolSpecifications.LOCATION),
            Map.entry("rating", "averageRating"),
            Map.entry("reviews", "reviewCount"),
            Map.entry("newest", "createdAt"),
            Map.entry("updated", "updatedAt"),
            Map.entry("verified", "lastVerifiedDate"),
            // Default order: ranked and best-documented profiles first, states taking turns within a score tier
            // (see ProfileScoreService), then name.
            Map.entry("recommended", SchoolSpecifications.RECOMMENDED));
    static final String SORT_DISTANCE = "distance";
    static final String SORT_RECOMMENDED = "recommended";
    private static final Set<String> DESCENDING_BY_DEFAULT = Set.of("rating", "reviews", "newest", "updated", "verified",
            SORT_RECOMMENDED);

    private final SchoolRepository schoolRepository;
    private final SchoolClassRepository classRepository;
    private final EducationBoardRepository boardRepository;
    private final SchoolImageRepository imageRepository;
    private final SchoolFacilityRepository facilityRepository;
    private final SchoolMapper mapper;
    private final AuditService auditService;
    private final Clock clock;
    private final SchoolFeeRepository feeRepository;
    private final AdmissionScheduleRepository admissionRepository;
    private final LocationService locationService;
    private final SchoolBoardingRepository boardingRepository;

    public SchoolServiceImpl(SchoolRepository schoolRepository, SchoolClassRepository classRepository,
                             EducationBoardRepository boardRepository, SchoolImageRepository imageRepository,
                             SchoolFacilityRepository facilityRepository, SchoolMapper mapper,
                             AuditService auditService, Clock clock,
                             SchoolFeeRepository feeRepository, AdmissionScheduleRepository admissionRepository,
                             LocationService locationService, SchoolBoardingRepository boardingRepository) {
        this.locationService = locationService;
        this.boardingRepository = boardingRepository;
        this.feeRepository = feeRepository;
        this.admissionRepository = admissionRepository;
        this.schoolRepository = schoolRepository;
        this.classRepository = classRepository;
        this.boardRepository = boardRepository;
        this.imageRepository = imageRepository;
        this.facilityRepository = facilityRepository;
        this.mapper = mapper;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Override
    public PageResponse<SchoolSummaryDto> search(SchoolSearchCriteria c) {
        validateSearch(c);
        String sortBy = c.sortBy() == null || c.sortBy().isBlank()
                ? (c.hasLocation() ? SORT_DISTANCE : SORT_RECOMMENDED)
                : c.sortBy().trim().toLowerCase(Locale.ROOT);
        boolean byDistance = SORT_DISTANCE.equals(sortBy);

        LocalDate today = LocalDate.now(clock);
        String currentYear = AcademicYears.of(today);
        // Fee filter: an explicit year, otherwise each school's latest complete schedule from this or last year.
        List<String> feeYears = c.feeAcademicYear() != null ? List.of(c.feeAcademicYear())
                : List.of(currentYear, AcademicYears.of(today.minusYears(1)));
        List<String> admissionYears = List.of(currentYear, AcademicYears.of(today.plusYears(1)));

        SchoolSpecifications.Ordering ordering = byDistance
                ? SchoolSpecifications.Ordering.byDistance()
                : toOrdering(sortBy, c.sortDirection());
        String stateCode = c.state() == null || c.state().isBlank() ? null : locationService.resolveStateCode(c.state(), "state");
        Specification<School> spec = SchoolSpecifications.matching(c, stateCode, feeYears, admissionYears, ordering);

        // Ordering lives in the specification, so the Pageable stays unsorted.
        Page<School> page = schoolRepository.findAll(spec, PageRequest.of(c.pageOrDefault(), c.sizeOrDefault()));
        return PageResponse.of(page, toSummaries(page.getContent(), c.latitude(), c.longitude()));
    }

    /**
     * Not a ranking: active schools that have a real photograph cleared for publication, verified profiles first,
     * then the most recently verified, then by name.
     */
    @Override
    public List<SchoolSummaryDto> featured(String state, int limit) {
        String stateCode = state == null || state.isBlank() ? null : locationService.resolveStateCode(state, "state");
        int capped = Math.max(1, Math.min(limit, 24));
        Specification<School> spec = (root, query, cb) -> {
            Subquery<Long> photo = query.subquery(Long.class);
            Root<SchoolImage> i = photo.from(SchoolImage.class);
            photo.select(i.get("id")).where(
                    cb.equal(i.get("schoolId"), root.get("id")),
                    cb.notEqual(i.get("imageType"), ImageType.LOGO),
                    cb.isFalse(i.get("illustrative")),
                    i.get("permissionStatus").in(ImagePermission.PUBLISHABLE));
            List<jakarta.persistence.criteria.Predicate> p = new ArrayList<>(List.of(cb.isTrue(root.get("active")), cb.exists(photo)));
            if (stateCode != null) {
                p.add(cb.equal(root.get("stateCode"), stateCode));
            }
            query.orderBy(
                    cb.asc(cb.selectCase().when(cb.equal(root.get("verificationStatus"), VerificationStatus.VERIFIED), 0).otherwise(1)),
                    cb.asc(cb.selectCase().when(cb.isNull(root.get("lastVerifiedDate")), 1).otherwise(0)),
                    cb.desc(root.get("lastVerifiedDate")),
                    cb.asc(root.get("name")));
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        List<School> schools = schoolRepository.findBy(spec, q -> q.limit(capped).all());
        return toSummaries(schools, null, null);
    }

    @Override
    public SuggestionDto suggest(String q, int limit) {
        String term = q == null ? "" : q.trim();
        if (term.length() < 2) {
            return new SuggestionDto(List.of(), List.of());
        }
        int capped = Math.max(1, Math.min(limit, 10));
        Specification<School> spec = SchoolSpecifications.matching(SchoolSearchCriteria.ofQuery(term), null, List.of(), List.of(),
                new SchoolSpecifications.Ordering("name", false));
        // Limit without a count query: suggestions never need totals.
        List<School> schools = schoolRepository.findBy(spec, query -> query.limit(capped).all());
        List<SuggestionDto.SchoolSuggestion> schoolSuggestions = schools.stream()
                .map(s -> new SuggestionDto.SchoolSuggestion(s.getId(), s.getName(), s.getSlug(), s.getLocality(),
                        s.getCity(), s.getStateCode()))
                .toList();
        // "Arrah" or "Allahabad" also suggest the place under the name this site uses.
        String preferred = com.indiaschoolfinder.util.PlaceAliases.preferred(term);
        var places = new ArrayList<>(locationService.suggestPlaces(term, Math.min(capped, 6)));
        if (preferred != null) {
            // Only places named by the preferred spelling ("Ara", not every place containing "ara"), shown first.
            List<SuggestionDto.PlaceSuggestion> named = locationService.suggestPlaces(preferred, 10).stream()
                    .filter(p -> p.label().toLowerCase(Locale.ROOT).matches(java.util.regex.Pattern.quote(preferred) + "\\b.*"))
                    .toList();
            places.removeAll(named);
            places.addAll(0, named);
        }
        return new SuggestionDto(schoolSuggestions, places.stream().limit(Math.min(capped, 6)).toList());
    }

    @Override
    public SchoolDetailDto getActiveById(Long id) {
        School school = schoolRepository.findWithClassesById(id)
                .filter(School::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("School", id));
        return toDetail(school);
    }

    @Override
    public SchoolDetailDto getActiveBySlug(String slug) {
        School school = schoolRepository.findWithClassesBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("School", slug));
        return toDetail(school);
    }

    @Override
    public SchoolDetailDto getById(Long id) {
        return toDetail(loadWithClasses(id));
    }

    @Override
    public PageResponse<SchoolSummaryDto> adminList(String q, Boolean active, int page, int size) {
        Specification<School> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> p = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                p.add(cb.like(cb.lower(root.get("name")), "%" + q.trim().toLowerCase(Locale.ROOT)
                        .replace("%", "\\%").replace("_", "\\_") + "%", '\\'));
            }
            if (active != null) {
                p.add(cb.equal(root.get("active"), active));
            }
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        Page<School> result = schoolRepository.findAll(spec, PageRequest.of(page, size, Sort.by("name", "id")));
        return PageResponse.of(result, toSummaries(result.getContent(), null, null));
    }

    @Override
    public List<SchoolSummaryDto> nearby(double latitude, double longitude, double radiusKm, int limit, Long excludeSchoolId) {
        if (radiusKm <= 0 || radiusKm > 50) {
            throw new BusinessValidationException("radiusKm", "must be between 0 and 50 km");
        }
        int capped = Math.max(1, Math.min(limit, 50));
        GeoUtil.BoundingBox box = GeoUtil.boundingBox(latitude, longitude, radiusKm);
        List<Object[]> rows = schoolRepository.findNearby(latitude, longitude, box.minLat(), box.maxLat(),
                box.minLon(), box.maxLon(), radiusKm, capped + 1);

        Map<Long, Double> distances = new LinkedHashMap<>();
        for (Object[] row : rows) {
            Long id = ((Number) row[0]).longValue();
            if (!id.equals(excludeSchoolId)) {
                distances.put(id, ((Number) row[1]).doubleValue());
            }
        }
        Map<Long, School> schools = schoolRepository.findAllById(distances.keySet()).stream()
                .collect(Collectors.toMap(School::getId, Function.identity()));
        Map<Long, SchoolImage> covers = coverImages(distances.keySet());
        SchoolMapper.Places places = places(schools.values());
        return distances.entrySet().stream()
                .limit(capped)
                .filter(e -> schools.containsKey(e.getKey()))
                .map(e -> mapper.toSummary(schools.get(e.getKey()), covers.get(e.getKey()), e.getValue(), places))
                .toList();
    }

    @Override
    @Transactional
    public SchoolDetailDto create(SchoolRequest request) {
        School school = new School();
        mapper.applyRequest(request, school);
        applyLocation(request, school);
        validateReferences(school);
        ensureNotDuplicate(school, null);
        school.setClassesOffered(resolveClasses(request.classCodes()));
        school.setSlug(uniqueSlug(school.getName(), school.getLocality(), school.getCity()));
        school.setVerificationStatus(VerificationStatus.UNVERIFIED);
        School saved = schoolRepository.save(school);
        auditService.record("SCHOOL_CREATED", "SCHOOL", saved.getId(), "name=" + saved.getName() + ", source=" + saved.getSourceUrl());
        return toDetail(saved);
    }

    @Override
    @Transactional
    public SchoolDetailDto update(Long id, SchoolRequest request, Long expectedVersion) {
        School school = loadWithClasses(id);
        if (expectedVersion != null && expectedVersion != school.getVersion()) {
            throw new ObjectOptimisticLockingFailureException(School.class, id);
        }
        mapper.applyRequest(request, school);
        applyLocation(request, school);
        validateReferences(school);
        ensureNotDuplicate(school, id);
        school.getClassesOffered().clear();
        school.getClassesOffered().addAll(resolveClasses(request.classCodes()));
        // Edited facts are no longer the facts that were verified.
        school.setVerificationStatus(VerificationStatus.UNVERIFIED);
        School saved = schoolRepository.saveAndFlush(school);
        auditService.record("SCHOOL_UPDATED", "SCHOOL", id, "source=" + saved.getSourceUrl());
        return toDetail(saved);
    }

    @Override
    @Transactional
    public SchoolDetailDto updateStatus(Long id, SchoolStatusRequest request) {
        School school = loadWithClasses(id);
        school.setActive(request.active());
        School saved = schoolRepository.saveAndFlush(school);
        auditService.record(request.active() ? "SCHOOL_ACTIVATED" : "SCHOOL_DEACTIVATED", "SCHOOL", id,
                InputSanitizer.clean(request.reason()));
        return toDetail(saved);
    }

    @Override
    public List<FacilityDto> facilities(Long schoolId) {
        requireActive(schoolId);
        return facilityRepository.findBySchoolIdOrderByCategoryAscNameAsc(schoolId).stream()
                .map(mapper::toFacilityDto).toList();
    }

    @Override
    @Transactional
    public FacilityDto addFacility(Long schoolId, FacilityRequest request) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        String name = InputSanitizer.clean(request.name());
        if (facilityRepository.existsBySchoolIdAndCategoryAndNameIgnoreCase(schoolId, request.category(), name)) {
            throw new DuplicateResourceException("Facility '" + name + "' already exists for this school");
        }
        SchoolFacility facility = new SchoolFacility();
        facility.setSchoolId(schoolId);
        facility.setCategory(request.category());
        facility.setName(name);
        facility.setDescription(InputSanitizer.clean(request.description()));
        facility.setAvailable(request.available());
        facility.setSourceUrl(request.sourceUrl().trim());
        SchoolFacility saved = facilityRepository.save(facility);
        auditService.record("FACILITY_ADDED", "FACILITY", saved.getId(), "school=" + schoolId + ", name=" + name);
        return mapper.toFacilityDto(saved);
    }

    @Override
    public List<ImageDto> images(Long schoolId) {
        requireActive(schoolId);
        return imageRepository.findBySchoolIdAndPermissionStatusInOrderBySortOrderAscIdAsc(schoolId, ImagePermission.PUBLISHABLE)
                .stream().map(mapper::toPublicImageDto).toList();
    }

    @Override
    public void requireActive(Long schoolId) {
        schoolRepository.findByIdAndActiveTrue(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
    }

    // ---------------------------------------------------------------------------------------------

    private void validateSearch(SchoolSearchCriteria c) {
        if ((c.latitude() == null) != (c.longitude() == null)) {
            throw new BusinessValidationException("latitude", "latitude and longitude must be supplied together");
        }
        if (c.radiusKm() != null && !c.hasLocation()) {
            throw new BusinessValidationException("radiusKm", "radiusKm requires latitude and longitude");
        }
        if (c.minAnnualFee() != null && c.maxAnnualFee() != null && c.minAnnualFee().compareTo(c.maxAnnualFee()) > 0) {
            throw new BusinessValidationException("minAnnualFee", "minAnnualFee must not exceed maxAnnualFee");
        }
        if (c.sortBy() != null && !c.sortBy().isBlank()) {
            String key = c.sortBy().trim().toLowerCase(Locale.ROOT);
            if (SORT_DISTANCE.equals(key) && !c.hasLocation()) {
                throw new BusinessValidationException("sortBy", "sorting by distance requires latitude and longitude");
            }
            if (!SORT_DISTANCE.equals(key) && !SORT_FIELDS.containsKey(key)) {
                throw new BusinessValidationException("sortBy", "must be one of " + allowedSortKeys());
            }
        }
        if (c.sortDirection() != null && !c.sortDirection().isBlank()
                && !c.sortDirection().equalsIgnoreCase("asc") && !c.sortDirection().equalsIgnoreCase("desc")) {
            throw new BusinessValidationException("sortDirection", "must be asc or desc");
        }
    }

    private static String allowedSortKeys() {
        List<String> keys = new ArrayList<>(SORT_FIELDS.keySet());
        keys.add(SORT_DISTANCE);
        keys.sort(String::compareTo);
        return String.join(", ", keys);
    }

    private static SchoolSpecifications.Ordering toOrdering(String sortKey, String direction) {
        boolean descending;
        if (direction == null || direction.isBlank()) {
            // Ratings, review counts and dates read best/newest first by default.
            descending = DESCENDING_BY_DEFAULT.contains(sortKey);
        } else {
            descending = direction.equalsIgnoreCase("desc");
        }
        return new SchoolSpecifications.Ordering(SORT_FIELDS.get(sortKey), descending);
    }

    @Override
    public Map<Long, SchoolSummaryDto> summaries(Collection<School> schools) {
        return toSummaries(List.copyOf(schools), null, null).stream()
                .collect(Collectors.toMap(SchoolSummaryDto::id, java.util.function.Function.identity()));
    }

    private List<SchoolSummaryDto> toSummaries(List<School> schools, Double lat, Double lon) {
        List<Long> ids = schools.stream().map(School::getId).toList();
        Map<Long, SchoolImage> covers = coverImages(ids);
        Map<Long, SchoolMapper.Highlights> highlights = highlights(ids);
        SchoolMapper.Places places = places(schools);
        return schools.stream().map(s -> {
            Double distance = lat != null && lon != null && s.getLatitude() != null
                    ? GeoUtil.haversineKm(lat, lon, s.getLatitude(), s.getLongitude()) : null;
            return mapper.toSummary(s, covers.get(s.getId()), distance,
                    highlights.getOrDefault(s.getId(), SchoolMapper.Highlights.NONE), places);
        }).toList();
    }

    private SchoolMapper.Places places(Collection<School> schools) {
        Set<Long> districtIds = schools.stream().map(School::getDistrictId).filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        return new SchoolMapper.Places(locationService.statesByCode(), locationService.districtsById(districtIds));
    }

    /** Resolves the request's state (code or name) and district name to their reference rows. */
    private void applyLocation(SchoolRequest request, School school) {
        String stateCode = locationService.resolveStateCode(request.stateCode(), "stateCode");
        school.setStateCode(stateCode);
        String district = request.district() == null || request.district().isBlank() ? null : request.district();
        school.setDistrictId(district == null ? null : locationService.findOrCreateDistrict(stateCode, district).getId());
    }

    /** Lowest complete official annual fee (latest year that has one) and best open/upcoming admission status. */
    private Map<Long, SchoolMapper.Highlights> highlights(Collection<Long> schoolIds) {
        if (schoolIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, SchoolFee> cheapest = new HashMap<>();
        for (SchoolFee fee : feeRepository.findBySchoolIdInAndRecurringAnnualOfficialIsNotNull(schoolIds)) {
            cheapest.merge(fee.getSchoolId(), fee, (a, b) -> {
                int byYear = a.getAcademicYear().compareTo(b.getAcademicYear());
                if (byYear != 0) {
                    return byYear > 0 ? a : b;
                }
                return a.getRecurringAnnualOfficial().compareTo(b.getRecurringAnnualOfficial()) <= 0 ? a : b;
            });
        }
        Map<Long, AdmissionStatus> admission = new HashMap<>();
        for (AdmissionSchedule a : admissionRepository.findBySchoolIdInAndStatusIn(schoolIds,
                List.of(AdmissionStatus.OPEN, AdmissionStatus.UPCOMING))) {
            admission.merge(a.getSchoolId(), a.getStatus(),
                    (x, y) -> x == AdmissionStatus.OPEN || y == AdmissionStatus.OPEN ? AdmissionStatus.OPEN : x);
        }
        Map<Long, SchoolBoarding> boarding = boardingRepository.findBySchoolIdIn(schoolIds).stream()
                .collect(Collectors.toMap(SchoolBoarding::getSchoolId, java.util.function.Function.identity()));
        // Lowest and highest class offered, as [name, sortOrder] pairs.
        Map<Long, Object[]> lowest = new HashMap<>();
        Map<Long, Object[]> highest = new HashMap<>();
        for (Object[] row : schoolRepository.findClassesForSchools(schoolIds)) {
            Long id = (Long) row[0];
            Object[] cls = {row[1], row[2]};
            lowest.merge(id, cls, (a, b) -> (Integer) a[1] <= (Integer) b[1] ? a : b);
            highest.merge(id, cls, (a, b) -> (Integer) a[1] >= (Integer) b[1] ? a : b);
        }
        // Facility categories a cited source states are available (outdated or disputed statements are left out).
        Map<Long, java.util.EnumSet<FacilityCategory>> facilities = new HashMap<>();
        for (SchoolFacility f : facilityRepository.findBySchoolIdInOrderByCategoryAscNameAsc(schoolIds)) {
            if (Boolean.TRUE.equals(f.getAvailable()) && (f.getVerificationStatus() == VerificationStatus.VERIFIED
                    || f.getVerificationStatus() == VerificationStatus.UNVERIFIED)) {
                facilities.computeIfAbsent(f.getSchoolId(), k -> java.util.EnumSet.noneOf(FacilityCategory.class))
                        .add(f.getCategory());
            }
        }
        Map<Long, SchoolMapper.Highlights> result = new HashMap<>();
        for (Long id : schoolIds) {
            SchoolFee fee = cheapest.get(id);
            Object[] from = lowest.get(id);
            Object[] to = highest.get(id);
            result.put(id, new SchoolMapper.Highlights(
                    fee == null ? null : fee.getRecurringAnnualOfficial(),
                    fee == null ? null : fee.getAcademicYear(),
                    admission.get(id), boarding.get(id),
                    from == null ? null : (String) from[0], to == null ? null : (String) to[0],
                    List.copyOf(facilities.getOrDefault(id, java.util.EnumSet.noneOf(FacilityCategory.class)))));
        }
        return result;
    }

    /** First non-logo image per school, fetched in a single query. */
    private Map<Long, SchoolImage> coverImages(Collection<Long> schoolIds) {
        if (schoolIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, SchoolImage> covers = new HashMap<>();
        for (SchoolImage image : imageRepository.findGalleryImagesForSchools(schoolIds, ImageType.LOGO, ImagePermission.PUBLISHABLE)) {
            covers.putIfAbsent(image.getSchoolId(), image);
        }
        return covers;
    }

    private School loadWithClasses(Long id) {
        return schoolRepository.findWithClassesById(id).orElseThrow(() -> new ResourceNotFoundException("School", id));
    }

    private SchoolDetailDto toDetail(School school) {
        var board = school.getEducationBoardCode() == null ? null
                : boardRepository.findByCodeIgnoreCase(school.getEducationBoardCode()).orElse(null);
        var state = locationService.statesByCode().get(school.getStateCode());
        var district = school.getDistrictId() == null ? null
                : locationService.districtsById(List.of(school.getDistrictId())).get(school.getDistrictId());
        var boarding = school.getId() == null ? null : boardingRepository.findById(school.getId()).orElse(null);
        return mapper.toDetail(school, board, state, district, boarding);
    }

    private void validateReferences(School school) {
        if (school.getEducationBoardCode() != null && !boardRepository.existsByCode(school.getEducationBoardCode())) {
            throw new BusinessValidationException("boardCode", "unknown education board: " + school.getEducationBoardCode());
        }
        if ((school.getLatitude() == null) != (school.getLongitude() == null)) {
            throw new BusinessValidationException("latitude", "latitude and longitude must be supplied together");
        }
    }

    private void ensureNotDuplicate(School school, Long selfId) {
        if (school.getUdiseCode() != null) {
            schoolRepository.findByUdiseCode(school.getUdiseCode())
                    .filter(existing -> !existing.getId().equals(selfId))
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException("UDISE code " + school.getUdiseCode()
                                + " already belongs to '" + existing.getName() + "' (id " + existing.getId() + ")");
                    });
            return;
        }
        if (school.getEducationBoardCode() != null && school.getAffiliationNumber() != null) {
            schoolRepository.findByEducationBoardCodeAndAffiliationNumber(school.getEducationBoardCode(), school.getAffiliationNumber())
                    .filter(existing -> !existing.getId().equals(selfId))
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException(school.getEducationBoardCode() + " affiliation no. "
                                + school.getAffiliationNumber() + " already belongs to '" + existing.getName()
                                + "' (id " + existing.getId() + ")");
                    });
            return;
        }
        schoolRepository.findDuplicate(school.getName(), school.getPinCode(), school.getStateCode())
                .filter(existing -> !existing.getId().equals(selfId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("A school named '" + school.getName()
                            + "' already exists" + (school.getPinCode() == null ? "" : " at PIN " + school.getPinCode())
                            + " (id " + existing.getId() + ")");
                });
    }

    private Set<SchoolClass> resolveClasses(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<String> wanted = codes.stream().map(c -> c.trim().toUpperCase(Locale.ROOT)).collect(Collectors.toCollection(LinkedHashSet::new));
        List<SchoolClass> found = classRepository.findByCodeIn(wanted);
        Set<String> foundCodes = found.stream().map(SchoolClass::getCode).collect(Collectors.toSet());
        Set<String> missing = new HashSet<>(wanted);
        missing.removeAll(foundCodes);
        if (!missing.isEmpty()) {
            throw new BusinessValidationException("classCodes", "unknown class codes: " + String.join(", ", missing));
        }
        return new LinkedHashSet<>(found);
    }

    private String uniqueSlug(String name, String locality, String city) {
        String candidate = SlugUtil.toSlug(name);
        if (!schoolRepository.existsBySlug(candidate)) {
            return candidate;
        }
        String base = SlugUtil.toSlug(name, locality, city);
        candidate = base;
        int suffix = 2;
        while (schoolRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }
}
