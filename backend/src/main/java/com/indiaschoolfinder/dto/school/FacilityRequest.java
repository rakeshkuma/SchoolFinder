package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FacilityRequest(
        @NotNull FacilityCategory category,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 1000) String description,
        Boolean available,
        @NotBlank(message = "a source URL is required") @HttpUrl String sourceUrl) {
}
