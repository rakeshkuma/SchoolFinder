package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.fee.FeeCalculationRequest;
import com.indiaschoolfinder.dto.fee.FeeComparisonDto;
import com.indiaschoolfinder.dto.fee.FeeDto;
import com.indiaschoolfinder.dto.fee.FeeEstimate;
import com.indiaschoolfinder.dto.fee.FeeRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolFee;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolFeeRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.FeeCalculator;
import com.indiaschoolfinder.service.FeeService;
import com.indiaschoolfinder.service.ReferenceDataService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class FeeServiceImpl implements FeeService {

    static final int MAX_COMPARE = 4;

    private final SchoolFeeRepository feeRepository;
    private final SchoolRepository schoolRepository;
    private final ReferenceDataService referenceData;
    private final FeeCalculator calculator;
    private final AuditService auditService;
    private final com.indiaschoolfinder.service.ProfileScoreService profileScoreService;

    public FeeServiceImpl(SchoolFeeRepository feeRepository, SchoolRepository schoolRepository,
                          ReferenceDataService referenceData, FeeCalculator calculator, AuditService auditService,
                          com.indiaschoolfinder.service.ProfileScoreService profileScoreService) {
        this.profileScoreService = profileScoreService;
        this.feeRepository = feeRepository;
        this.schoolRepository = schoolRepository;
        this.referenceData = referenceData;
        this.calculator = calculator;
        this.auditService = auditService;
    }

    @Override
    public List<FeeDto> feeHistory(Long schoolId) {
        schoolRepository.findByIdAndActiveTrue(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        Map<Long, SchoolClass> classes = referenceData.classesById();
        return feeRepository.findBySchoolIdOrderByAcademicYearDescClassIdAsc(schoolId).stream()
                .sorted((a, b) -> {
                    int byYear = b.getAcademicYear().compareTo(a.getAcademicYear());
                    return byYear != 0 ? byYear : Integer.compare(classes.get(a.getClassId()).getSortOrder(),
                            classes.get(b.getClassId()).getSortOrder());
                })
                .map(f -> toDto(f, classes.get(f.getClassId())))
                .toList();
    }

    @Override
    @Transactional
    public FeeDto upsert(Long schoolId, FeeRequest r) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        SchoolClass schoolClass = referenceData.requireClass(r.classCode(), "classCode");
        if (r.transportMonthly() == null && r.transportMonths() != null) {
            throw new BusinessValidationException("transportMonths", "transportMonths requires transportMonthly");
        }
        SchoolFee fee = feeRepository.findBySchoolIdAndClassIdAndAcademicYear(schoolId, schoolClass.getId(), r.academicYear())
                .orElseGet(SchoolFee::new);
        boolean created = fee.getId() == null;
        fee.setSchoolId(schoolId);
        fee.setClassId(schoolClass.getId());
        fee.setAcademicYear(r.academicYear());
        fee.setRegistrationFee(r.registrationFee());
        fee.setAdmissionFee(r.admissionFee());
        fee.setMonthlyTuition(r.monthlyTuition());
        fee.setTuitionMonths(r.tuitionMonths() == null ? 12 : r.tuitionMonths());
        fee.setMonthlyCharges(r.monthlyCharges());
        fee.setMonthlyChargesDescription(InputSanitizer.clean(r.monthlyChargesDescription()));
        fee.setAnnualCharges(r.annualCharges());
        fee.setDevelopmentCharges(r.developmentCharges());
        fee.setSecurityDeposit(r.securityDeposit());
        fee.setSecurityDepositRefundable(r.securityDepositRefundable() == null || r.securityDepositRefundable());
        fee.setTransportMonthly(r.transportMonthly());
        fee.setTransportMonths(r.transportMonths());
        fee.setBooksUniformEstimate(r.booksUniformEstimate());
        fee.setOtherCharges(r.otherCharges());
        fee.setOtherChargesDescription(InputSanitizer.clean(r.otherChargesDescription()));
        fee.setSourceUrl(r.sourceUrl().trim());
        fee.setNotes(InputSanitizer.clean(r.notes()));
        fee.setVerificationStatus(VerificationStatus.UNVERIFIED);
        fee.setLastVerifiedDate(null);

        FeeCalculator.OfficialTotals totals = calculator.officialTotals(fee);
        fee.setRecurringAnnualOfficial(totals.recurringAnnual());
        fee.setFirstYearOfficial(totals.firstYear());

        SchoolFee saved = feeRepository.saveAndFlush(fee);
        auditService.record(created ? "FEE_CREATED" : "FEE_UPDATED", "FEE", saved.getId(),
                "school=" + schoolId + ", class=" + schoolClass.getCode() + ", year=" + r.academicYear() + ", source=" + r.sourceUrl());
        profileScoreService.recompute(schoolId); // an official fee schedule counts towards the recommended order
        return toDto(saved, schoolClass);
    }

    @Override
    public FeeComparisonDto compare(List<Long> schoolIds, String classCode, String academicYear) {
        List<Long> ids = validateIds(schoolIds);
        SchoolClass schoolClass = referenceData.requireClass(classCode, "classCode");
        Map<Long, School> schools = activeSchools(ids);
        // Default to the latest year any selected school has published, so all rows refer to the same year.
        String year = academicYear != null ? academicYear
                : feeRepository.findLatestAcademicYear(ids, schoolClass.getId()).orElse(referenceData.currentAcademicYear());
        Map<Long, SchoolFee> fees = feeRepository.findBySchoolIdInAndClassIdAndAcademicYear(ids, schoolClass.getId(), year)
                .stream().collect(Collectors.toMap(SchoolFee::getSchoolId, Function.identity()));
        List<FeeComparisonDto.Entry> entries = ids.stream()
                .map(id -> {
                    School s = schools.get(id);
                    SchoolFee f = fees.get(id);
                    return new FeeComparisonDto.Entry(id, s.getName(), s.getSlug(), f != null,
                            f == null ? null : toDto(f, schoolClass));
                })
                .toList();
        return new FeeComparisonDto(year, schoolClass.getCode(), entries);
    }

    @Override
    public List<FeeEstimate> calculate(FeeCalculationRequest request) {
        List<Long> ids = validateIds(request.selections().stream().map(FeeCalculationRequest.Selection::schoolId).toList());
        Map<Long, School> schools = activeSchools(ids);
        return request.selections().stream().map(sel -> {
            School school = schools.get(sel.schoolId());
            SchoolClass schoolClass = referenceData.requireClass(sel.classCode(), "classCode");
            Optional<SchoolFee> fee = resolveFee(sel.schoolId(), schoolClass.getId(), request.academicYear());
            if (fee.isEmpty()) {
                return unavailable(school, schoolClass.getCode(), request.academicYear());
            }
            return calculator.estimate(fee.get(), school.getId(), school.getName(), schoolClass.getCode(),
                    new FeeCalculator.Options(sel.includeTransport(), sel.transportMonths(), sel.includeBooksAndUniform()));
        }).toList();
    }

    // ---------------------------------------------------------------------------------------------

    private Optional<SchoolFee> resolveFee(Long schoolId, Long classId, String academicYear) {
        String year = academicYear != null ? academicYear
                : feeRepository.findLatestAcademicYear(List.of(schoolId), classId).orElse(null);
        return year == null ? Optional.empty() : feeRepository.findBySchoolIdAndClassIdAndAcademicYear(schoolId, classId, year);
    }

    private static FeeEstimate unavailable(School school, String classCode, String academicYear) {
        return new FeeEstimate(school.getId(), school.getName(), classCode, academicYear, false, List.of(),
                null, null, null, null, List.of("feeSchedule"),
                List.of("No published fee schedule is recorded for this class" + (academicYear == null ? "" : " in " + academicYear) + "."),
                null, null, null);
    }

    private List<Long> validateIds(List<Long> schoolIds) {
        if (schoolIds == null || schoolIds.isEmpty()) {
            throw new BusinessValidationException("schoolIds", "select at least one school");
        }
        List<Long> distinct = List.copyOf(new LinkedHashSet<>(schoolIds));
        if (distinct.size() > MAX_COMPARE) {
            throw new BusinessValidationException("schoolIds", "compare at most " + MAX_COMPARE + " schools");
        }
        return distinct;
    }

    private Map<Long, School> activeSchools(List<Long> ids) {
        Map<Long, School> schools = schoolRepository.findAllById(ids).stream()
                .filter(School::isActive)
                .collect(Collectors.toMap(School::getId, Function.identity()));
        ids.stream().filter(id -> !schools.containsKey(id)).findFirst()
                .ifPresent(id -> {
                    throw new ResourceNotFoundException("School", id);
                });
        return schools;
    }

    private FeeDto toDto(SchoolFee f, SchoolClass c) {
        return new FeeDto(f.getId(), f.getSchoolId(), c.getCode(), c.getName(), f.getAcademicYear(),
                f.getRegistrationFee(), f.getAdmissionFee(), f.getMonthlyTuition(), f.getTuitionMonths(),
                f.getMonthlyCharges(), f.getMonthlyChargesDescription(),
                f.getAnnualCharges(), f.getDevelopmentCharges(), f.getSecurityDeposit(), f.isSecurityDepositRefundable(),
                f.getTransportMonthly(), f.getTransportMonths(), f.getBooksUniformEstimate(), f.getOtherCharges(),
                f.getOtherChargesDescription(), f.getRecurringAnnualOfficial(), f.getFirstYearOfficial(),
                calculator.officialTotals(f).missingComponents(), f.getCurrency(), f.getSourceUrl(),
                f.getVerificationStatus(), f.getLastVerifiedDate(), f.getNotes());
    }
}
