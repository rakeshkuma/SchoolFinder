package com.indiaschoolfinder.config;

import com.indiaschoolfinder.dto.exam.ExamImportRequest;
import com.indiaschoolfinder.repository.ExamRepository;
import com.indiaschoolfinder.service.ExamService;
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

/**
 * Loads the verified exam catalogue (seed/exams.json) into an empty database, through the same validated import used
 * by editors. Later changes go through the admin import, so a restart never overwrites edited records.
 */
@Slf4j
@Component
public class ExamCatalogLoader implements ApplicationRunner {

    private final ExamRepository examRepository;
    private final ExamService examService;
    private final ResourceLoader resourceLoader;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public ExamCatalogLoader(ExamRepository examRepository, ExamService examService, ResourceLoader resourceLoader,
                             AppProperties properties, ObjectMapper objectMapper, Validator validator) {
        this.examRepository = examRepository;
        this.examService = examService;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!properties.getExams().isSeedOnEmpty() || examRepository.count() > 0) {
            return;
        }
        Resource resource = resourceLoader.getResource(properties.getExams().getSeedLocation());
        if (!resource.exists()) {
            log.warn("Exam catalogue not found at {}", properties.getExams().getSeedLocation());
            return;
        }
        ExamImportRequest request;
        try (InputStream in = resource.getInputStream()) {
            request = objectMapper.readValue(in, ExamImportRequest.class);
        }
        Set<ConstraintViolation<ExamImportRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            log.error("Exam catalogue rejected: {}", violations);
            return;
        }
        var result = examService.importExams(request);
        log.info("Exam catalogue loaded: {} exams", result.created());
    }
}
