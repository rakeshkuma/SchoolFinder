package com.indiaschoolfinder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.util.SchoolNames;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Development tool: applies a board-list naming change to schools already in the database started by
 * LocalDevApplication (CSV updates never rename). Each entry in the JSON file is
 * {"affiliation": "...", "from": "old list name", "to": "new list name"}. A CBSE school with that affiliation number is
 * renamed only while it still carries the old list name (ignoring case, spacing and punctuation), so a name a person
 * chose is never touched; the new name is tidied as the import tidies it. Without "apply" it only prints the changes.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalRenameSchools
 *   -Dspring-boot.run.arguments="renames.json apply"</pre>
 */
public final class LocalRenameSchools {

    private LocalRenameSchools() {
    }

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalRenameSchools <renames.json> [apply]");
        }
        boolean apply = args.length > 1 && "apply".equals(args[1]);
        JsonNode renames = new ObjectMapper().readTree(new File(args[0]));
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-rename-tool-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run()) {
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            int[] counts = new int[3];
            ctx.getBean(TransactionTemplate.class).executeWithoutResult(tx -> {
                for (JsonNode r : renames) {
                    String affiliation = r.get("affiliation").asText();
                    List<Map<String, Object>> rows = jdbc.queryForList(
                            "SELECT id, name FROM school WHERE education_board_code = 'CBSE' AND affiliation_number = ?", affiliation);
                    if (rows.isEmpty()) {
                        counts[2]++;
                        continue;
                    }
                    long id = ((Number) rows.get(0).get("id")).longValue();
                    String current = (String) rows.get(0).get("name");
                    String next = SchoolNames.tidy(r.get("to").asText());
                    if (key(current).equals(key(next))) {
                        continue; // already renamed
                    }
                    if (!key(current).equals(key(SchoolNames.tidy(r.get("from").asText())))) {
                        System.out.printf("KEEP %d \"%s\" (not the list name; chosen by a person)%n", id, current);
                        counts[1]++;
                        continue;
                    }
                    System.out.printf("%s %d \"%s\" -> \"%s\"%n", apply ? "RENAME" : "would rename", id, current, next);
                    if (apply) {
                        jdbc.update("UPDATE school SET name = ? WHERE id = ?", next, id);
                    }
                    counts[0]++;
                }
            });
            System.out.printf("%n%d %s, %d kept, %d not in the database%n", counts[0], apply ? "renamed" : "to rename",
                    counts[1], counts[2]);
        }
    }

    private static String key(String name) {
        return name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
