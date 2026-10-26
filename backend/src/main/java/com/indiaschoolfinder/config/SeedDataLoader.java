package com.indiaschoolfinder.config;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.admission.AdmissionRequest;
import com.indiaschoolfinder.dto.fee.FeeRequest;
import com.indiaschoolfinder.dto.school.ImageRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.CsvImportService;
import com.indiaschoolfinder.service.FeeService;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.service.SchoolImageService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Development convenience: when app.seed.enabled=true and the database has no schools, loads the
 * source-linked seed CSV through the same validated import used by administrators, then the
 * source-linked fee and admission payloads (seed/fees-and-admissions.json) through the same
 * services and validation rules as the admin API.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class SeedDataLoader implements ApplicationRunner {

    private final SchoolRepository schoolRepository;
    private final CsvImportService importService;
    private final FeeService feeService;
    private final AdmissionService admissionService;
    private final SchoolImageService imageService;
    private final RankingService rankingService;
    private final ResourceLoader resourceLoader;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public SeedDataLoader(SchoolRepository schoolRepository, CsvImportService importService, FeeService feeService,
                          AdmissionService admissionService, SchoolImageService imageService, RankingService rankingService,
                          ResourceLoader resourceLoader, AppProperties properties, ObjectMapper objectMapper, Validator validator) {
        this.imageService = imageService;
        this.schoolRepository = schoolRepository;
        this.importService = importService;
        this.feeService = feeService;
        this.admissionService = admissionService;
        this.rankingService = rankingService;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (schoolRepository.count() > 0) {
            return;
        }
        Resource resource = resourceLoader.getResource(properties.getSeed().getCsvLocation());
        if (!resource.exists()) {
            log.warn("Seed CSV not found at {}", properties.getSeed().getCsvLocation());
            return;
        }
        try (InputStream in = resource.getInputStream()) {
            CsvImportResult result = importService.importSchools(in, CsvImportService.Mode.ALL_OR_NOTHING, false);
            log.info("Seed import: {} rows, {} created, committed={}, errors={}",
                    result.totalRows(), result.created(), result.committed(), result.errors());
        }
        loadFeesAndAdmissions();
        loadImages();
        rankingService.recalculate(null);
    }

    private void loadImages() throws Exception {
        Resource resource = resourceLoader.getResource(properties.getSeed().getImagesLocation());
        if (!resource.exists()) {
            return;
        }
        JsonNode data;
        try (InputStream in = resource.getInputStream()) {
            data = objectMapper.readTree(in);
        }
        Map<String, Long> idByName = schoolRepository.findAll().stream()
                .collect(Collectors.toMap(School::getName, School::getId, (a, b) -> a));
        int loaded = 0;
        for (JsonNode school : data.path("schools")) {
            Long id = idByName.get(school.path("schoolName").asText());
            if (id == null) {
                log.warn("Seed images: school '{}' not found", school.path("schoolName").asText());
                continue;
            }
            for (JsonNode node : school.path("images")) {
                if (load(node, ImageRequest.class, r -> imageService.register(id, r))) loaded++;
            }
        }
        log.info("Seed images: {} loaded", loaded);
    }

    private void loadFeesAndAdmissions() throws Exception {
        Resource resource = resourceLoader.getResource(properties.getSeed().getFeesAndAdmissionsLocation());
        if (!resource.exists()) {
            return;
        }
        JsonNode data;
        try (InputStream in = resource.getInputStream()) {
            data = objectMapper.readTree(in);
        }
        Map<String, Long> idByName = schoolRepository.findAll().stream()
                .collect(Collectors.toMap(School::getName, School::getId, (a, b) -> a));
        int fees = 0;
        int admissions = 0;
        int skipped = 0;
        for (JsonNode school : data.path("schools")) {
            Long id = idByName.get(school.path("schoolName").asText());
            if (id == null) {
                log.warn("Seed fees/admissions: school '{}' not found", school.path("schoolName").asText());
                continue;
            }
            for (JsonNode node : school.path("fees")) {
                if (load(node, FeeRequest.class, r -> feeService.upsert(id, r))) fees++; else skipped++;
            }
            for (JsonNode node : school.path("admissions")) {
                if (load(node, AdmissionRequest.class, r -> admissionService.upsert(id, r))) admissions++; else skipped++;
            }
        }
        log.info("Seed fees/admissions: {} fee schedules, {} admission cycles, {} skipped", fees, admissions, skipped);
    }

    private <T> boolean load(JsonNode node, Class<T> type, Function<T, ?> save) {
        try {
            T request = objectMapper.treeToValue(node, type);
            Set<ConstraintViolation<T>> violations = validator.validate(request);
            if (!violations.isEmpty()) {
                log.warn("Seed {} rejected: {}", type.getSimpleName(), violations);
                return false;
            }
            save.apply(request);
            return true;
        } catch (Exception e) {
            log.warn("Seed {} failed: {}", type.getSimpleName(), e.getMessage());
            return false;
        }
    }
}
