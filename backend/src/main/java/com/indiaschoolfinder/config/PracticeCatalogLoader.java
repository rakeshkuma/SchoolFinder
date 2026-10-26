package com.indiaschoolfinder.config;

import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.repository.PracticeSetRepository;
import com.indiaschoolfinder.service.PracticeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Set;

/** Loads seed/practice.json into an empty database through the editors' import; like {@link ExamCatalogLoader}. */
@Slf4j
@Component
public class PracticeCatalogLoader implements ApplicationRunner {

    private final PracticeSetRepository repository;
    private final PracticeService practiceService;
    private final ResourceLoader resourceLoader;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public PracticeCatalogLoader(PracticeSetRepository repository, PracticeService practiceService, ResourceLoader resourceLoader,
                                 AppProperties properties, ObjectMapper objectMapper, Validator validator) {
        this.repository = repository;
        this.practiceService = practiceService;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!properties.getExams().isSeedOnEmpty() || repository.count() > 0) {
            return;
        }
        Resource resource = resourceLoader.getResource(properties.getExams().getPracticeSeedLocation());
        if (!resource.exists()) {
            return;
        }
        PracticeImportRequest request;
        try (InputStream in = resource.getInputStream()) {
            request = objectMapper.readValue(in, PracticeImportRequest.class);
        }
        Set<ConstraintViolation<PracticeImportRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            log.error("Practice catalogue rejected: {}", violations);
            return;
        }
        log.info("Practice sets loaded: {}", practiceService.importSets(request).size());
    }
}
