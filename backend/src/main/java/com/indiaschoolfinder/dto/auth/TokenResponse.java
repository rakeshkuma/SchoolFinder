package com.indiaschoolfinder.dto.auth;

import com.indiaschoolfinder.enums.AdminRole;

public record TokenResponse(String accessToken, String tokenType, long expiresInSeconds, String username, AdminRole role) {
}
