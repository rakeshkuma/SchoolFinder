package com.indiaschoolfinder;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.service.CsvImportService;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Development tool: imports a CSV (or a .json file, see {@link CsvImportService#importJson}) into a running local database through the same validated
 * {@link CsvImportService} the admin CSV page uses (validation, duplicate rules, audit log).
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalCsvImport
 *   -Dspring-boot.run.arguments="path/to/file.csv VALID_ROWS_ONLY true"</pre>
 * The optional third argument (updateExisting) updates schools already present instead of reporting them.
 * Connects to the embedded PostgreSQL started by {@link LocalDevApplication} (port 54329 by default).
 * Mode defaults to VALIDATE_ONLY. Development only — never used in production.
 */
public final class LocalCsvImport {

    private LocalCsvImport() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalCsvImport <file.csv> [VALIDATE_ONLY|ALL_OR_NOTHING|VALID_ROWS_ONLY]");
        }
        Path file = Path.of(args[0]);
        CsvImportService.Mode mode = args.length > 1 ? CsvImportService.Mode.valueOf(args[1]) : CsvImportService.Mode.VALIDATE_ONLY;
        boolean updateExisting = args.length > 2 && Boolean.parseBoolean(args[2]);
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-import-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");

        // The security configuration needs a servlet context; a random port keeps it off the dev server's port.
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run();
             InputStream in = Files.newInputStream(file)) {
            CsvImportService service = ctx.getBean(CsvImportService.class);
            CsvImportResult result = file.toString().toLowerCase().endsWith(".json")
                    ? service.importJson(in, mode, updateExisting)
                    : service.importSchools(in, mode, updateExisting);
            System.out.printf("%nIMPORT %s: rows=%d valid=%d created=%d updated=%d skipped=%d committed=%s errors=%d%n",
                    result.mode(), result.totalRows(), result.validRows(), result.created(), result.updated(),
                    result.skipped(), result.committed(), result.errors().size());
            result.errors().stream().limit(40).forEach(e ->
                    System.out.printf("  row %d %s: %s%n", e.row(), e.field(), e.message()));
        }
    }
}
