package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Only what an account needs; state and city are optional preferences for search defaults, and the mobile number is
 * optional. {@code website} is a honeypot that people never see or fill.
 */
public record RegisterRequest(
        @NotBlank @Size(max = 80) String displayName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 128) String password,
        @AssertTrue(message = "please accept the Terms of Service and Privacy Policy") boolean acceptTerms,
        @Pattern(regexp = "[A-Z]{2}") String stateCode,
        @Size(max = 80) String city,
        @Pattern(regexp = "|(\\+91[ -]?)?[6-9][0-9]{9}", message = "enter a 10-digit Indian mobile number") String mobile,
        @Size(max = 200) String website) {
}
