package com.indiaschoolfinder;

import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.ImageRequest;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.service.SchoolImageService;
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
import java.util.stream.Collectors;

/**
 * Development tool: registers licensed images from a file like tools/seed/curated-images.json
 * ({"schools": [{"slug": ..., "images": [ImageRequest, ...]}]}) in the local database, with the same validation and
 * licence checks as the admin API. Images whose URL a school already has are skipped, so it can be re-run.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalImageImport
 *   -Dspring-boot.run.arguments="path/to/curated-images.json"</pre>
 * Development only; production uses tools/seed/import-to-server.js.
 */
public final class LocalImageImport {

    private LocalImageImport() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            throw new IllegalArgumentException("usage: LocalImageImport <images.json>");
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
            SchoolImageService images = ctx.getBean(SchoolImageService.class);
            int added = 0;
            int skipped = 0;
            int failed = 0;
            for (JsonNode school : mapper.readTree(Files.readString(Path.of(args[0]))).get("schools")) {
                String slug = school.get("slug").asText();
                Long id;
                try {
                    id = schools.getActiveBySlug(slug).id();
                } catch (ResourceNotFoundException e) {
                    System.out.printf("  %s: no active school with this slug%n", slug);
                    failed += school.get("images").size();
                    continue;
                }
                Set<String> existing = images.listAll(id).stream().map(ImageDto::url).collect(Collectors.toSet());
                for (JsonNode node : school.get("images")) {
                    ImageRequest request = mapper.treeToValue(node, ImageRequest.class);
                    Set<ConstraintViolation<ImageRequest>> violations = validator.validate(request);
                    if (!violations.isEmpty()) {
                        failed++;
                        violations.forEach(v -> System.out.printf("  %s %s: %s%n", slug, v.getPropertyPath(), v.getMessage()));
                    } else if (existing.contains(request.url().trim())) {
                        skipped++;
                    } else {
                        try {
                            images.register(id, request);
                            added++;
                        } catch (RuntimeException e) {
                            failed++;
                            System.out.printf("  %s: %s%n", slug, e.getMessage());
                        }
                    }
                }
            }
            System.out.printf("%nIMAGES added=%d skipped=%d failed=%d%n", added, skipped, failed);
        }
    }
}
