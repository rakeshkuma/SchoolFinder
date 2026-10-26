package com.indiaschoolfinder.dto.account;

/** What the sign-in pages may offer on this server. */
public record AccountConfigDto(boolean emailDeliveryConfigured, String emailDeliveryMode, boolean googleSignInEnabled,
                               String passwordPolicy, String termsVersion) {
}
