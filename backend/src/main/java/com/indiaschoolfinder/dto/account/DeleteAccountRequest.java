package com.indiaschoolfinder.dto.account;

import jakarta.validation.constraints.Size;

/** Deleting an account: the member types its email address, and must have signed in with Google within the last few minutes. */
public record DeleteAccountRequest(@Size(max = 254) String confirmEmail) {
}
