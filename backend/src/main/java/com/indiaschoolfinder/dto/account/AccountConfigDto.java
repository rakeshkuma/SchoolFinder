package com.indiaschoolfinder.dto.account;

/** What the sign-in page may offer on this server: Google sign-in when a Google client is configured. */
public record AccountConfigDto(boolean googleSignInEnabled, String termsVersion) {
}
