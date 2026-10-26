package com.indiaschoolfinder.dto.fee;

import com.indiaschoolfinder.validation.AcademicYear;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Calculator input: up to four school/class selections with optional services. */
public record FeeCalculationRequest(
        @NotEmpty @Size(max = 4, message = "compare at most 4 schools") List<@Valid Selection> selections,
        @AcademicYear String academicYear) {

    public record Selection(
            @NotNull Long schoolId,
            @NotBlank @Size(max = 20) String classCode,
            boolean includeTransport,
            @Min(1) @Max(12) Integer transportMonths,
            boolean includeBooksAndUniform) {
    }
}
