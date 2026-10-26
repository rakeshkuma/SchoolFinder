package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Every bundled fee/admission payload must be accepted by the admin API for a school in the seed CSV. */
class SeedFeesAndAdmissionsIT extends AbstractIntegrationTest {

    @Test
    void bundledFeeAndAdmissionPayloadsAreAcceptedByTheAdminApi() throws Exception {
        byte[] seed = new ClassPathResource("seed/delhi-schools.csv").getContentAsByteArray();
        mockMvc.perform(multipart("/api/v1/admin/import/csv")
                        .file(new MockMultipartFile("file", "delhi-schools.csv", "text/csv", seed))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.committed").value(true));

        JsonNode data = objectMapper.readTree(new ClassPathResource("seed/fees-and-admissions.json").getInputStream());
        int posted = 0;
        for (JsonNode school : data.get("schools")) {
            String name = school.get("schoolName").asText();
            Long id = jdbc.queryForObject("select id from school where name = ?", Long.class, name);
            for (JsonNode fee : school.get("fees")) {
                assertThat(fee.get("sourceUrl").asText()).as(name).startsWith("http");
                mockMvc.perform(post("/api/v1/admin/schools/{id}/fees", id).header("Authorization", adminToken())
                                .contentType(MediaType.APPLICATION_JSON).content(fee.toString()))
                        .andExpect(status().is2xxSuccessful());
                posted++;
            }
            for (JsonNode admission : school.get("admissions")) {
                mockMvc.perform(post("/api/v1/admin/schools/{id}/admissions", id).header("Authorization", adminToken())
                                .contentType(MediaType.APPLICATION_JSON).content(admission.toString()))
                        .andExpect(status().is2xxSuccessful());
                posted++;
            }
        }
        assertThat(posted).isGreaterThan(0);

        // Bundled licensed photos must also be accepted (licence, credit and source are required).
        JsonNode images = objectMapper.readTree(new ClassPathResource("seed/images.json").getInputStream());
        for (JsonNode school : images.get("schools")) {
            Long id = jdbc.queryForObject("select id from school where name = ?", Long.class, school.get("schoolName").asText());
            for (JsonNode image : school.get("images")) {
                mockMvc.perform(post("/api/v1/admin/schools/{id}/images", id).header("Authorization", adminToken())
                                .contentType(MediaType.APPLICATION_JSON).content(image.toString()))
                        .andExpect(status().is2xxSuccessful());
            }
        }

        // Abbreviations and multi-word queries.
        // "dps" also matches Dashmesh Public School (same initials).
        mockMvc.perform(get("/api/v1/schools").param("q", "dps"))
                .andExpect(jsonPath("$.content[*].name", org.hamcrest.Matchers.hasItem("Delhi Public School R. K. Puram")));
        mockMvc.perform(get("/api/v1/schools").param("q", "mayur vihar"))
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(25)));
        mockMvc.perform(get("/api/v1/schools").param("q", "mayur vihar").param("schoolType", "GOVERNMENT"))
                .andExpect(jsonPath("$.totalElements").value(9));
        mockMvc.perform(get("/api/v1/schools").param("q", "dps rk puram"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools").param("q", "kv andrews"))
                .andExpect(jsonPath("$.content[0].name").value("PM SHRI Kendriya Vidyalaya Andrews Ganj"));

        // Monthly charges make Ahlcon's annual totals computable, so the fee filter and card highlight work.
        mockMvc.perform(get("/api/v1/schools").param("q", "ahlcon"))
                .andExpect(jsonPath("$.content[0].annualFeeFrom").isNumber())
                .andExpect(jsonPath("$.content[0].annualFeeYear").value("2026-27"));
        mockMvc.perform(get("/api/v1/schools").param("maxAnnualFee", "1000000").param("feeAcademicYear", "2026-27"))
                // Ahlcon and Bal Bharati publish complete 2026-27 schedules.
                .andExpect(jsonPath("$.totalElements").value(2));
        // Without a year each school's latest complete schedule from this or last year counts (adds Springdales
        // 2025-26); Modern School's 2022-23 schedule is too old to be used by the filter.
        mockMvc.perform(get("/api/v1/schools").param("maxAnnualFee", "1000000"))
                .andExpect(jsonPath("$.totalElements").value(3));
    }
}
