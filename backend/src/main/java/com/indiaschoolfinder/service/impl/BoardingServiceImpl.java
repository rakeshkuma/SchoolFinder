package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.school.BoardingProfileDto;
import com.indiaschoolfinder.dto.school.BoardingProfileRequest;
import com.indiaschoolfinder.dto.school.BoardingStatsDto;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.SchoolBoardingRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.BoardingService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class BoardingServiceImpl implements BoardingService {

    private final SchoolBoardingRepository boardingRepository;
    private final SchoolRepository schoolRepository;
    private final SchoolMapper mapper;
    private final AuditService auditService;

    public BoardingServiceImpl(SchoolBoardingRepository boardingRepository, SchoolRepository schoolRepository,
                               SchoolMapper mapper, AuditService auditService) {
        this.boardingRepository = boardingRepository;
        this.schoolRepository = schoolRepository;
        this.mapper = mapper;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public BoardingProfileDto upsert(Long schoolId, BoardingProfileRequest r) {
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        SchoolBoarding b = boardingRepository.findById(schoolId).orElseGet(() -> {
            SchoolBoarding created = new SchoolBoarding();
            created.setSchoolId(schoolId);
            return created;
        });
        String before = b.getResidentialSystem() == null ? null : fingerprint(b);
        b.setBoardingType(r.boardingType());
        b.setResidentialSystem(r.residentialSystem());
        b.setEntranceExam(r.entranceExam());
        b.setEntryClasses(InputSanitizer.clean(r.entryClasses()));
        b.setSummary(InputSanitizer.clean(r.summary()));
        b.setAccommodation(InputSanitizer.clean(r.accommodation()));
        b.setPastoralCare(InputSanitizer.clean(r.pastoralCare()));
        b.setDining(InputSanitizer.clean(r.dining()));
        b.setMedicalCare(InputSanitizer.clean(r.medicalCare()));
        b.setNearestTransport(InputSanitizer.clean(r.nearestTransport()));
        b.setAcademicSession(InputSanitizer.clean(r.academicSession()));
        b.setSourceUrl(r.sourceUrl().trim());
        // The cited source states the school is residential, so the hostel flag follows it.
        school.setHasHostel(Boolean.TRUE);
        if (fingerprint(b).equals(before)) {
            // Re-imports of unchanged data keep an editor's verification.
            return mapper.toBoardingDto(b);
        }
        // New or changed claims must be checked again before they are shown as verified.
        b.setVerificationStatus(VerificationStatus.UNVERIFIED);
        b.setLastVerifiedDate(null);
        SchoolBoarding saved = boardingRepository.saveAndFlush(b);
        auditService.record("BOARDING_PROFILE_SAVED", "BOARDING", schoolId,
                "type=" + r.boardingType() + ", system=" + r.residentialSystem() + ", source=" + r.sourceUrl());
        return mapper.toBoardingDto(saved);
    }

    /** Every stated claim of the profile, to tell a real change from a re-import of the same data. */
    private static String fingerprint(SchoolBoarding b) {
        return java.util.Arrays.asList(b.getBoardingType(), b.getResidentialSystem(), b.getEntranceExam(), b.getEntryClasses(),
                b.getSummary(), b.getAccommodation(), b.getPastoralCare(), b.getDining(), b.getMedicalCare(),
                b.getNearestTransport(), b.getAcademicSession(), b.getSourceUrl()).toString();
    }

    @Override
    public Map<ResidentialSystem, Long> countsBySystem() {
        Map<ResidentialSystem, Long> counts = new EnumMap<>(ResidentialSystem.class);
        for (Object[] row : boardingRepository.countActiveBySystem()) {
            counts.put((ResidentialSystem) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Override
    @Transactional(readOnly = true)
    public BoardingStatsDto stats() {
        Map<String, Long> byState = new java.util.TreeMap<>();
        long total = 0;
        for (Object[] row : boardingRepository.countActiveByState()) {
            byState.put((String) row[0], (Long) row[1]);
            total += (Long) row[1];
        }
        Map<GenderType, Long> byGender = new EnumMap<>(GenderType.class);
        long notStated = 0;
        for (Object[] row : boardingRepository.countActiveByGender()) {
            if (row[0] == null) notStated += (Long) row[1];
            else byGender.put((GenderType) row[0], (Long) row[1]);
        }
        return new BoardingStatsDto(total, byState, byGender, notStated, countsBySystem());
    }
}
