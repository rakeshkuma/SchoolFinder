package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FeeApiIT extends AbstractIntegrationTest {

    private long cheap;
    private long expensive;

    @BeforeEach
    void schools() throws Exception {
        cheap = createSchool(school("Affordable School", Map.of("pinCode", "110092")));
        expensive = createSchool(school("Premium School", Map.of("pinCode", "110021")));
    }

    private Map<String, Object> fee(String year, int monthlyTuition) {
        Map<String, Object> f = new HashMap<>();
        f.put("classCode", "NURSERY");
        f.put("academicYear", year);
        f.put("registrationFee", 25);
        f.put("admissionFee", 200);
        f.put("monthlyTuition", monthlyTuition);
        f.put("annualCharges", 0);
        f.put("developmentCharges", 0);
        f.put("otherCharges", 0);
        f.put("securityDeposit", 500);
        f.put("transportMonthly", 1500);
        f.put("sourceUrl", "https://example.org/fee-circular-" + year + ".pdf");
        return f;
    }

    private ResultActions postFee(long schoolId, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/admin/schools/{id}/fees", schoolId).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    @Test
    void feeHistoryIsKeptPerAcademicYearAndDerivedTotalsAreStored() throws Exception {
        postFee(cheap, fee("2025-26", 2000)).andExpect(status().isCreated());
        postFee(cheap, fee("2026-27", 2200))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recurringAnnualOfficial").value(26400.00))
                .andExpect(jsonPath("$.firstYearOfficial").value(26625.00))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"));

        mockMvc.perform(get("/api/v1/schools/{id}/fees", cheap))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].academicYear").value("2026-27"))
                .andExpect(jsonPath("$[1].academicYear").value("2025-26"));
    }

    @Test
    void invalidFeeDataIsRejected() throws Exception {
        Map<String, Object> negative = fee("2026-27", -10);
        postFee(cheap, negative).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("monthlyTuition")));

        Map<String, Object> noSource = fee("2026-27", 1000);
        noSource.remove("sourceUrl");
        postFee(cheap, noSource).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("sourceUrl")));

        postFee(cheap, fee("2026-28", 1000)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("academicYear")));

        Map<String, Object> badClass = fee("2026-27", 1000);
        badClass.put("classCode", "CLASS_99");
        postFee(cheap, badClass).andExpect(status().isBadRequest());
    }

    @Test
    void unknownComponentsStayNullAndAreListedAsMissing() throws Exception {
        Map<String, Object> partial = fee("2026-27", 3000);
        partial.remove("developmentCharges");
        postFee(cheap, partial)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.developmentCharges").value(nullValue()))
                .andExpect(jsonPath("$.recurringAnnualOfficial").value(nullValue()))
                .andExpect(jsonPath("$.missingComponents[0]").value("developmentCharges"));
    }

    @Test
    void directoryFiltersByOfficialAnnualFee() throws Exception {
        postFee(cheap, fee("2026-27", 2000)).andExpect(status().isCreated());      // 24,000 / year
        postFee(expensive, fee("2026-27", 15000)).andExpect(status().isCreated()); // 180,000 / year

        mockMvc.perform(get("/api/v1/schools").param("minAnnualFee", "0").param("maxAnnualFee", "50000").param("schoolType", "PRIVATE"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Affordable School"));
    }

    @Test
    void sortingByFeePutsSchoolsWithoutPublishedFeesLast() throws Exception {
        createSchool(school("Aardvark School", Map.of("pinCode", "110001"))); // no fees: must not look cheapest
        postFee(cheap, fee("2026-27", 2000)).andExpect(status().isCreated());
        postFee(expensive, fee("2026-27", 15000)).andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/schools").param("sortBy", "fee"))
                .andExpect(jsonPath("$.content[0].name").value("Affordable School"))
                .andExpect(jsonPath("$.content[1].name").value("Premium School"))
                .andExpect(jsonPath("$.content[2].name").value("Aardvark School"));
        mockMvc.perform(get("/api/v1/schools").param("sortBy", "fee").param("sortDirection", "desc"))
                .andExpect(jsonPath("$.content[0].name").value("Premium School"))
                .andExpect(jsonPath("$.content[2].name").value("Aardvark School"));
    }

    @Test
    void comparisonUsesTheSameAcademicYearForAllSchools() throws Exception {
        postFee(cheap, fee("2026-27", 2000)).andExpect(status().isCreated());
        postFee(expensive, fee("2025-26", 15000)).andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/fees/compare").param("schoolIds", cheap + "," + expensive).param("classCode", "NURSERY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academicYear").value("2026-27"))
                .andExpect(jsonPath("$.schools[0].available").value(true))
                .andExpect(jsonPath("$.schools[1].available").value(false))
                .andExpect(jsonPath("$.schools[1].fee").value(nullValue()));

        mockMvc.perform(get("/api/v1/fees/compare").param("schoolIds", "1,2,3,4,5").param("classCode", "NURSERY"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void calculatorReturnsBreakdownFormulaAndRefundableDeposit() throws Exception {
        postFee(cheap, fee("2026-27", 2000)).andExpect(status().isCreated());
        Map<String, Object> request = Map.of("selections", List.of(
                Map.of("schoolId", cheap, "classCode", "NURSERY", "includeTransport", true, "includeBooksAndUniform", false),
                Map.of("schoolId", expensive, "classCode", "NURSERY", "includeTransport", false, "includeBooksAndUniform", false)));

        mockMvc.perform(post("/api/v1/fees/calculate").contentType(MediaType.APPLICATION_JSON).content(json(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].recurringAnnualTotal").value(42000.00))   // 24,000 + 1,500 × 12
                .andExpect(jsonPath("$[0].firstYearTotal").value(42225.00))
                .andExpect(jsonPath("$[0].refundableDeposit").value(500.00))
                .andExpect(jsonPath("$[0].firstYearCashOutlay").value(42725.00))
                .andExpect(jsonPath("$[0].formula.length()").value(4))
                .andExpect(jsonPath("$[1].feeDataAvailable").value(false))
                .andExpect(jsonPath("$[1].firstYearTotal").value(nullValue()));
    }
}
