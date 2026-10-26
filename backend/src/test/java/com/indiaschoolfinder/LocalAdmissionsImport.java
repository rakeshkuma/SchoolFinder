package com.indiaschoolfinder;

import com.indiaschoolfinder.dto.admission.AdmissionRequest;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.service.AdmissionService;
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
 * Development tool: loads admission cycles from a file like tools/seed/jnv-admissions.json
 * ({"schools": [{"slug": ..., "admissions": [AdmissionRequest, ...]}]}) into the local database, with the same
 * validation as POST /api/v1/admin/schools/{id}/admissions. A cycle is keyed by school, class, year and category, so
 * loading a file again updates it rather than adding a copy.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalAdmissionsImport
 *   -Dspring-boot.run.arguments="path/to/jnv-admissions.json"</pre>
 * Development only; production uses tools/seed/import-to-server.js.
 */
public final class LocalAdmissionsImport {

    private LocalAdmissionsImport() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalAdmissionsImport <admissions.json>");
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
            AdmissionService admissions = ctx.getBean(AdmissionService.class);
            int applied = 0;
            int failed = 0;
            String json = Files.readString(Path.of(args[0])).replaceFirst("^﻿", "");
            for (JsonNode school : mapper.readTree(json).get("schools")) {
                String slug = school.get("slug").asText();
                Long id;
                try {
                    id = schools.getActiveBySlug(slug).id();
                } catch (ResourceNotFoundException e) {
                    failed += school.get("admissions").size();
                    System.out.printf("  %s: no active school with this slug%n", slug);
                    continue;
                }
                for (JsonNode node : school.get("admissions")) {
                    AdmissionRequest request = mapper.treeToValue(node, AdmissionRequest.class);
                    Set<ConstraintViolation<AdmissionRequest>> violations = validator.validate(request);
                    if (!violations.isEmpty()) {
                        failed++;
                        violations.forEach(v -> System.out.printf("  %s %s: %s%n", slug, v.getPropertyPath(), v.getMessage()));
                        continue;
                    }
                    try {
                        admissions.upsert(id, request);
                        applied++;
                    } catch (RuntimeException e) {
                        failed++;
                        System.out.printf("  %s: %s%n", slug, e.getMessage());
                    }
                }
            }
            System.out.printf("%nADMISSIONS applied=%d failed=%d%n", applied, failed);
        }
    }
}
