package com.indiaschoolfinder.dto.admin;

import com.indiaschoolfinder.dto.school.FacilityDto;

import java.util.List;

/**
 * A school with facility records still awaiting verification, plus the links an editor needs to check them.
 * facilities lists all of the school's facility records (any status) so the editor sees the full picture.
 */
public record FacilityQueueItemDto(
        Long schoolId,
        String schoolName,
        String slug,
        String stateCode,
        String stateName,
        String websiteUrl,
        String sourceUrl,
        long unverifiedCount,
        List<FacilityDto> facilities) {
}
