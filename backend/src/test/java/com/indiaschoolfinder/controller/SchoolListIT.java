package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.SchoolListLoader;
import com.indiaschoolfinder.service.SchoolListService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SchoolListIT extends AbstractIntegrationTest {

    @Autowired SchoolListLoader loader;
    @Autowired SchoolListService service;

    @BeforeEach
    void load() throws Exception {
        loader.run(null);
    }

    private void school(String name, String state, String city) {
        jdbc.update("""
                INSERT INTO school (name, slug, school_type, city, state_code, source_url, active, verification_status, created_at, updated_at)
                VALUES (?, ?, 'PRIVATE', ?, ?, 'https://example.org', TRUE, 'UNVERIFIED', now(), now())""",
                name, "list-" + System.nanoTime(), city, state);
    }

    @Test
    void everyListIsLoadedAndHasNoRank() throws Exception {
        mockMvc.perform(get("/api/v1/school-lists"))
                .andExpect(jsonPath("$.length()").value(14))
                .andExpect(jsonPath("$[?(@.key == 'india-top')].entries").value(100))
                .andExpect(jsonPath("$[?(@.key == 'state-br')].entries").value(69))
                .andExpect(jsonPath("$[?(@.key == 'board-state')].entries").value(5));
        String body = mockMvc.perform(get("/api/v1/school-lists/board-state")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("rank").doesNotContain("position");
    }

    @Test
    void aListReadsAToZAndCanBeSearched() throws Exception {
        mockMvc.perform(get("/api/v1/school-lists/board-cambridge"))
                .andExpect(jsonPath("$.content[0].name").value("Hebron School"))
                .andExpect(jsonPath("$.content[5].name").value("Unison World School"));
        mockMvc.perform(get("/api/v1/school-lists/board-cambridge").param("q", "ooty")).andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/school-lists/no-such-list")).andExpect(status().isNotFound());
    }

    @Test
    void aProfileLinksOnlyWhenExactlyOneSchoolFits() throws Exception {
        school("HEBRON SCHOOL", "TN", "Ooty");
        // Two spellings of one name in a state: neither school is linked.
        school("Kasiga School", "UK", "Dehradun");
        school("Kasiga-School", "UK", "Mussoorie");
        service.match();
        mockMvc.perform(get("/api/v1/school-lists/board-cambridge").param("q", "hebron")).andExpect(jsonPath("$.content[0].slug").isNotEmpty());
        mockMvc.perform(get("/api/v1/school-lists/board-cambridge").param("q", "kasiga")).andExpect(jsonPath("$.content[0].slug").doesNotExist());
    }
}
