package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Email changes are not offered; the address is the sign-in identity and is verified once. */
public record ProfileUpdateRequest(@NotBlank @Size(max = 80) String displayName, @Pattern(regexp = "[A-Z]{2}") String stateCode,
                                   @Size(max = 80) String city) {
}
