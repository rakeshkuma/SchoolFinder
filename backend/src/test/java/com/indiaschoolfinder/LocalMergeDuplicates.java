package com.indiaschoolfinder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.Objects;

/**
 * Development tool: folds a board-list record into the older curated record for the same school, in the database
 * started by LocalDevApplication. Each pair in the JSON file is {"keep": id, "remove": id, "affiliation": "..."}:
 * the duplicate is deleted (its child rows cascade) and its board and affiliation number move to the kept record,
 * so later board imports match it. A pair is applied only when the kept record has no affiliation number, the
 * removed one has exactly the expected number, and both share a state and PIN code; anything else is reported and
 * skipped. Without "apply" as the second argument it only prints what it would do.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalMergeDuplicates
 *   -Dspring-boot.run.arguments="pairs.json apply"</pre>
 */
public final class LocalMergeDuplicates {

    private LocalMergeDuplicates() {
    }

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalMergeDuplicates <pairs.json> [apply]");
        }
        boolean apply = args.length > 1 && "apply".equals(args[1]);
        JsonNode pairs = new ObjectMapper().readTree(new File(args[0]));
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-merge-tool-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run()) {
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            int[] counts = new int[2];
            ctx.getBean(TransactionTemplate.class).executeWithoutResult(tx -> {
                for (JsonNode pair : pairs) {
                    long keepId = pair.get("keep").asLong();
                    long removeId = pair.get("remove").asLong();
                    String affiliation = pair.get("affiliation").asText();
                    Map<String, Object> keep = row(jdbc, keepId);
                    Map<String, Object> remove = row(jdbc, removeId);
                    String problem = keep == null || remove == null ? "record missing"
                            : keep.get("affiliation_number") != null ? "kept record already has an affiliation number"
                            : !affiliation.equals(remove.get("affiliation_number")) ? "affiliation number differs"
                            : !Objects.equals(keep.get("state_code"), remove.get("state_code"))
                                    || !Objects.equals(keep.get("pin_code"), remove.get("pin_code")) ? "place differs"
                            : null;
                    if (problem != null) {
                        System.out.printf("SKIP %d <= %d: %s%n", keepId, removeId, problem);
                        counts[1]++;
                        continue;
                    }
                    System.out.printf("%s %d %s  <=  %d %s (%s)%n", apply ? "MERGE" : "would merge",
                            keepId, keep.get("name"), removeId, remove.get("name"), affiliation);
                    if (apply) {
                        jdbc.update("DELETE FROM school WHERE id = ?", removeId);
                        jdbc.update("""
                                UPDATE school SET affiliation_number = ?,
                                       education_board_code = coalesce(education_board_code, ?) WHERE id = ?""",
                                affiliation, remove.get("education_board_code"), keepId);
                    }
                    counts[0]++;
                }
            });
            System.out.printf("%n%d %s, %d skipped%n", counts[0], apply ? "merged" : "to merge", counts[1]);
        }
    }

    private static Map<String, Object> row(JdbcTemplate jdbc, long id) {
        return jdbc.queryForList("""
                SELECT name, state_code, pin_code, affiliation_number, education_board_code
                FROM school WHERE id = ?""", id).stream().findFirst().orElse(null);
    }
}
