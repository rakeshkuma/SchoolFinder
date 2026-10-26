package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.FactSourceDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolFactsRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolFactSource;
import com.indiaschoolfinder.enums.SchoolFact;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolClassRepository;
import com.indiaschoolfinder.repository.SchoolFactSourceRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Adds individual facts (classes, map location, city) to a profile, each with its own cited source, without touching
 * any other field. A change makes the profile unverified again; a re-run with the same facts and sources changes nothing.
 */
@Service
@Transactional(readOnly = true)
public class SchoolFactService {

    private final SchoolRepository schoolRepository;
    private final SchoolClassRepository classRepository;
    private final SchoolFactSourceRepository factSourceRepository;
    private final SchoolService schoolService;
    private final ProfileScoreService profileScoreService;
    private final AuditService auditService;

    public SchoolFactService(SchoolRepository schoolRepository, SchoolClassRepository classRepository,
                             SchoolFactSourceRepository factSourceRepository, SchoolService schoolService,
                             ProfileScoreService profileScoreService, AuditService auditService) {
        this.schoolRepository = schoolRepository;
        this.classRepository = classRepository;
        this.factSourceRepository = factSourceRepository;
        this.schoolService = schoolService;
        this.profileScoreService = profileScoreService;
        this.auditService = auditService;
    }

    /** Public: sources of facts that came from somewhere other than the profile's main source. */
    public List<FactSourceDto> sources(Long schoolId) {
        schoolService.requireActive(schoolId);
        return factSourceRepository.findBySchoolId(schoolId).stream()
                .sorted(java.util.Comparator.comparing(SchoolFactSource::getFact)) // enum order: classes, location, city
                .map(f -> new FactSourceDto(f.getFact(), f.getSourceUrl(), f.getSourceRetrievedDate(), f.getNote()))
                .toList();
    }

    @Transactional
    public SchoolDetailDto update(Long schoolId, SchoolFactsRequest r) {
        Set<SchoolFact> clear = r.clear() == null || r.clear().isEmpty() ? Set.of() : java.util.EnumSet.copyOf(r.clear());
        if (r.classes() == null && r.location() == null && r.city() == null && clear.isEmpty()) {
            throw new BusinessValidationException("request", "send at least one of classes, location, city or clear");
        }
        if ((r.classes() != null && clear.contains(SchoolFact.CLASSES)) || (r.location() != null && clear.contains(SchoolFact.LOCATION))
                || (r.city() != null && clear.contains(SchoolFact.CITY))) {
            throw new BusinessValidationException("clear", "a fact cannot be set and cleared in the same request");
        }
        School school = schoolRepository.findWithClassesById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        List<String> changed = new ArrayList<>();

        for (SchoolFact fact : clear) {
            boolean had = switch (fact) {
                case CLASSES -> {
                    boolean any = !school.getClassesOffered().isEmpty();
                    school.getClassesOffered().clear();
                    yield any;
                }
                case LOCATION -> {
                    boolean any = school.getLatitude() != null;
                    school.setLatitude(null);
                    school.setLongitude(null);
                    yield any;
                }
                case CITY -> {
                    boolean any = school.getCity() != null;
                    school.setCity(null);
                    yield any;
                }
            };
            var source = factSourceRepository.findBySchoolIdAndFact(schoolId, fact);
            source.ifPresent(factSourceRepository::delete);
            if (had || source.isPresent()) {
                changed.add(fact.name().toLowerCase(Locale.ROOT) + "=cleared");
            }
        }

        if (r.classes() != null) {
            Set<SchoolClass> classes = resolveClasses(r.classes().codes());
            if (!classes.equals(school.getClassesOffered())) {
                school.getClassesOffered().clear();
                school.getClassesOffered().addAll(classes);
                changed.add("classes=" + classes.stream().map(SchoolClass::getCode).collect(Collectors.joining("|")));
            }
            recordSource(schoolId, SchoolFact.CLASSES, r.classes().source(), changed);
        }
        if (r.location() != null) {
            if (!Objects.equals(school.getLatitude(), r.location().latitude())
                    || !Objects.equals(school.getLongitude(), r.location().longitude())) {
                school.setLatitude(r.location().latitude());
                school.setLongitude(r.location().longitude());
                changed.add("location=" + r.location().latitude() + "," + r.location().longitude());
            }
            recordSource(schoolId, SchoolFact.LOCATION, r.location().source(), changed);
        }
        if (r.city() != null) {
            String city = InputSanitizer.clean(r.city().name());
            if (!Objects.equals(school.getCity(), city)) {
                school.setCity(city);
                changed.add("city=" + city);
            }
            recordSource(schoolId, SchoolFact.CITY, r.city().source(), changed);
        }

        if (!changed.isEmpty()) {
            // New or changed claims must be checked again before the profile is shown as verified.
            school.setVerificationStatus(VerificationStatus.UNVERIFIED);
            school.setLastVerifiedDate(null);
            schoolRepository.saveAndFlush(school);
            auditService.record("SCHOOL_FACTS_UPDATED", "SCHOOL", schoolId, String.join(", ", changed));
            profileScoreService.recompute(schoolId); // classes and location count towards the recommended order
        }
        return schoolService.getById(schoolId);
    }

    private Set<SchoolClass> resolveClasses(List<String> codes) {
        Set<String> wanted = codes.stream().map(c -> c.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<SchoolClass> found = classRepository.findByCodeIn(wanted);
        if (found.size() != wanted.size()) {
            Set<String> known = found.stream().map(SchoolClass::getCode).collect(Collectors.toSet());
            wanted.removeAll(known);
            throw new BusinessValidationException("classes.codes", "unknown class code(s): " + String.join(", ", wanted));
        }
        return new LinkedHashSet<>(found);
    }

    private void recordSource(Long schoolId, SchoolFact fact, SchoolFactsRequest.Source source, List<String> changed) {
        SchoolFactSource row = factSourceRepository.findBySchoolIdAndFact(schoolId, fact).orElseGet(() -> {
            SchoolFactSource created = new SchoolFactSource();
            created.setSchoolId(schoolId);
            created.setFact(fact);
            return created;
        });
        String url = source.url().trim();
        String note = InputSanitizer.clean(source.note());
        if (url.equals(row.getSourceUrl()) && source.retrievedDate().equals(row.getSourceRetrievedDate())
                && Objects.equals(note, row.getNote())) {
            return;
        }
        row.setSourceUrl(url);
        row.setSourceRetrievedDate(source.retrievedDate());
        row.setNote(note);
        factSourceRepository.save(row);
        changed.add(fact.name().toLowerCase(Locale.ROOT) + "Source=" + url);
    }
}
