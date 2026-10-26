package com.indiaschoolfinder.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Academic year in the form 2026-27. Null is valid. */
@Documented
@Constraint(validatedBy = AcademicYearValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface AcademicYear {

    String message() default "must be an academic year like 2026-27";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
