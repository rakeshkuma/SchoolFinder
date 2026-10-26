package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.Size;

/**
 * Deleting an account asks for the password again (re-authentication). Members without a password type their email
 * address instead and must have signed in with Google within the last few minutes.
 */
public record DeleteAccountRequest(@Size(max = 128) String password, @Size(max = 254) String confirmEmail) {
}
