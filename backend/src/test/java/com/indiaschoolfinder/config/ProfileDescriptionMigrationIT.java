package com.indiaschoolfinder.config;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * V52 runs on start against the live school rows, but a test database is migrated before any school exists, so it touches
 * nothing there. This runs the same SQL on real rows: a bare CBSE listing gets its description and facilities and stops
 * being noindex; a description an editor wrote is kept; running it twice adds nothing.
 */
class ProfileDescriptionMigrationIT extends AbstractIntegrationTest {

    private static final String V52 = "db/migration/V52__profile_descriptions_from_official_websites.sql";
    private static final String BOARD_RECORD = "Listed by CBSE as \"K.K.CAMBRIDGE INTERNATIONAL SCHOOL\" (affiliation no. 1130896).";

    private String head(String path) throws Exception {
        return mockMvc.perform(get("/api/v1/seo/head" + path)).andReturn().getResponse().getContentAsString();
    }

    private int facilities(long id) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM school_facility WHERE school_id = ?", Integer.class, id);
        return n == null ? 0 : n;
    }

    private int auditRows(long id) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM admin_audit_log WHERE entity_type = 'SCHOOL' AND entity_id = ? "
                + "AND action = 'SCHOOL_FACTS_UPDATED' AND details LIKE '%Migration V52.'", Integer.class, id);
        return n == null ? 0 : n;
    }

    @Test
    void bareListingsGetTheirDescriptionAndFacilitiesOnceAndEditorsTextIsKept() throws Exception {
        long kk = createSchool(school("K K Cambridge International School", Map.of()));
        long moga = createSchool(school("Moga Devi Minda Memorial School", Map.of()));
        jdbc.update("UPDATE school SET slug = 'k-k-cambridge-international-school', description = ? WHERE id = ?", BOARD_RECORD, kk);
        jdbc.update("UPDATE school SET slug = 'moga-devi-minda-memorial-school', description = 'An editor wrote this.' WHERE id = ?", moga);
        // A bare board listing is noindex before.
        assertThat(head("/schools/k-k-cambridge-international-school")).contains("noindex");

        String sql = new ClassPathResource(V52).getContentAsString(StandardCharsets.UTF_8);
        jdbc.execute(sql);

        String described = jdbc.queryForObject("SELECT description FROM school WHERE id = ?", String.class, kk);
        assertThat(described).startsWith("K K Cambridge International School is a CBSE-affiliated school in Amravati")
                .contains("more than 25 computers");
        assertThat(described.length()).isGreaterThanOrEqualTo(300);
        assertThat(facilities(kk)).isEqualTo(6);
        assertThat(jdbc.queryForList("SELECT DISTINCT verification_status FROM school_facility WHERE school_id = ?", String.class, kk))
                .containsExactly("VERIFIED");
        assertThat(jdbc.queryForObject("SELECT source_url FROM school_facility WHERE school_id = ? AND name = 'Computer lab'",
                String.class, kk)).isEqualTo("https://www.kkcambridgeschool.org/facilities");
        assertThat(auditRows(kk)).isEqualTo(2); // the description and the facilities
        // No longer a bare listing: indexable.
        assertThat(head("/schools/k-k-cambridge-international-school")).doesNotContain("noindex");

        // A description an editor wrote is never replaced; the facilities are still added.
        assertThat(jdbc.queryForObject("SELECT description FROM school WHERE id = ?", String.class, moga)).isEqualTo("An editor wrote this.");
        assertThat(facilities(moga)).isEqualTo(13);
        assertThat(auditRows(moga)).isEqualTo(1);

        // Running it again changes nothing and logs nothing.
        jdbc.execute(sql);
        assertThat(jdbc.queryForObject("SELECT description FROM school WHERE id = ?", String.class, kk)).isEqualTo(described);
        assertThat(facilities(kk)).isEqualTo(6);
        assertThat(facilities(moga)).isEqualTo(13);
        assertThat(auditRows(kk)).isEqualTo(2);
        assertThat(auditRows(moga)).isEqualTo(1);
    }
}
