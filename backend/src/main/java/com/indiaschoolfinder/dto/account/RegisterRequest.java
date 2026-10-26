package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Only what an account needs; state and city are optional preferences for search defaults. */
public record RegisterRequest(
        @NotBlank @Size(max = 80) String displayName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 128) String password,
        @AssertTrue(message = "please accept the Terms of Service and Privacy Policy") boolean acceptTerms,
        @Pattern(regexp = "[A-Z]{2}") String stateCode,
        @Size(max = 80) String city) {
}
