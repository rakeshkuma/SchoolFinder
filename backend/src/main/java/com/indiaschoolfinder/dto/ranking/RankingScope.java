package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.SchoolType;

import java.util.List;

/**
 * The geographical and categorical scope of a ranking list. Every field except academicYear is optional; null means
 * "all". stateCode is an ISO 3166-2:IN code already resolved; districtSlug is only meaningful with a state.
 * boardingOnly limits the list to schools with a boarding profile; residentialSystems (any of) implies it, so that
 * residential schools can be compared within their own system.
 */
public record RankingScope(
        String academicYear,
        String stateCode,
        String districtSlug,
        String city,
        String locality,
        String board,
        SchoolType schoolType,
        boolean includeProvisional,
        boolean boardingOnly,
        List<ResidentialSystem> residentialSystems) {

    public RankingScope(String academicYear, String stateCode, String districtSlug, String city, String locality,
                        String board, SchoolType schoolType, boolean includeProvisional) {
        this(academicYear, stateCode, districtSlug, city, locality, board, schoolType, includeProvisional, false, List.of());
    }
}
