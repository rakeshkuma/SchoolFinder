package com.indiaschoolfinder;

import com.indiaschoolfinder.dto.school.SchoolFactsRequest;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.service.SchoolFactService;
import com.indiaschoolfinder.service.SchoolService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * Development tool: applies sourced profile facts from a file like tools/seed/school-facts.json
 * ({"schools": [{"slug": ..., "facts": SchoolFactsRequest}]}) to the local database, with the same validation as
 * PATCH /api/v1/admin/schools/{id}/facts. Unchanged facts are left alone, so it can be re-run.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalFactsImport
 *   -Dspring-boot.run.arguments="path/to/school-facts.json"</pre>
 * Development only; production uses tools/seed/import-to-server.js.
 */
public final class LocalFactsImport {

    private LocalFactsImport() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalFactsImport <school-facts.json>");
        }
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-import-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run()) {
            ObjectMapper mapper = ctx.getBean(ObjectMapper.class);
            Validator validator = ctx.getBean(Validator.class);
            SchoolService schools = ctx.getBean(SchoolService.class);
            SchoolFactService facts = ctx.getBean(SchoolFactService.class);
            int applied = 0;
            int failed = 0;
            String json = Files.readString(Path.of(args[0])).replaceFirst("^﻿", ""); // files saved with a BOM
            for (JsonNode school : mapper.readTree(json).get("schools")) {
                String slug = school.get("slug").asText();
                try {
                    Long id = schools.getActiveBySlug(slug).id();
                    SchoolFactsRequest request = mapper.treeToValue(school.get("facts"), SchoolFactsRequest.class);
                    Set<ConstraintViolation<SchoolFactsRequest>> violations = validator.validate(request);
                    if (!violations.isEmpty()) {
                        failed++;
                        violations.forEach(v -> System.out.printf("  %s %s: %s%n", slug, v.getPropertyPath(), v.getMessage()));
                        continue;
                    }
                    facts.update(id, request);
                    applied++;
                } catch (ResourceNotFoundException e) {
                    failed++;
                    System.out.printf("  %s: no active school with this slug%n", slug);
                } catch (RuntimeException e) {
                    failed++;
                    System.out.printf("  %s: %s%n", slug, e.getMessage());
                }
            }
            System.out.printf("%nFACTS applied=%d failed=%d%n", applied, failed);
        }
    }
}
