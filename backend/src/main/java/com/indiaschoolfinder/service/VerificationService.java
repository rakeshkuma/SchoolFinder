package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admin.VerificationHistoryDto;
import com.indiaschoolfinder.dto.admin.VerifyRequest;

import java.util.List;

public interface VerificationService {

    VerificationHistoryDto verify(Long schoolId, VerifyRequest request);

    List<VerificationHistoryDto> history(Long schoolId);

    /** Applies one decision to several records of the school; rankings are recalculated once at the end. */
    List<VerificationHistoryDto> verifyBatch(Long schoolId, com.indiaschoolfinder.dto.admin.BatchVerifyRequest request);

    /** Active schools with unverified facility records, by name; state is a code or name, blank for all. */
    com.indiaschoolfinder.dto.common.PageResponse<com.indiaschoolfinder.dto.admin.FacilityQueueItemDto> facilityQueue(
            String state, int page, int size);
}
