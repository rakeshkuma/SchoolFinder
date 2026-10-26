package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.BoardingProfileDto;
import com.indiaschoolfinder.dto.school.BoardingProfileRequest;
import com.indiaschoolfinder.enums.ResidentialSystem;

import java.util.Map;
import java.util.Optional;

public interface BoardingService {

    /** The boarding profile of an active school, if it has one. */
    Optional<BoardingProfileDto> profile(Long schoolId);

    /** Creates or replaces the profile; it becomes unverified until checked against the cited source. */
    BoardingProfileDto upsert(Long schoolId, BoardingProfileRequest request);

    /** Active boarding schools per residential system (systems without schools are omitted). */
    Map<ResidentialSystem, Long> countsBySystem();
}
