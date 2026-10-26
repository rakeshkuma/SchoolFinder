package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.SchoolFact;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Adds or corrects individual facts of a profile, each citing its own source. Only the parts that are present are
 * changed; every other field of the profile is left as it is. {@code clear} retracts facts found to be wrong (the value
 * and its recorded source are removed); a fact cannot be set and cleared in the same request.
 */
public record SchoolFactsRequest(@Valid Classes classes, @Valid Location location, @Valid City city,
                                 @Size(max = 3) List<@NotNull SchoolFact> clear) {

    /** Where a fact was read, and when. */
    public record Source(
            @NotBlank(message = "cite the page that states this fact") @HttpUrl @Size(max = 500) String url,
            @NotNull @PastOrPresent LocalDate retrievedDate,
            @Size(max = 500) String note) {
    }

    /** Every class the source says the school offers (codes such as NURSERY, I, XII). */
    public record Classes(@NotEmpty @Size(max = 15) List<@NotBlank String> codes, @NotNull @Valid Source source) {
    }

    /** India lies roughly within 6–38° N and 68–98° E. */
    public record Location(
            @NotNull @DecimalMin("6.0") @DecimalMax("38.0") Double latitude,
            @NotNull @DecimalMin("68.0") @DecimalMax("98.0") Double longitude,
            @NotNull @Valid Source source) {
    }

    public record City(@NotBlank @Size(max = 100) String name, @NotNull @Valid Source source) {
    }
}
