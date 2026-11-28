package com.indiaschoolfinder.dto.account;

import java.time.Instant;

/**
 * The signed-in member as the UI sees them: no hashes, tokens or internal ids. {@code googleLinked} says whether the
 * account is linked to a Google account (true for every account that has signed in since sign-in became Google-only).
 */
public record AccountDto(String email, String displayName, boolean emailVerified, String stateCode, String city,
                         Instant createdAt, String termsVersion, boolean googleLinked, String mobile,
                         String pictureUrl) {
}
