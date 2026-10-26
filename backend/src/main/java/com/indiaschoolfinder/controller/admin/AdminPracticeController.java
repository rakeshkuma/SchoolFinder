package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.service.PracticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "Admin: practice", description = "Import practice quizzes and mock tests (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin/practice-sets")
public class AdminPracticeController {

    private final PracticeService practiceService;

    public AdminPracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @Operation(summary = "Create or replace practice sets from the JSON import format")
    @PostMapping("/import")
    public Map<String, List<String>> importSets(@Valid @RequestBody PracticeImportRequest request) {
        return Map.of("slugs", practiceService.importSets(request));
    }
}
