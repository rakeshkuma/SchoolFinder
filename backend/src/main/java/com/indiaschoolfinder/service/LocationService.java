package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.location.SuggestionDto;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.State;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface LocationService {

    /** All 36 states and union territories, alphabetically, with active school counts. */
    List<StateDto> states();

    /** By ISO code ("UP") or slug ("uttar-pradesh"); 404 otherwise. */
    StateDto state(String codeOrSlug);

    List<DistrictDto> districts(String stateCodeOrSlug);

    List<CityDto> cities(String stateCodeOrSlug);

    /** Every city in India with listed schools, largest first. */
    List<com.indiaschoolfinder.dto.location.IndiaCityDto> citiesAcrossIndia();

    List<String> localities(String stateCodeOrSlug);

    /** Accepts an ISO code, full state/UT name or slug; throws a validation error on anything else. */
    String resolveStateCode(String codeOrName, String field);

    /** Like {@link #resolveStateCode} but never throws (safe inside a caller's transaction). */
    Optional<String> findStateCode(String codeOrName);

    /** Finds the district by name within the state, creating (and auditing) it on first use. */
    District findOrCreateDistrict(String stateCode, String name);

    Map<String, State> statesByCode();

    Map<Long, District> districtsById(Collection<Long> ids);

    List<SuggestionDto.PlaceSuggestion> suggestPlaces(String q, int limit);
}
