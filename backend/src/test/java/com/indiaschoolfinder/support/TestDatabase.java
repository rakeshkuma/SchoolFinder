package com.indiaschoolfinder.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * One real PostgreSQL per test JVM. Uses Testcontainers when Docker is available (as in CI);
 * otherwise falls back to embedded PostgreSQL binaries so tests also run on machines without Docker.
 * Force a mode with -Disf.test.db=testcontainers|embedded.
 */
public final class TestDatabase {

    public record Connection(String url, String username, String password, String engine) {
    }

    private static Connection instance;

    private TestDatabase() {
    }

    public static synchronized Connection get() {
        if (instance == null) {
            instance = start();
        }
        return instance;
    }

    private static Connection start() {
        String mode = System.getProperty("isf.test.db", "auto");
        boolean useContainers = mode.equals("testcontainers") || (mode.equals("auto") && dockerAvailable());
        if (useContainers) {
            PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("isf_test").withUsername("isf").withPassword("isf");
            container.start();
            return new Connection(container.getJdbcUrl(), container.getUsername(), container.getPassword(), "testcontainers");
        }
        try {
            EmbeddedPostgres pg = EmbeddedPostgres.builder().start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    pg.close();
                } catch (IOException ignored) {
                    // JVM is exiting.
                }
            }));
            return new Connection(pg.getJdbcUrl("postgres", "postgres"), "postgres", "postgres", "embedded");
        } catch (IOException e) {
            throw new UncheckedIOException("Could not start embedded PostgreSQL", e);
        }
    }

    private static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }
}
