package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.admission.AdmissionRequest;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;

import java.util.List;

public interface AdmissionService {

    /** @param excludeNetwork optional: leave out schools of this network (e.g. the identical national JNV cycles) */
    PageResponse<AdmissionDto> list(String academicYear, AdmissionStatus status, AdmissionCategory category,
                                    String classCode, com.indiaschoolfinder.enums.SchoolNetwork excludeNetwork,
                                    String sortBy, int page, int size);

    PageResponse<AdmissionDto> upcoming(int page, int size);

    AdmissionDto get(Long id);

    List<AdmissionDto> bySchool(Long schoolId);

    /** Creates or replaces the cycle for (school, class, academic year, category). */
    AdmissionDto upsert(Long schoolId, AdmissionRequest request);

    /** Re-derives status from dates for all non-overridden cycles. Returns the number changed. */
    int refreshStatuses();
}
