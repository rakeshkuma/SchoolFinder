package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.validation.AcademicYear;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Admissions", description = "Admission cycles, deadlines and notifications")
@RestController
@RequestMapping("/api/v1/admissions")
public class AdmissionController {

    private final AdmissionService admissionService;

    public AdmissionController(AdmissionService admissionService) {
        this.admissionService = admissionService;
    }

    @Operation(summary = "Admission cycles with filters", description = "sortBy: updated (latest notifications, default), deadline, start")
    @GetMapping
    public PageResponse<AdmissionDto> list(@RequestParam(required = false) @AcademicYear String academicYear,
                                           @RequestParam(required = false) AdmissionStatus status,
                                           @RequestParam(required = false) AdmissionCategory category,
                                           @RequestParam(required = false) String classCode,
                                           @RequestParam(required = false) com.indiaschoolfinder.enums.SchoolNetwork excludeNetwork,
                                           @RequestParam(required = false) String sortBy,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return admissionService.list(academicYear, status, category, classCode, excludeNetwork, sortBy, page, size);
    }

    @Operation(summary = "Upcoming and currently open admissions, nearest deadline first")
    @GetMapping("/upcoming")
    public PageResponse<AdmissionDto> upcoming(@RequestParam(defaultValue = "0") @Min(0) int page,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return admissionService.upcoming(page, size);
    }

    @GetMapping("/{id}")
    public AdmissionDto get(@PathVariable Long id) {
        return admissionService.get(id);
    }

    @GetMapping("/school/{schoolId}")
    public List<AdmissionDto> bySchool(@PathVariable Long schoolId) {
        return admissionService.bySchool(schoolId);
    }
}
