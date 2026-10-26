package com.indiaschoolfinder.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** An absolute http(s) URL with a host. Null is valid (combine with @NotBlank when required). */
@Documented
@Constraint(validatedBy = HttpUrlValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
public @interface HttpUrl {

    String message() default "must be a valid http(s) URL";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
