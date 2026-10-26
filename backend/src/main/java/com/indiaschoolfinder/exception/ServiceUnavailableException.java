package com.indiaschoolfinder.exception;

/** An optional external integration (e.g. Cloudinary) is not configured or failed. */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
