package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.PremierDirectoryLoader;
import com.indiaschoolfinder.service.PremierDirectoryService;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** What the redesigned /rankings page relies on: the corrected IIRF list name, the photo-first preview and its server-rendered content. */
class RankingsHomeIT extends AbstractIntegrationTest {

    @Autowired PremierDirectoryLoader loader;
    @Autowired PremierDirectoryService directory;

    @BeforeEach
    void load() throws Exception {
        loader.run(null);
    }

    @Test
    void theIirf2026ListCarriesIirfsOwnNameAndNoLongerTheAcademicPerformanceLabel() {
        Map<String, Object> e = jdbc.queryForMap("""
                SELECT e.name, c.code, c.name AS category, c.family FROM ranking_edition e
                JOIN ranking_publisher p ON p.id = e.publisher_id LEFT JOIN ranking_category c ON c.id = e.category_id
                WHERE p.code = 'IIRF' AND e.ranking_year = '2026'""");
        assertThat(e.get("name")).isEqualTo("Top (10+2) Schools in India");
        assertThat(e.get("category")).isEqualTo("Top (10+2) Schools in India");
        assertThat(e.get("family")).isEqualTo("OVERALL");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ranking_edition WHERE name ILIKE '%Academic Performance%'", Long.class)).isZero();
    }

    @Test
    void thePhotoFirstOrderPutsSchoolsWithTheirOwnPhotographFirst() throws Exception {
        // A school late in the alphabet, linked to its directory entry, with a freely licensed photo.
        Map<String, Object> entry = jdbc.queryForMap("SELECT name, school_slug FROM premier_school WHERE school_slug IS NOT NULL ORDER BY lower(name) DESC LIMIT 1");
        jdbc.update("""
                INSERT INTO school (name, slug, school_type, city, state_code, source_url, active, verification_status, created_at, updated_at)
                VALUES (?, ?, 'PRIVATE', 'Town', 'DL', 'https://example.org', TRUE, 'UNVERIFIED', now(), now())""", entry.get("name"), entry.get("school_slug"));
        long id = jdbc.queryForObject("SELECT id FROM school WHERE slug = ?", Long.class, entry.get("school_slug"));
        directory.link();
        jdbc.update("""
                INSERT INTO school_image (school_id, image_type, url, alt_text, license, source_url, permission_status, created_at, updated_at)
                VALUES (?, 'CAMPUS', 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Campus.jpg', 'Campus', 'CC BY-SA 4.0',
                        'https://commons.wikimedia.org/wiki/File:Campus.jpg', 'OPEN_LICENCE', now(), now())""", id);

        mockMvc.perform(get("/api/v1/rankings/directory").param("category", "top-premier-schools").param("size", "1").param("sort", "photo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value(entry.get("name")))
                .andExpect(jsonPath("$.totalElements").value(100));
        // The default order is unchanged: A to Z (featured first).
        mockMvc.perform(get("/api/v1/rankings/directory").param("category", "top-premier-schools").param("size", "1"))
                .andExpect(jsonPath("$.content[0].name").value("The Aga Khan Academy"));
        mockMvc.perform(get("/api/v1/rankings/directory").param("sort", "rank")).andExpect(status().isBadRequest());
    }

    @Test
    void theServerRenderedPageHasTheHeadingTheCategoriesAndSaysTheDirectoryIsNotARanking() throws Exception {
        String head = mockMvc.perform(get("/api/v1/seo/head/rankings")).andReturn().getResponse().getContentAsString();
        assertThat(head).contains("<title>India&#39;s Best Schools: Published School Rankings | SchoolDhundo</title>");
        String body = mockMvc.perform(get("/api/v1/seo/body/rankings")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).contains("<h1>Discover India's Best Schools</h1>")
                .contains("href=\"/rankings/top-premier-schools\"")
                .contains("href=\"/rankings/boards\"")
                .contains("listed A to Z; it is not a ranking.");
    }
}
