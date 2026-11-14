package com.indiaschoolfinder.notifications.fetch;

/** A request the checker did not make or that did not succeed. The message never contains response bodies. */
public class FetchException extends Exception {

    public enum Kind {
        /** Refused by our own rules (not https, host not allowed, private address, too many redirects). */
        POLICY,
        /** robots.txt asks automated clients not to fetch the page. */
        ROBOTS,
        /** The site refused the request (401, 403, 451): reported, never worked around. */
        BLOCKED,
        /** Another error status after any retries. */
        HTTP_STATUS,
        /** The answer was larger than allowed. */
        TOO_LARGE,
        /** Network error or timeout after all retries. */
        NETWORK,
        /** The run is stopping (server shutdown). */
        STOPPED
    }

    private final Kind kind;
    private final int status;

    public FetchException(Kind kind, String message) {
        this(kind, message, 0, null);
    }

    public FetchException(Kind kind, String message, int status, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.status = status;
    }

    public Kind kind() {
        return kind;
    }

    public int status() {
        return status;
    }
}
