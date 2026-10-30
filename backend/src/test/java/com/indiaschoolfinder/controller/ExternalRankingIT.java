package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Rankings published by others: recorded as printed, hidden until checked, never mixed with sponsored listings. */
class ExternalRankingIT extends AbstractIntegrationTest {

    private static final String PAGE = "https://www.example.org/rankings/2025";

    private Map<String, Object> entry(Map<String, Object> overrides) {
        Map<String, Object> e = new HashMap<>(Map.of("publisherCode", "EDUCATIONWORLD", "rankingName", "India School Rankings",
                "rankingYear", "2025-26", "category", "Day schools", "rankPosition", 3, "sourceUrl", PAGE,
                "retrievedDate", LocalDate.now().minusDays(1).toString()));
        e.putAll(overrides);
        return e;
    }

    private long add(long schoolId, Map<String, Object> body) throws Exception {
        return body(mockMvc.perform(post("/api/v1/admin/schools/{id}/external-rankings", schoolId)
                        .header("Authorization", editorToken()).contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"))
                .andReturn()).get("id").asLong();
    }

    private void verify(long id, String status) throws Exception {
        mockMvc.perform(post("/api/v1/admin/external-rankings/{id}/verify", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", status))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value(status))
                .andExpect(jsonPath("$.lastVerifiedDate").isNotEmpty());
    }

    @Test
    void entriesArePublicOnlyAfterVerification() throws Exception {
        long school = createSchool(school("Ranked School", Map.of()));
        long id = add(school, entry(Map.of()));

        mockMvc.perform(get("/api/v1/rankings/external")).andExpect(jsonPath("$.content.length()").value(0));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", school)).andExpect(jsonPath("$.externalRankings.length()").value(0));

        verify(id, "VERIFIED");
        mockMvc.perform(get("/api/v1/rankings/external").param("publisher", "EDUCATIONWORLD"))
                .andExpect(jsonPath("$.content[0].entry.rankPosition").value(3))
                .andExpect(jsonPath("$.content[0].entry.publisher").value("EducationWorld"))
                .andExpect(jsonPath("$.content[0].schoolName").value("Ranked School"));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", school))
                .andExpect(jsonPath("$.externalRankings[0].publisherCode").value("EDUCATIONWORLD"));
        mockMvc.perform(get("/api/v1/rankings/external/facets"))
                .andExpect(jsonPath("$.years").value(hasItem("2025-26")))
                .andExpect(jsonPath("$.categories").value(hasItem("Day schools")));
        mockMvc.perform(get("/api/v1/rankings/publishers"))
                .andExpect(jsonPath("$[?(@.code == 'EDUCATIONWORLD')].verifiedEntries").value(hasItem(1)));

        // A correction must be checked again before it is shown.
        mockMvc.perform(put("/api/v1/admin/external-rankings/{id}", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(entry(Map.of("rankPosition", 4)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"));
        mockMvc.perform(get("/api/v1/rankings/external")).andExpect(jsonPath("$.content.length()").value(0));

        // The same list cannot hold the school twice.
        mockMvc.perform(post("/api/v1/admin/schools/{id}/external-rankings", school).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(entry(Map.of()))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sponsoredListingsAreNeverRankingsAndRegionalListsNameTheirRegion() throws Exception {
        long school = createSchool(school("Featured School", Map.of()));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/external-rankings", school).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(entry(Map.of("sponsored", true)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("rankPosition"));
        Map<String, Object> sponsored = entry(Map.of("sponsored", true, "scoreText", "Featured school"));
        sponsored.remove("rankPosition");
        long id = add(school, sponsored);
        verify(id, "VERIFIED");
        mockMvc.perform(get("/api/v1/rankings/external")).andExpect(jsonPath("$.content.length()").value(0));
        mockMvc.perform(get("/api/v1/schools/{id}/ranking", school))
                .andExpect(jsonPath("$.externalRankings[0].sponsored").value(true));

        mockMvc.perform(post("/api/v1/admin/schools/{id}/external-rankings", school).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(entry(Map.of("scope", "STATE", "rankingName", "State list")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("region"));
        mockMvc.perform(post("/api/v1/admin/schools/{id}/external-rankings", school).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(entry(Map.of("rankingYear", "last year")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("rankingYear"));
    }

    @Test
    void greenRatingsAreListedByPublisherKind() throws Exception {
        mockMvc.perform(put("/api/v1/admin/ranking-publishers/{code}", "TEST_GREEN").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Test Green Rating", "kind", "GREEN", "websiteUrl", "https://green.example.org"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("TEST_GREEN"));
        long school = createSchool(school("Green School", Map.of()));
        long survey = createSchool(school("Survey School", Map.of()));
        verify(add(school, entry(Map.of("publisherCode", "TEST_GREEN", "rankingName", "Green rating", "rankPosition", 1))), "VERIFIED");
        verify(add(survey, entry(Map.of())), "VERIFIED");

        mockMvc.perform(get("/api/v1/rankings/external").param("kind", "GREEN"))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].schoolName").value("Green School"));
    }

    @Test
    void csvImportValidatesEveryRowAndKeepsImportsUnverified() throws Exception {
        createSchool(school("Csv One", Map.of()));
        createSchool(school("Csv Two", Map.of()));
        String yesterday = LocalDate.now().minusDays(1).toString();
        String header = "school_slug,publisher_code,ranking_name,ranking_year,category,scope,region,rank_position,score_text,source_url,retrieved_date\n";
        String good = "csv-one,EDUCATIONWORLD,India School Rankings,2025-26,Day schools,STATE,Delhi,1,," + PAGE + "," + yesterday + "\n"
                + "csv-two,EDUCATIONWORLD,India School Rankings,2025-26,Day schools,STATE,Delhi,2,," + PAGE + "," + yesterday + "\n";
        String bad = "no-such-school,EDUCATIONWORLD,India School Rankings,2025-26,,NATIONAL,,x,," + PAGE + "," + yesterday + "\n";

        mockMvc.perform(multipart("/api/v1/admin/import/external-rankings")
                        .file(new MockMultipartFile("file", "r.csv", "text/csv", (header + good + bad).getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.committed").value(false))
                .andExpect(jsonPath("$.errors.length()").value(2));
        // Editors may not bulk import.
        mockMvc.perform(multipart("/api/v1/admin/import/external-rankings")
                        .file(new MockMultipartFile("file", "r.csv", "text/csv", (header + good).getBytes()))
                        .header("Authorization", editorToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(multipart("/api/v1/admin/import/external-rankings")
                        .file(new MockMultipartFile("file", "r.csv", "text/csv", (header + good).getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.committed").value(true))
                .andExpect(jsonPath("$.created").value(2));
        var imported = body(mockMvc.perform(get("/api/v1/admin/external-rankings").param("status", "UNVERIFIED")
                        .header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andReturn()).get("content");
        long first = -1;
        for (var item : imported) {
            if (item.get("schoolName").asText().equals("Csv One")) first = item.get("entry").get("id").asLong();
        }
        verify(first, "VERIFIED");

        // Re-importing the same rows keeps the check; a changed position needs a new one.
        mockMvc.perform(multipart("/api/v1/admin/import/external-rankings")
                        .file(new MockMultipartFile("file", "r.csv", "text/csv", (header + good).getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(0))
                .andExpect(jsonPath("$.updated").value(0));
        mockMvc.perform(get("/api/v1/rankings/external").param("region", "delhi")).andExpect(jsonPath("$.content.length()").value(1));
        mockMvc.perform(multipart("/api/v1/admin/import/external-rankings")
                        .file(new MockMultipartFile("file", "r.csv", "text/csv", (header + good.replace(",1,,", ",5,,")).getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.updated").value(1));
        mockMvc.perform(get("/api/v1/rankings/external")).andExpect(jsonPath("$.content.length()").value(0));
    }
}
