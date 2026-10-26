package com.indiaschoolfinder.dto.location;

import java.util.List;

/** Autocomplete result: matching schools and places (states, districts, cities). */
public record SuggestionDto(List<SchoolSuggestion> schools, List<PlaceSuggestion> places) {

    public record SchoolSuggestion(Long id, String name, String slug, String locality, String city, String stateCode) {
    }

    /**
     * @param type     STATE, DISTRICT or CITY
     * @param district district slug (DISTRICT only)
     * @param city     city name (CITY only)
     */
    public record PlaceSuggestion(String type, String label, String stateCode, String stateName, String stateSlug,
                                  String district, String city) {
    }
}
