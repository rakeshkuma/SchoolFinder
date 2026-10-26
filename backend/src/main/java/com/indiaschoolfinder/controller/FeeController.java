package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.fee.FeeCalculationRequest;
import com.indiaschoolfinder.dto.fee.FeeComparisonDto;
import com.indiaschoolfinder.dto.fee.FeeEstimate;
import com.indiaschoolfinder.service.FeeService;
import com.indiaschoolfinder.validation.AcademicYear;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Fees", description = "Fee comparison and cost calculator")
@RestController
@RequestMapping("/api/v1/fees")
public class FeeController {

    private final FeeService feeService;

    public FeeController(FeeService feeService) {
        this.feeService = feeService;
    }

    @Operation(summary = "Compare official fees of up to 4 schools for one class and the same academic year")
    @GetMapping("/compare")
    public FeeComparisonDto compare(@RequestParam @NotEmpty @Size(max = 4) List<Long> schoolIds,
                                    @RequestParam @NotBlank String classCode,
                                    @RequestParam(required = false) @AcademicYear String academicYear) {
        return feeService.compare(schoolIds, classCode, academicYear);
    }

    @Operation(summary = "Estimate first-year and recurring costs",
            description = "Shows each component, whether it is official or an estimate, refundable deposits, and the formula used.")
    @PostMapping("/calculate")
    public List<FeeEstimate> calculate(@Valid @RequestBody FeeCalculationRequest request) {
        return feeService.calculate(request);
    }
}
