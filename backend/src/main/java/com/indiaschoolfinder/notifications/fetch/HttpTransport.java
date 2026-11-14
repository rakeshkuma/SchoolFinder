package com.indiaschoolfinder.notifications.fetch;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.time.Duration;

/**
 * One HTTP GET without following redirects, reading at most {@code maxBytes} of the body. The fetch session adds the
 * rules (allowlist, retries, robots.txt, pacing) on top, and tests replace this with canned answers.
 */
public interface HttpTransport {

    record Response(int status, String location, String contentType, byte[] body, boolean truncated) {
    }

    Response get(URI uri, String userAgent, Duration timeout, long maxBytes) throws IOException, InterruptedException;

    /** Looks up a host's addresses (replaceable in tests). */
    default InetAddress[] resolve(String host) throws UnknownHostException {
        return InetAddress.getAllByName(host);
    }
}
