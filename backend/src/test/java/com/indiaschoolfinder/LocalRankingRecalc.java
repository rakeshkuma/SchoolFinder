package com.indiaschoolfinder;

import com.indiaschoolfinder.service.RankingService;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Development tool: recalculates rankings in the running local database, as the admin "Recalculate" action does.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalRankingRecalc</pre>
 * Connects to the embedded PostgreSQL started by {@link LocalDevApplication} (port 54329 by default).
 * Development only — never used in production.
 */
public final class LocalRankingRecalc {

    private LocalRankingRecalc() {
    }

    public static void main(String[] args) {
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-recalc-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        // The security configuration needs a servlet context; a random port keeps it off the dev server's port.
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run()) {
            int rows = ctx.getBean(RankingService.class).recalculate(args.length > 0 ? args[0] : null);
            System.out.printf("%nRECALCULATED scoredSchools=%d%n", rows);
        }
    }
}
