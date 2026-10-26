package com.indiaschoolfinder.exception;

import com.indiaschoolfinder.dto.common.ApiError;

import java.util.List;

/** Request is well formed but violates a business rule (e.g. invalid sort field, weights not summing to 100). */
public class BusinessValidationException extends RuntimeException {

    private final transient List<ApiError.FieldViolation> violations;

    public BusinessValidationException(String message) {
        this(message, List.of());
    }

    public BusinessValidationException(String message, List<ApiError.FieldViolation> violations) {
        super(message);
        this.violations = violations;
    }

    public BusinessValidationException(String field, String message) {
        this(message, List.of(new ApiError.FieldViolation(field, message)));
    }

    public List<ApiError.FieldViolation> getViolations() {
        return violations;
    }
}
