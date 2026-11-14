package com.indiaschoolfinder;

import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.service.PracticeService;
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
 * Development tool: loads practice sets from a file in the format of src/main/resources/seed/practice.json (the
 * default) into the local database, with the same validation as POST /api/v1/admin/practice-sets/import. Each set
 * replaces the set with its slug, so loading the file again updates it. The seed loader only fills an empty table;
 * use this after editing the question bank.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalPracticeImport
 *   [-Dspring-boot.run.arguments="path/to/practice.json"]</pre>
 * Development only; production uses POST /api/v1/admin/practice-sets/import.
 */
public final class LocalPracticeImport {

    private LocalPracticeImport() {
    }

    public static void main(String[] args) throws Exception {
        Path file = Path.of(args.length > 0 ? args[0] : "src/main/resources/seed/practice.json");
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
            PracticeImportRequest request = mapper.readValue(Files.readString(file).replaceFirst("^﻿", ""),
                    PracticeImportRequest.class);
            Set<ConstraintViolation<PracticeImportRequest>> violations = ctx.getBean(Validator.class).validate(request);
            if (!violations.isEmpty()) {
                violations.forEach(v -> System.out.printf("  %s: %s%n", v.getPropertyPath(), v.getMessage()));
                throw new IllegalStateException(violations.size() + " problem(s); nothing imported");
            }
            int questions = request.sets().stream().mapToInt(s -> s.content().questions().size()).sum();
            System.out.printf("%nPractice sets imported: %d (%d questions)%n",
                    ctx.getBean(PracticeService.class).importSets(request).size(), questions);
        }
    }
}
