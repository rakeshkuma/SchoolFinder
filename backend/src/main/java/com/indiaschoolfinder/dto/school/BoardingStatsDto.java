package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.ResidentialSystem;

import java.util.Map;

/**
 * Counts of active boarding schools for the boarding landing pages. {@code genderNotStated} counts schools whose
 * sources do not say whether they admit boys, girls or both.
 */
public record BoardingStatsDto(
        long total,
        Map<String, Long> byState,
        Map<GenderType, Long> byGender,
        long genderNotStated,
        Map<ResidentialSystem, Long> bySystem) {
}
