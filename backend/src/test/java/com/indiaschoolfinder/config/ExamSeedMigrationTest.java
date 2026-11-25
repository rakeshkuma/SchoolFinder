package com.indiaschoolfinder.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V48 corrects the live AISSEE and JNVST guides by replacing a few content keys; seed/exams.json holds the same text for a new
 * database. This keeps the two equal, so a later edit to one cannot leave the live site and a fresh install saying different
 * things (25 Nov 2026: the live AISSEE guide still gave the 2026 age windows and said the 2027 dates were unannounced).
 */
class ExamSeedMigrationTest {

    private static final String MIGRATION = "db/migration/V48__aissee_2027_bulletin_and_jnvst_result_faq.sql";
    private static final Pattern UPDATE = Pattern.compile(
            "SET content = content \\|\\| '(.*?)'::jsonb,\\s*last_verified_on = DATE '([0-9-]+)',.*?WHERE slug = '([a-z0-9-]+)';",
            Pattern.DOTALL);

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void migrationReplacesExactlyTheSeedTextForEachKeyItNames() throws IOException {
        Map<String, JsonNode> seed = new HashMap<>();
        Map<String, String> verified = new HashMap<>();
        for (JsonNode exam : json.readTree(read("seed/exams.json")).get("exams")) {
            seed.put(exam.get("slug").asText(), exam.get("content"));
            verified.put(exam.get("slug").asText(), exam.get("lastVerifiedOn").asText());
        }
        Matcher m = UPDATE.matcher(read(MIGRATION));
        int updates = 0;
        while (m.find()) {
            updates++;
            String slug = m.group(3);
            JsonNode patch = json.readTree(m.group(1).replace("''", "'"));
            assertThat(seed).containsKey(slug);
            assertThat(m.group(2)).as("last_verified_on of " + slug).isEqualTo(verified.get(slug));
            patch.fieldNames().forEachRemaining(key ->
                    assertThat(patch.get(key)).as(slug + "." + key).isEqualTo(seed.get(slug).get(key)));
        }
        assertThat(updates).isEqualTo(2);
    }

    @Test
    void aisseeGuideNoLongerCarriesTheEarlierCycle() throws IOException {
        String migration = read(MIGRATION);
        assertThat(migration).contains("born 01.04.2015 to 31.03.2017", "born 01.04.2012 to 31.03.2014", "2 December 2026")
                .doesNotContain("31.03.2026", "Not as of 25 October 2026", "AISSEE-2026 application fee");
    }

    private static String read(String path) throws IOException {
        try (InputStream in = ExamSeedMigrationTest.class.getClassLoader().getResourceAsStream(path)) {
            assertThat(in).as(path).isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
