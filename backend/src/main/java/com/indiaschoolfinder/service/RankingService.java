package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.CriterionScoreDto;
import com.indiaschoolfinder.dto.ranking.CriterionScoreRequest;
import com.indiaschoolfinder.dto.ranking.CriterionWeightsRequest;
import com.indiaschoolfinder.dto.ranking.RankingMethodologyDto;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDetailDto;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDto;
import com.indiaschoolfinder.enums.SchoolType;

import java.util.List;

public interface RankingService {

    String DISCLAIMER = "India School Finder rankings are independent assessments calculated by this website from "
            + "verified, source-linked evidence using the published methodology. They are not an official ranking by the "
            + "Government of India, any state or union territory government, CBSE, CISCE, a state board or any other "
            + "authority, and do not imply endorsement by them. Results marked provisional are based on incomplete "
            + "evidence and are not given a rank position.";

    /**
     * Ranked list within a scope. state accepts an ISO code, name or slug; district is a district slug and needs a
     * state; city and locality match exactly (case-insensitive). Positions in the result are relative to the scope.
     */
    PageResponse<SchoolRankingDto> rankings(String academicYear, String state, String district, String city,
                                            String locality, String board, SchoolType schoolType,
                                            boolean includeProvisional, int page, int size);

    /** As above, optionally limited to boarding schools and to residential systems (any of). */
    PageResponse<SchoolRankingDto> rankings(String academicYear, String state, String district, String city, String locality,
                                            String board, SchoolType schoolType, boolean includeProvisional,
                                            boolean boardingOnly,
                                            java.util.List<com.indiaschoolfinder.enums.ResidentialSystem> residentialSystems,
                                            int page, int size);

    List<SchoolRankingDto> topSchools(int limit);

    SchoolRankingDetailDto forSchool(Long schoolId);

    RankingMethodologyDto methodology();

    /** Rebuilds rankings for the academic year from verified evidence. Returns the number of ranked rows. */
    int recalculate(String academicYear);

    RankingMethodologyDto updateWeights(CriterionWeightsRequest request);

    CriterionScoreDto upsertCriterionScore(Long schoolId, CriterionScoreRequest request);

    List<CriterionScoreDto> criterionScores(Long schoolId, String academicYear);
}
