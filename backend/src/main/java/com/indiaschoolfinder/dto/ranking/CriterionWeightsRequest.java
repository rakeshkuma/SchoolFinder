package com.indiaschoolfinder.dto.ranking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/** Replaces criterion weights; the active weights must sum to exactly 100. */
public record CriterionWeightsRequest(@NotEmpty List<@Valid Weight> weights) {

    public record Weight(
            @NotBlank String code,
            @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal weight,
            Boolean active) {
    }
}
