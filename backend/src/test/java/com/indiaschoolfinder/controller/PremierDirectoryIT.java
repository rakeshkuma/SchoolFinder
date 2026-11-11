package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.PremierDirectoryLoader;
import com.indiaschoolfinder.service.PremierDirectoryService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PremierDirectoryIT extends AbstractIntegrationTest {

    @Autowired PremierDirectoryLoader loader;
    @Autowired PremierDirectoryService service;

    @BeforeEach
    void load() throws Exception {
        loader.run(null);
    }

    private long school(String name, String slug, String state) {
        jdbc.update("""
                INSERT INTO school (name, slug, school_type, city, state_code, source_url, active, verification_status, created_at, updated_at)
                VALUES (?, ?, 'PRIVATE', 'Town', ?, 'https://example.org', TRUE, 'UNVERIFIED', now(), now())""", name, slug, state);
        return jdbc.queryForObject("SELECT id FROM school WHERE slug = ?", Long.class, slug);
    }

    @Test
    void theWholeDirectoryLoadsWithCountsAndCategories() throws Exception {
        mockMvc.perform(get("/api/v1/rankings/directory/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schools").value(100))
                .andExpect(jsonPath("$.categories[0].slug").value("top-premier-schools"))
                .andExpect(jsonPath("$.categories[0].schools").value(100))
                .andExpect(jsonPath("$.categories[*].slug", hasItem("girls-boarding-schools")));
        // Loading again changes nothing and never duplicates an entry.
        loader.run(null);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM premier_school", Long.class)).isEqualTo(100);
    }

    @Test
    void listsAreAToZWithoutRanksOfOurOwn() throws Exception {
        String body = mockMvc.perform(get("/api/v1/rankings/directory").param("category", "top-premier-schools").param("size", "3"))
                .andExpect(jsonPath("$.totalElements").value(100))
                .andExpect(jsonPath("$.content[0].name").value("The Aga Khan Academy"))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("source_order").doesNotContain("\"order\"");
    }

    @Test
    void filtersNarrowByCategoryPlaceBoardGenderAndClass() throws Exception {
        mockMvc.perform(get("/api/v1/rankings/directory").param("category", "girls-boarding-schools").param("size", "100"))
                .andExpect(jsonPath("$.content[*].gender", not(hasItem("BOYS"))))
                .andExpect(jsonPath("$.content[*].name", hasItem("Welham Girls' School")));
        mockMvc.perform(get("/api/v1/rankings/directory").param("state", "UK").param("board", "CBSE").param("q", "welham"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Welham Boys' School"));
        mockMvc.perform(get("/api/v1/rankings/directory").param("category", "alternative-schools").param("class", "12").param("residence", "BOARDING"))
                .andExpect(jsonPath("$.content[*].name", hasItem("Rishi Valley School")))
                .andExpect(jsonPath("$.content[*].name", not(hasItem("Sahyadri School"))));
        mockMvc.perform(get("/api/v1/rankings/directory/facets").param("category", "boys-boarding-schools"))
                .andExpect(jsonPath("$.genders.length()").value(1))
                .andExpect(jsonPath("$.states[*].code", hasItem("UK")));
        mockMvc.perform(get("/api/v1/rankings/directory/category/no-such-schools")).andExpect(status().isNotFound());
    }

    @Test
    void anEntryLinksToItsProfileOnceAndShowsItsCategories() throws Exception {
        long welham = school("Welham Boys' School", "welham-boys-school", "UK");
        // A second school with the same name elsewhere is never picked: the seed names the profile.
        school("Welham Boys School", "welham-boys-school-2", "UK");
        long doon = school("The Doon School", "the-doon-school", "UK");
        service.link();
        mockMvc.perform(get("/api/v1/rankings/directory/schools/" + welham))
                .andExpect(jsonPath("$.school.slug").value("welham-boys-school"))
                .andExpect(jsonPath("$.categories[*].slug", hasItem("boys-boarding-schools")))
                .andExpect(jsonPath("$.categories[*].slug", hasItem("cbse-schools")));
        mockMvc.perform(get("/api/v1/rankings/directory/schools/" + doon)).andExpect(jsonPath("$.school.name").value("The Doon School"));
        // Several campuses share these names, so no single profile is linked.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM premier_school WHERE campus_search IS NOT NULL AND school_id IS NOT NULL", Long.class)).isZero();
    }

    @Test
    void categoryPagesHaveTheirOwnSearchHead() throws Exception {
        String head = mockMvc.perform(get("/api/v1/seo/head/rankings/girls-boarding-schools"))
                .andReturn().getResponse().getContentAsString();
        assertThat(head).contains("Best Girls Boarding Schools in India").doesNotContain("noindex");
        String none = mockMvc.perform(get("/api/v1/seo/head/rankings/no-such-schools")).andReturn().getResponse().getContentAsString();
        assertThat(none).contains("noindex");
    }
}
