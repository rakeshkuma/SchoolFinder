package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.BoardingProfileDto;
import com.indiaschoolfinder.dto.school.BoardingProfileRequest;
import com.indiaschoolfinder.dto.school.BoardingStatsDto;
import com.indiaschoolfinder.enums.ResidentialSystem;

import java.util.Map;

public interface BoardingService {

    /** Creates or replaces the profile; it becomes unverified until checked against the cited source. */
    BoardingProfileDto upsert(Long schoolId, BoardingProfileRequest request);

    /** Active boarding schools per residential system (systems without schools are omitted). */
    Map<ResidentialSystem, Long> countsBySystem();

    /** Counts by state, gender and system for the boarding landing pages. */
    BoardingStatsDto stats();
}
