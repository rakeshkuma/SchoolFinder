package com.indiaschoolfinder;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Runs the backend locally without Docker or an installed PostgreSQL:
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalDevApplication</pre>
 * Starts real PostgreSQL binaries on port 54329 with data kept in target/local-pg, then boots the
 * app with the "dev" profile (seed CSV loaded on first start). If JWT_SECRET or the bootstrap admin
 * variables are not set, random values are generated for this run and the admin password is printed.
 * Development only — never used in production.
 */
public final class LocalDevApplication {

    private LocalDevApplication() {
    }

    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of("target", "local-pg");
        Files.createDirectories(dataDir);
        EmbeddedPostgres pg = EmbeddedPostgres.builder()
                .setPort(Integer.getInteger("isf.pg.port", 54329))
                .setDataDirectory(dataDir)
                .setCleanDataDirectory(false)
                .start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                pg.close();
            } catch (Exception ignored) {
                // shutting down
            }
        }));

        System.setProperty("spring.datasource.url", pg.getJdbcUrl("postgres", "postgres"));
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("spring.profiles.active", System.getProperty("spring.profiles.active", "dev"));

        SecureRandom random = new SecureRandom();
        if (isBlank(System.getenv("JWT_SECRET"))) {
            byte[] secret = new byte[48];
            random.nextBytes(secret);
            System.setProperty("app.jwt.secret", Base64.getEncoder().encodeToString(secret));
        }
        if (isBlank(System.getenv("ADMIN_BOOTSTRAP_PASSWORD"))) {
            byte[] pw = new byte[12];
            random.nextBytes(pw);
            String password = Base64.getUrlEncoder().withoutPadding().encodeToString(pw);
            System.setProperty("app.admin.bootstrap-username", "admin");
            System.setProperty("app.admin.bootstrap-password", password);
            System.out.println("""

                    ================================================================
                     Local development admin (created only if no admin exists yet):
                       username: admin
                       password: %s
                    ================================================================
                    """.formatted(password));
        }
        SpringApplication.run(IndiaSchoolFinderApplication.class, args);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
