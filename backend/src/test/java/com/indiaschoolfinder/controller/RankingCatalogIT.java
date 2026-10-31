package com.indiaschoolfinder.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The public ranking tables: one list at a time, the publisher's ranks kept apart, and nothing shown before approval. */
class RankingCatalogIT extends AbstractIntegrationTest {

    private static final String HEADER = "school_slug,publisher_code,ranking_name,ranking_year,category,scope,rank_position,state_rank,city_rank,score,max_score,rating,source_url,retrieved_date\n";
    private static final String TAIL = ",https://example.org/list,2026-10-01\n";

    private String aaa;
    private String bbb;
    private String ccc;

    @BeforeEach
    void clean() {
        jdbc.execute("DELETE FROM ranking_verification");
        jdbc.execute("DELETE FROM ranking_source");
        jdbc.execute("DELETE FROM ranking_import_job");
        jdbc.execute("DELETE FROM ranking_edition WHERE name LIKE 'Test %'");
        aaa = school("Aaa Rank School", "DL", "Delhi", "CBSE", "PRIVATE");
        bbb = school("Bbb Rank School", "DL", "Delhi", "CISCE", "GOVERNMENT");
        ccc = school("Ccc Rank School", "BR", "Patna", "CBSE", "PRIVATE");
    }

    private String school(String name, String state, String city, String board, String type) {
        String slug = name.toLowerCase().replace(' ', '-') + "-" + System.nanoTime();
        jdbc.update("""
                INSERT INTO school (name, slug, school_type, education_board_code, city, state_code, source_url, active, verification_status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'https://example.org', TRUE, 'UNVERIFIED', now(), now())""", name, slug, type, board, city, state);
        return slug;
    }

    private ResultActions upload(String csv, String mode) throws Exception {
        return mockMvc.perform(multipart("/api/v1/admin/import/external-rankings").file(new MockMultipartFile("file", "list.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)))
                .param("mode", mode).header("Authorization", adminToken()));
    }

    private String list() {
        return HEADER
                + aaa + ",IIRF,Test Top Schools,2026,All,NATIONAL,1,1,,91.5,100," + TAIL
                + bbb + ",IIRF,Test Top Schools,2026,All,NATIONAL,2,2,,,," + TAIL
                + ccc + ",IIRF,Test Top Schools,2026,All,NATIONAL,3,1,,,," + TAIL;
    }

    private long approveLatestJob() throws Exception {
        JsonNode jobs = body(mockMvc.perform(get("/api/v1/admin/import/ranking-jobs").header("Authorization", adminToken())).andReturn());
        long id = jobs.at("/content/0/id").asLong();
        mockMvc.perform(post("/api/v1/admin/import/ranking-jobs/" + id + "/approve").header("Authorization", adminToken())
                .contentType("application/json").content("{\"note\":\"Checked against the list\"}")).andExpect(status().isOk());
        return id;
    }

    private long edition() throws Exception {
        JsonNode list = body(mockMvc.perform(get("/api/v1/rankings/editions")).andReturn());
        for (JsonNode e : list) if (e.get("name").asText().equals("Test Top Schools")) return e.get("id").asLong();
        throw new AssertionError("no edition");
    }

    @Test
    void nothingIsPublicUntilAnImportIsApprovedAndEveryDecisionIsKept() throws Exception {
        upload(list(), "ALL_OR_NOTHING").andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/rankings/editions")).andExpect(jsonPath("$[?(@.name == 'Test Top Schools')]").isEmpty());
        mockMvc.perform(get("/api/v1/admin/import/ranking-jobs").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.content[0].awaitingApproval").value(3)).andExpect(jsonPath("$.content[0].created").value(3));
        approveLatestJob();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ranking_verification WHERE status = 'VERIFIED'", Integer.class)).isEqualTo(3);
        mockMvc.perform(post("/api/v1/admin/import/ranking-jobs/1/approve").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
    }

    @Test
    void ranksStaySeparateAndFiltersNeverRenumber() throws Exception {
        upload(list(), "ALL_OR_NOTHING");
        approveLatestJob();
        long e = edition();
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].nationalRank").value(1))
                .andExpect(jsonPath("$.content[0].score").value(91.5))
                .andExpect(jsonPath("$.content[0].maxScore").value(100))
                .andExpect(jsonPath("$.content[1].score").doesNotExist())
                .andExpect(jsonPath("$.content[2].schoolName").value("Ccc Rank School"));
        // Ccc is first in its state and third nationally: neither number replaces the other.
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("state", "BR"))
                .andExpect(jsonPath("$.content[0].nationalRank").value(3)).andExpect(jsonPath("$.content[0].stateRank").value(1))
                .andExpect(jsonPath("$.content[0].cityRank").doesNotExist());
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("schoolType", "GOVERNMENT"))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].nationalRank").value(2));
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("board", "CISCE").param("q", "bbb"))
                .andExpect(jsonPath("$.totalElements").value(1));
        // Top 100 of a three-school list is three schools.
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("size", "100")).andExpect(jsonPath("$.content.length()").value(3));
        mockMvc.perform(get("/api/v1/rankings/places").param("edition", String.valueOf(e)))
                .andExpect(jsonPath("$.states.length()").value(2)).andExpect(jsonPath("$.cities.length()").value(2));
    }

    @Test
    void topTabsFollowThePublishersRanksAndOnlyGroupsWithDataAreOffered() throws Exception {
        upload(list(), "ALL_OR_NOTHING");
        approveLatestJob();
        long e = edition();
        // A Top 2 is ranks 1 and 2, whatever number of rows the list has.
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("maxRank", "2")).andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/v1/rankings/places").param("edition", String.valueOf(e)))
                .andExpect(jsonPath("$.boards[?(@.code == 'IB')]").isEmpty())
                .andExpect(jsonPath("$.government.length()").value(1)).andExpect(jsonPath("$.government[0].code").value("OTHER"))
                .andExpect(jsonPath("$.boarding").isEmpty());
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("government", "OTHER"))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].nationalRank").value(2));
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("government", "KV")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(e)).param("boarding", "ANY")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/rankings/sections"))
                .andExpect(jsonPath("$.rankings").value(true)).andExpect(jsonPath("$.government").value(true))
                .andExpect(jsonPath("$.boarding").value(false)).andExpect(jsonPath("$.green").value(false));
    }

    @Test
    void aReimportUpdatesTheSameEntryAndDuplicatesAreRefused() throws Exception {
        upload(list(), "ALL_OR_NOTHING");
        approveLatestJob();
        upload(HEADER + aaa + ",IIRF,Test Top Schools,2026,All,NATIONAL,4,,,,," + TAIL, "ALL_OR_NOTHING").andExpect(jsonPath("$.updated").value(1));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ranking_source", Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT verification_status FROM ranking_source WHERE national_rank = 4", String.class)).isEqualTo("UNVERIFIED");
        String twice = HEADER + aaa + ",IIRF,Test Top Schools,2026,All,NATIONAL,1,,,,," + TAIL + aaa + ",IIRF,Test Top Schools,2026,All,NATIONAL,2,,,,," + TAIL;
        upload(twice, "ALL_OR_NOTHING").andExpect(jsonPath("$.committed").value(false));
        JsonNode jobs = body(mockMvc.perform(get("/api/v1/admin/import/ranking-jobs").header("Authorization", adminToken())).andReturn());
        assertThat(jobs.at("/content/0/errors/0/message").asText()).contains("twice");
    }

    @Test
    void aRatingIsNotARankAndTheBoardWithNoListHasNone() throws Exception {
        upload(HEADER + aaa + ",GSP,Test Green,2025-26,Green school rating,NATIONAL,,,,,,GREEN" + TAIL + bbb + ",GSP,Test Green,2025-26,Green school rating,NATIONAL,,,,,,RED" + TAIL, "ALL_OR_NOTHING")
                .andExpect(status().isOk());
        approveLatestJob();
        JsonNode list = body(mockMvc.perform(get("/api/v1/rankings/editions")).andReturn());
        assertThat(list.toString()).doesNotContain("\"boardCode\":\"CBSE\"");
        long id = -1;
        for (JsonNode e : list) if (e.get("name").asText().equals("Test Green")) id = e.get("id").asLong();
        mockMvc.perform(get("/api/v1/rankings/table").param("edition", String.valueOf(id)))
                .andExpect(jsonPath("$.content[0].rating").value("GREEN")).andExpect(jsonPath("$.content[0].nationalRank").doesNotExist());
        upload(HEADER + aaa + ",GSP,Test Green,2025-26,x,NATIONAL,,,,,,PURPLE" + TAIL, "ALL_OR_NOTHING").andExpect(jsonPath("$.committed").value(false));
    }
}
