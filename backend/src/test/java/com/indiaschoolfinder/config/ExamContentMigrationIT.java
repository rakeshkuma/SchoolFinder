package com.indiaschoolfinder.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V48 runs on start against the live exam rows, but a test database is migrated while the exam table is still empty, so its
 * UPDATE never touches a row there. This runs the same SQL on real rows: the named keys are replaced, every other key and the
 * exam's dates are left as they were.
 */
class ExamContentMigrationIT extends AbstractIntegrationTest {

    private static final String V48 = "db/migration/V48__aissee_2027_bulletin_and_jnvst_result_faq.sql";

    @Test
    void theMigrationReplacesOnlyTheKeysItNamesOnExistingRows() throws Exception {
        Integer exams = jdbc.queryForObject("SELECT count(*) FROM exam WHERE slug IN ('aissee', 'jnvst')", Integer.class);
        if (exams == null || exams < 2) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/admin/exams/import")
                    .header("Authorization", editorToken()).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .content(new ClassPathResource("seed/exams.json").getContentAsString(StandardCharsets.UTF_8)));
        }
        Map<String, Object> before = jdbc.queryForMap("SELECT content::text AS content, last_verified_on FROM exam WHERE slug = 'aissee'");
        Integer datesBefore = jdbc.queryForObject("SELECT count(*) FROM exam_date d JOIN exam e ON e.id = d.exam_id WHERE e.slug = 'aissee'",
                Integer.class);
        try {
            // The live row as it was on 25 Nov 2026, in short: the old eligibility and FAQ, and a key V48 does not name.
            jdbc.update("UPDATE exam SET content = content || '{\"eligibility\": [\"Class VI (2026-27 cycle): old\"], "
                    + "\"faq\": [{\"question\": \"Have the AISSEE-2027 dates been announced?\", \"answer\": \"Not as of 25 October 2026\", "
                    + "\"guidance\": false}], \"languages\": \"kept as edited\"}'::jsonb, last_verified_on = DATE '2026-11-12' WHERE slug = 'aissee'");

            jdbc.execute(new ClassPathResource(V48).getContentAsString(StandardCharsets.UTF_8));

            JsonNode content = objectMapper.readTree(jdbc.queryForObject("SELECT content::text FROM exam WHERE slug = 'aissee'", String.class));
            assertThat(content.get("eligibility").get(0).asText()).startsWith("Class VI (AISSEE-2027, admission 2027-28)");
            assertThat(content.get("faq").toString()).contains("NTA’s public notice of 3 November 2026").doesNotContain("Not as of 25 October");
            // Not named by V48: left exactly as the row had it.
            assertThat(content.get("languages").asText()).isEqualTo("kept as edited");
            assertThat(content.get("pattern").isArray()).isTrue();
            assertThat(jdbc.queryForObject("SELECT last_verified_on::text FROM exam WHERE slug = 'aissee'", String.class)).isEqualTo("2026-11-25");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM exam_date d JOIN exam e ON e.id = d.exam_id WHERE e.slug = 'aissee'",
                    Integer.class)).isEqualTo(datesBefore);
            assertThat(jdbc.queryForObject("SELECT content::text FROM exam WHERE slug = 'jnvst'", String.class))
                    .contains("Is there a waiting list or second list?");
        } finally {
            // Other tests share this database: put the row back as it was.
            jdbc.update("UPDATE exam SET content = ?::jsonb, last_verified_on = ? WHERE slug = 'aissee'", before.get("content"),
                    before.get("last_verified_on"));
        }
    }
}
