package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.indiaschoolfinder.util.AcademicYears;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RankingApiIT extends AbstractIntegrationTest {

    private static final String YEAR = AcademicYears.of(LocalDate.now(ZoneId.of("Asia/Kolkata")));

    private long addScore(long schoolId, String criterion, int raw) throws Exception {
        String response = mockMvc.perform(post("/api/v1/admin/schools/{id}/criterion-scores", schoolId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("criterionCode", criterion, "academicYear", YEAR, "rawScore", raw,
                                "maxScore", 100, "sourceUrl", "https://example.org/evidence/" + criterion))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private void verify(long schoolId, long scoreId) throws Exception {
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "CRITERION_SCORE", "entityId", scoreId, "status", "VERIFIED",
                                "sourceUrl", "https://example.org/evidence"))))
                .andExpect(status().isOk());
    }

    @Test
    void unverifiedEvidenceDoesNotRankAndVerifiedEvidenceDoes() throws Exception {
        long a = createSchool(school("Ranked School A", Map.of("boardCode", "CBSE", "locality", "Dwarka")));
        long b = createSchool(school("Ranked School B", Map.of("boardCode", "CBSE", "locality", "Rohini")));
        long thin = createSchool(school("Thin Evidence School", Map.of("boardCode", "CISCE", "locality", "Dwarka")));

        long a1 = addScore(a, "ACADEMIC_PERFORMANCE", 90);
        mockMvc.perform(get("/api/v1/rankings")).andExpect(jsonPath("$.totalElements").value(0));

        long a2 = addScore(a, "TEACHING_QUALITY", 80);
        long a3 = addScore(a, "INFRASTRUCTURE", 70);
        long a4 = addScore(a, "SAFETY_WELLBEING", 60);
        for (long id : List.of(a1, a2, a3, a4)) {
            verify(a, id);
        }
        for (String c : List.of("ACADEMIC_PERFORMANCE", "TEACHING_QUALITY", "INFRASTRUCTURE", "SAFETY_WELLBEING")) {
            verify(b, addScore(b, c, 50));
        }
        verify(thin, addScore(thin, "ACADEMIC_PERFORMANCE", 100));

        mockMvc.perform(get("/api/v1/rankings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].schoolName").value("Ranked School A"))
                .andExpect(jsonPath("$.content[0].rankPosition").value(1))
                .andExpect(jsonPath("$.content[0].coveragePercent").value(75.00))
                .andExpect(jsonPath("$.content[1].rankPosition").value(2))
                // Thin evidence: listed last, provisional, no rank position despite a 100 score.
                .andExpect(jsonPath("$.content[2].schoolName").value("Thin Evidence School"))
                .andExpect(jsonPath("$.content[2].provisional").value(true))
                .andExpect(jsonPath("$.content[2].rankPosition").value(nullValue()));

        mockMvc.perform(get("/api/v1/rankings/top-schools")).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/v1/rankings/locality/Dwarka")).andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/rankings/board/cisce")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", a))
                // (25×90 + 20×80 + 15×70 + 15×60) / 75 = 77.33 — re-weighted over the 75% of criteria with evidence
                .andExpect(jsonPath("$.siteRanking.totalScore").value(77.33))
                .andExpect(jsonPath("$.disclaimer", containsString("not an official ranking")));
    }

    /** Verified evidence for four criteria (75% coverage, enough for a definitive result) at the given score. */
    private void fullyEvidenced(long schoolId, int raw) throws Exception {
        for (String c : List.of("ACADEMIC_PERFORMANCE", "TEACHING_QUALITY", "INFRASTRUCTURE", "SAFETY_WELLBEING")) {
            verify(schoolId, addScore(schoolId, c, raw));
        }
    }

    @Test
    void withoutAnyEvidenceNothingIsListedNotEvenAsProvisional() throws Exception {
        createSchool(school("Unscored School", Map.of("stateCode", "UP")));
        mockMvc.perform(get("/api/v1/rankings").param("includeProvisional", "true"))
                .andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/rankings/methodology"))
                .andExpect(jsonPath("$.rankedSchools").value(0))
                .andExpect(jsonPath("$.provisionalSchools").value(0))
                .andExpect(jsonPath("$.disclaimer", containsString("India School Finder")));
    }

    @Test
    void stateScopeFiltersSchoolsAndPositionsRestartWithinTheScope() throws Exception {
        long delhiTop = createSchool(school("Delhi Top School", Map.of("stateCode", "DL")));
        long patnaA = createSchool(school("Patna School A", Map.of("stateCode", "BR", "district", "Patna", "city", "Patna")));
        long patnaB = createSchool(school("Patna School B", Map.of("stateCode", "BR", "district", "Patna", "city", "Patna")));
        long gaya = createSchool(school("Gaya School", Map.of("stateCode", "BR", "district", "Gaya", "city", "Gaya")));
        fullyEvidenced(delhiTop, 95);
        fullyEvidenced(patnaA, 80);
        fullyEvidenced(patnaB, 80); // tie with Patna School A
        fullyEvidenced(gaya, 60);

        // All of India: Delhi first; the Patna tie shares position 2; Gaya is 4th (competition ranking).
        mockMvc.perform(get("/api/v1/rankings"))
                .andExpect(jsonPath("$.content[0].schoolName").value("Delhi Top School"))
                .andExpect(jsonPath("$.content[0].scopePosition").value(1))
                .andExpect(jsonPath("$.content[1].scopePosition").value(2))
                .andExpect(jsonPath("$.content[2].scopePosition").value(2))
                .andExpect(jsonPath("$.content[3].scopePosition").value(4));

        // Bihar only: positions restart at 1, all-India positions are kept alongside; state accepts code or name.
        mockMvc.perform(get("/api/v1/rankings").param("state", "Bihar"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].schoolName").value("Patna School A")) // tie broken by name, then id
                .andExpect(jsonPath("$.content[0].scopePosition").value(1))
                .andExpect(jsonPath("$.content[0].rankPosition").value(2))
                .andExpect(jsonPath("$.content[0].stateName").value("Bihar"))
                .andExpect(jsonPath("$.content[0].districtName").value("Patna"))
                .andExpect(jsonPath("$.content[1].schoolName").value("Patna School B"))
                .andExpect(jsonPath("$.content[1].scopePosition").value(1))
                .andExpect(jsonPath("$.content[2].schoolName").value("Gaya School"))
                .andExpect(jsonPath("$.content[2].scopePosition").value(3));

        // District and city scopes.
        mockMvc.perform(get("/api/v1/rankings").param("state", "BR").param("district", "gaya"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].scopePosition").value(1));
        mockMvc.perform(get("/api/v1/rankings").param("state", "BR").param("city", "patna"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/rankings").param("district", "patna"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/rankings").param("state", "Atlantis"))
                .andExpect(status().isBadRequest());

        // Pages are stable and positions do not depend on the page: page 2 of size 1 in Bihar is the tied school.
        mockMvc.perform(get("/api/v1/rankings").param("state", "BR").param("size", "1").param("page", "1"))
                .andExpect(jsonPath("$.content[0].schoolName").value("Patna School B"))
                .andExpect(jsonPath("$.content[0].scopePosition").value(1));
    }

    private long addFacility(long schoolId, String category, String name) throws Exception {
        String response = mockMvc.perform(post("/api/v1/admin/schools/{id}/facilities", schoolId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("category", category, "name", name, "available", true,
                                "sourceUrl", "https://example.org/school/facilities"))))
                .andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private void verifyFacility(long schoolId, long facilityId) throws Exception {
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", schoolId).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("entityType", "FACILITY", "entityId", facilityId, "status", "VERIFIED",
                                "sourceUrl", "https://example.org/school/facilities"))))
                .andExpect(status().isOk());
    }

    private void recalculate() throws Exception {
        mockMvc.perform(post("/api/v1/admin/rankings/recalculate").header("Authorization", adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void documentedFacilitiesGiveProvisionalResultsOrderedByEvidenceShare() throws Exception {
        long verifiedOnly = createSchool(school("Verified Academic School", Map.of()));
        long twoCriteria = createSchool(school("Two Criteria School", Map.of()));
        long fullChecklist = createSchool(school("Full Checklist School", Map.of()));
        verify(verifiedOnly, addScore(verifiedOnly, "ACADEMIC_PERFORMANCE", 90));
        addFacility(twoCriteria, "LIBRARY", "Library");
        addFacility(twoCriteria, "SPORTS", "Playground");
        addFacility(fullChecklist, "LIBRARY", "Library");
        addFacility(fullChecklist, "LABORATORY", "Physics lab");
        addFacility(fullChecklist, "LABORATORY", "Chemistry lab"); // a category counts once
        addFacility(fullChecklist, "COMPUTER", "Computer lab");
        recalculate();

        // Documented facts alone never produce a definitive rank.
        mockMvc.perform(get("/api/v1/rankings").param("includeProvisional", "false"))
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(get("/api/v1/rankings"))
                .andExpect(jsonPath("$.totalElements").value(3))
                // 25% evidence share each: higher score first
                .andExpect(jsonPath("$.content[0].schoolName").value("Verified Academic School"))
                .andExpect(jsonPath("$.content[0].verifiedCoveragePercent").value(25.00))
                .andExpect(jsonPath("$.content[1].schoolName").value("Two Criteria School"))
                .andExpect(jsonPath("$.content[1].status").value("PROVISIONAL"))
                .andExpect(jsonPath("$.content[1].rankPosition").value(nullValue()))
                .andExpect(jsonPath("$.content[1].coveragePercent").value(25.00))
                .andExpect(jsonPath("$.content[1].verifiedCoveragePercent").value(0))
                .andExpect(jsonPath("$.content[1].totalScore").value(33.33))
                .andExpect(jsonPath("$.content[1].breakdown[2].evidenceType").value("DOCUMENTED_FACILITIES"))
                .andExpect(jsonPath("$.content[1].breakdown[2].verified").value(false))
                .andExpect(jsonPath("$.content[1].breakdown[2].evidenceNote", containsString("1 of 3 checklist items")))
                // Full infrastructure checklist scores 100 but covers only 15% of the weight, so it is listed last.
                .andExpect(jsonPath("$.content[2].schoolName").value("Full Checklist School"))
                .andExpect(jsonPath("$.content[2].totalScore").value(100.00))
                .andExpect(jsonPath("$.content[2].coveragePercent").value(15.00));
    }

    @Test
    void verifyingDocumentedFactsCanEarnADefinitiveRank() throws Exception {
        long s = createSchool(school("Documented School", Map.of("studentTeacherRatio", 25,
                "sourceRetrievedDate", LocalDate.now(ZoneId.of("Asia/Kolkata")).toString())));
        verify(s, addScore(s, "ACADEMIC_PERFORMANCE", 80));
        verify(s, addScore(s, "SAFETY_WELLBEING", 60));
        List<Long> facilities = List.of(addFacility(s, "LIBRARY", "Library"), addFacility(s, "LABORATORY", "Lab"),
                addFacility(s, "COMPUTER", "Computer lab"), addFacility(s, "SPORTS", "Playground"),
                addFacility(s, "TRANSPORT", "School buses"));
        recalculate();

        // 90% evidence share but only 40% verified: provisional.
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", s))
                .andExpect(jsonPath("$.status").value("PROVISIONAL"))
                .andExpect(jsonPath("$.siteRanking.coveragePercent").value(90.00))
                .andExpect(jsonPath("$.siteRanking.verifiedCoveragePercent").value(40.00))
                // (40 − 25) ÷ (40 − 20) × 100 = 75 on the published ratio scale
                .andExpect(jsonPath("$.siteRanking.breakdown[1].evidenceType").value("PUBLISHED_RATIO"))
                .andExpect(jsonPath("$.siteRanking.breakdown[1].normalizedScore").value(75.00))
                .andExpect(jsonPath("$.siteRanking.breakdown[6].normalizedScore").value(50.00)); // transport, 1 of 2

        for (long f : facilities) {
            verifyFacility(s, f);
        }
        // 25 + 15 + 15 + 10 + 5 = 70% verified: definitive. The ratio is still unverified.
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", s))
                .andExpect(jsonPath("$.status").value("RANKED"))
                .andExpect(jsonPath("$.siteRanking.rankPosition").value(1))
                .andExpect(jsonPath("$.siteRanking.verifiedCoveragePercent").value(70.00))
                .andExpect(jsonPath("$.siteRanking.breakdown[1].verified").value(false))
                .andExpect(jsonPath("$.siteRanking.breakdown[2].verified").value(true));
    }

    @Test
    void verifiedScoreTakesPrecedenceOverDocumentedChecklist() throws Exception {
        long s = createSchool(school("Inspected School", Map.of()));
        addFacility(s, "LIBRARY", "Library");
        verify(s, addScore(s, "INFRASTRUCTURE", 80));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", s))
                .andExpect(jsonPath("$.siteRanking.breakdown[2].normalizedScore").value(80.00))
                .andExpect(jsonPath("$.siteRanking.breakdown[2].evidenceType").value("VERIFIED_SCORE"));
    }

    @Test
    void outdatedDocumentedFactsAreNotScoredAndSchoolIsNotYetRanked() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        long old = createSchool(school("Old Profile School", Map.of("hasTransport", true, "studentTeacherRatio", 18,
                "sourceRetrievedDate", today.minusYears(5).toString())));
        long fresh = createSchool(school("Fresh Profile School", Map.of("hasTransport", true, "studentTeacherRatio", 18,
                "sourceRetrievedDate", today.toString())));
        recalculate();

        mockMvc.perform(get("/api/v1/schools/{id}/ranking", old))
                .andExpect(jsonPath("$.status").value("NOT_YET_RANKED"))
                .andExpect(jsonPath("$.siteRanking").value(nullValue()));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", fresh))
                .andExpect(jsonPath("$.status").value("PROVISIONAL"))
                .andExpect(jsonPath("$.siteRanking.breakdown[1].normalizedScore").value(100.00))
                .andExpect(jsonPath("$.siteRanking.breakdown[6].normalizedScore").value(50.00));
    }

    @Test
    void rankingRowsCarryCardFactsWithoutInventingMissingOnes() throws Exception {
        long withClasses = createSchool(school("Card School", Map.of("classCodes", List.of("XII", "I", "NURSERY"))));
        long bare = createSchool(school("Bare School", Map.of()));
        fullyEvidenced(withClasses, 70);
        fullyEvidenced(bare, 60);

        mockMvc.perform(get("/api/v1/rankings"))
                .andExpect(jsonPath("$.content[0].schoolName").value("Card School"))
                .andExpect(jsonPath("$.content[0].lowestClass").value("Nursery"))
                .andExpect(jsonPath("$.content[0].highestClass").value("Class XII"))
                .andExpect(jsonPath("$.content[0].card.id").value((int) withClasses))
                // No photo or official fee was added: they stay null rather than being filled in.
                .andExpect(jsonPath("$.content[1].card.coverImageUrl").value(nullValue()))
                .andExpect(jsonPath("$.content[1].card.annualFeeFrom").value(nullValue()))
                .andExpect(jsonPath("$.content[1].lowestClass").value(nullValue()));
    }

    @Test
    void methodologyIsPublishedWithDisclaimer() throws Exception {
        mockMvc.perform(get("/api/v1/rankings/methodology"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criteria.length()").value(7))
                .andExpect(jsonPath("$.criteria[0].weight").value(25.00))
                .andExpect(jsonPath("$.minimumCoveragePercent").value(70))
                .andExpect(jsonPath("$.methodologyVersion").value("2.0"))
                .andExpect(jsonPath("$.checklists[0].criterionCode").value("INFRASTRUCTURE"))
                .andExpect(jsonPath("$.checklists[0].items.length()").value(3))
                .andExpect(jsonPath("$.studentTeacherRatioBest").value(20))
                .andExpect(jsonPath("$.disclaimer", containsString("not an official ranking")));
    }

    @Test
    void weightsMustSumToHundredAndRequireAdmin() throws Exception {
        Map<String, Object> bad = Map.of("weights", List.of(Map.of("code", "ACADEMIC_PERFORMANCE", "weight", 40)));
        mockMvc.perform(put("/api/v1/admin/ranking-criteria").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(bad)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/admin/ranking-criteria").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(bad)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("sum to 100")));

        Map<String, Object> good = Map.of("weights", List.of(
                Map.of("code", "ACADEMIC_PERFORMANCE", "weight", 30),
                Map.of("code", "ACCESSIBILITY_TRANSPORT", "weight", 0)));
        mockMvc.perform(put("/api/v1/admin/ranking-criteria").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(good)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criteria[0].weight").value(30.00));
    }

    @Test
    void parentFeedbackCannotBeEnteredManuallyAndScoresNeedSources() throws Exception {
        long s = createSchool(school("Feedback School", Map.of()));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/criterion-scores", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("criterionCode", "PARENT_FEEDBACK", "academicYear", YEAR, "rawScore", 5,
                                "maxScore", 5, "sourceUrl", "https://example.org"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/admin/schools/{id}/criterion-scores", s).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("criterionCode", "INFRASTRUCTURE", "academicYear", YEAR, "rawScore", 120, "maxScore", 100))))
                .andExpect(status().isBadRequest());
    }
}
