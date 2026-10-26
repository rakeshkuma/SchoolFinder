package com.indiaschoolfinder.exception;

import org.springframework.http.HttpStatus;

/**
 * A member-account outcome the UI acts on, with a stable code in the error body's "error" field
 * (e.g. EMAIL_NOT_VERIFIED). Messages are written for members and reveal no security details.
 */
public class AccountException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public AccountException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
