package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(@NotBlank @Size(max = 100) String token, @NotBlank @Size(max = 128) String newPassword) {
}
