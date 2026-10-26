package com.indiaschoolfinder.dto.account;

import java.time.Instant;

/**
 * The signed-in member as the UI sees them: no hashes, tokens or internal ids. {@code hasPassword} is false for
 * members who signed up with Google and have not set a password; {@code googleLinked} says whether Google sign-in
 * works for this account.
 */
public record AccountDto(String email, String displayName, boolean emailVerified, String stateCode, String city,
                         Instant createdAt, String termsVersion, boolean hasPassword, boolean googleLinked) {
}
