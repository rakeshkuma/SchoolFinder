package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.DuplicateResourceException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.EducationBoardRepository;
import com.indiaschoolfinder.repository.SchoolClassRepository;
import com.indiaschoolfinder.repository.SchoolFacilityRepository;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.LocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchoolServiceImplTest {

    @Mock SchoolRepository schoolRepository;
    @Mock SchoolClassRepository classRepository;
    @Mock EducationBoardRepository boardRepository;
    @Mock SchoolImageRepository imageRepository;
    @Mock SchoolFacilityRepository facilityRepository;
    @Mock AuditService auditService;
    @Mock com.indiaschoolfinder.repository.SchoolFeeRepository feeRepository;
    @Mock com.indiaschoolfinder.repository.AdmissionScheduleRepository admissionRepository;
    @Mock LocationService locationService;
    @Mock com.indiaschoolfinder.repository.SchoolBoardingRepository boardingRepository;

    private SchoolServiceImpl service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-23T06:00:00Z"), ZoneId.of("Asia/Kolkata"));
        service = new SchoolServiceImpl(schoolRepository, classRepository, boardRepository, imageRepository,
                facilityRepository, new SchoolMapper(), auditService, clock, feeRepository, admissionRepository,
                locationService, boardingRepository);
        lenient().when(locationService.resolveStateCode("DL", "stateCode")).thenReturn("DL");
    }

    private static SchoolRequest request(String name, String board, String udiseCode) {
        return new SchoolRequest(name, null, SchoolType.PRIVATE, null, null, board, null, udiseCode, null, null, null, null, null,
                null, null, null, null, null, null, null, null, "DL", "110001", null, null, null, null, null, null,
                null, null, null, "https://www.edudel.nic.in/", null);
    }

    private static SchoolRequest request(String name, String board) {
        return request(name, board, null);
    }

    /** Criteria with only a sort key and/or a partial location set. */
    private static SchoolSearchCriteria criteria(Double latitude, Double radiusKm, String sortBy) {
        return new SchoolSearchCriteria(null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                latitude, null, radiusKm, sortBy, null, 0, 20);
    }

    @Test
    void createRejectsDuplicateNameAtSamePinCodeInSameState() {
        School existing = new School();
        existing.setId(7L);
        when(schoolRepository.findDuplicate("Modern School", "110001", "DL")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(request("Modern School", null)))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("id 7");
        verify(schoolRepository, never()).save(any());
    }

    @Test
    void createWithUdiseCodeChecksTheCodeNotTheName() {
        School existing = new School();
        existing.setId(9L);
        existing.setName("Govt. Primary School");
        when(schoolRepository.findByUdiseCode("07050101234")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.create(request("Government Primary School", null, "07050101234")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("UDISE code 07050101234");
        verify(schoolRepository, never()).findDuplicate(any(), any(), any());
    }

    @Test
    void createRejectsUnknownBoard() {
        when(boardRepository.existsByCode("XYZ")).thenReturn(false);

        assertThatThrownBy(() -> service.create(request("Any School", "xyz")))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("unknown education board");
    }

    @Test
    void updateWithStaleVersionIsRejected() {
        School school = new School();
        school.setId(3L);
        when(schoolRepository.findWithClassesById(3L)).thenReturn(Optional.of(school)); // version 0

        assertThatThrownBy(() -> service.update(3L, request("Any School", null), 5L))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    void searchRejectsSortFieldsOutsideTheAllowList() {
        SchoolSearchCriteria criteria = criteria(null, null, "passwordHash");

        assertThatThrownBy(() -> service.search(criteria))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("must be one of");
    }

    @Test
    void searchRequiresBothCoordinates() {
        SchoolSearchCriteria criteria = criteria(28.6, 5.0, null);

        assertThatThrownBy(() -> service.search(criteria)).isInstanceOf(BusinessValidationException.class);
    }
}
