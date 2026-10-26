package com.indiaschoolfinder.security;

import org.springframework.security.core.AuthenticatedPrincipal;

import java.io.Serializable;

/**
 * The signed-in member stored in the server-side session. Only the account id is kept; everything else is read
 * from the database on each request. getName() is the session's principal name, used to find and revoke all of a
 * member's sessions (password reset, account deletion).
 */
public record MemberPrincipal(long accountId) implements AuthenticatedPrincipal, Serializable {

    public static String nameOf(long accountId) {
        return "member:" + accountId;
    }

    @Override
    public String getName() {
        return nameOf(accountId);
    }
}
