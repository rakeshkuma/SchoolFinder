package com.indiaschoolfinder.notifications.fetch;

import com.indiaschoolfinder.notifications.NotificationSyncProperties;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpTimeoutException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.BooleanSupplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Requests for one source during one run. Every request (and every redirect hop) is checked against the source's host
 * allowlist and must resolve to a public address; robots.txt is read once per host and obeyed; requests to a host are
 * spaced out; network errors, 429 and 5xx answers are retried with a growing wait; 4xx answers are not retried, and a
 * refusal (401/403/451) is reported as BLOCKED, never worked around. Bodies above the size limit are refused.
 */
public class FetchSession {

    /** Waits (replaceable in tests so they do not sleep). */
    public interface Sleeper {
        void sleep(Duration d) throws InterruptedException;
    }

    public record Page(URI uri, int status, String contentType, byte[] body) {

        public Charset charset() {
            if (contentType != null) {
                Matcher m = Pattern.compile("charset=\"?([\\w.:-]+)", Pattern.CASE_INSENSITIVE).matcher(contentType);
                if (m.find()) {
                    try {
                        return Charset.forName(m.group(1));
                    } catch (RuntimeException ignored) {
                        // unknown charset name: fall through
                    }
                }
            }
            return null;
        }

        public String text() {
            Charset c = charset();
            return new String(body, c == null ? StandardCharsets.UTF_8 : c);
        }

        /** Parsed HTML; links resolve against the page's own address. */
        public Document html() {
            try {
                Charset c = charset();
                return Jsoup.parse(new ByteArrayInputStream(body), c == null ? null : c.name(), uri.toString());
            } catch (IOException e) {
                throw new IllegalStateException(e); // reading from memory does not fail
            }
        }
    }

    private static final String ROBOTS_TOKEN = "SchoolDhundoBot";

    private final NotificationSyncProperties.Http config;
    private final HttpTransport transport;
    private final Sleeper sleeper;
    private final Set<String> allowedHosts;
    private final BooleanSupplier stopping;
    private final Map<String, RobotsRules> robots = new HashMap<>();
    private final Map<String, Long> lastRequestAt = new HashMap<>();
    private int requests;

    public FetchSession(NotificationSyncProperties.Http config, HttpTransport transport, Sleeper sleeper,
                        Set<String> allowedHosts, BooleanSupplier stopping) {
        this.config = config;
        this.transport = transport;
        this.sleeper = sleeper;
        this.allowedHosts = Set.copyOf(allowedHosts.stream().map(h -> h.toLowerCase(Locale.ROOT)).toList());
        this.stopping = stopping;
    }

    /** HTTP requests made so far, robots.txt and retries included. */
    public int requests() {
        return requests;
    }

    public Set<String> allowedHosts() {
        return allowedHosts;
    }

    public Page get(String url) throws FetchException, InterruptedException {
        return get(url, config.getMaxBodyBytes());
    }

    public Page get(String url, long maxBytes) throws FetchException, InterruptedException {
        URI uri = UrlPolicy.check(url, allowedHosts);
        for (int hop = 0; ; hop++) {
            checkAddress(uri);
            if (config.isRespectRobots() && !robotsFor(uri).allows(pathAndQuery(uri))) {
                throw new FetchException(FetchException.Kind.ROBOTS, "robots.txt asks automated clients not to fetch " + uri.getPath());
            }
            HttpTransport.Response r = send(uri, maxBytes);
            int s = r.status();
            if (s >= 300 && s < 400 && s != 304) {
                if (r.location() == null || hop >= config.getMaxRedirects()) {
                    throw new FetchException(FetchException.Kind.POLICY, "too many redirects, or a redirect without a target", s, null);
                }
                URI next = uri.resolve(r.location().trim().replace(" ", "%20"));
                uri = UrlPolicy.check(next.toString(), allowedHosts); // the target must be allowed too
                continue;
            }
            if (r.truncated()) {
                throw new FetchException(FetchException.Kind.TOO_LARGE, "answer larger than " + maxBytes + " bytes", s, null);
            }
            if (s == 401 || s == 403 || s == 451) {
                throw new FetchException(FetchException.Kind.BLOCKED, "the site refused automated access (HTTP " + s + ")", s, null);
            }
            if (s < 200 || s >= 300) {
                throw new FetchException(FetchException.Kind.HTTP_STATUS, "HTTP " + s, s, null);
            }
            return new Page(uri, s, r.contentType(), r.body());
        }
    }

    /** One request with retries for network errors, 429 and 5xx. */
    private HttpTransport.Response send(URI uri, long maxBytes) throws FetchException, InterruptedException {
        Duration wait = config.getRetryBackoff();
        int attempts = Math.max(1, config.getMaxAttempts());
        for (int attempt = 1; ; attempt++) {
            if (stopping.getAsBoolean()) {
                throw new FetchException(FetchException.Kind.STOPPED, "stopped: the server is shutting down");
            }
            pace(uri.getHost());
            requests++;
            HttpTransport.Response r;
            try {
                r = transport.get(uri, config.getUserAgent(), config.getRequestTimeout(), maxBytes);
            } catch (HttpTimeoutException e) {
                if (attempt < attempts) {
                    sleeper.sleep(wait);
                    wait = wait.multipliedBy(2);
                    continue;
                }
                throw new FetchException(FetchException.Kind.NETWORK, "timed out after " + attempts + " attempt(s)", 0, e);
            } catch (InterruptedIOException e) {
                throw new InterruptedException("interrupted while fetching");
            } catch (IOException e) {
                if (attempt < attempts) {
                    sleeper.sleep(wait);
                    wait = wait.multipliedBy(2);
                    continue;
                }
                throw new FetchException(FetchException.Kind.NETWORK,
                        "network error after " + attempts + " attempt(s): " + e.getClass().getSimpleName(), 0, e);
            }
            if ((r.status() == 429 || r.status() >= 500) && attempt < attempts) {
                sleeper.sleep(wait);
                wait = wait.multipliedBy(2);
                continue;
            }
            return r;
        }
    }

    private void pace(String host) throws InterruptedException {
        long gap = config.getPerHostInterval().toMillis();
        Long last = lastRequestAt.get(host);
        long now = System.nanoTime() / 1_000_000;
        if (last != null && gap > 0 && now - last < gap) {
            sleeper.sleep(Duration.ofMillis(gap - (now - last)));
        }
        lastRequestAt.put(host, System.nanoTime() / 1_000_000);
    }

    private void checkAddress(URI uri) throws FetchException {
        InetAddress[] addresses;
        try {
            addresses = transport.resolve(uri.getHost());
        } catch (UnknownHostException e) {
            throw new FetchException(FetchException.Kind.NETWORK, "host not found: " + uri.getHost(), 0, e);
        }
        if (addresses.length == 0) {
            throw new FetchException(FetchException.Kind.NETWORK, "host not found: " + uri.getHost());
        }
        for (InetAddress a : addresses) {
            if (!UrlPolicy.isPublic(a)) {
                throw new FetchException(FetchException.Kind.POLICY, "host resolves to a private or reserved address: " + uri.getHost());
            }
        }
    }

    /**
     * robots.txt for the host, read once. A missing file (4xx) means no rules; an HTML page in its place means no rules;
     * a server error or network failure means the host is skipped this run, as crawlers conventionally do.
     */
    private RobotsRules robotsFor(URI uri) throws FetchException, InterruptedException {
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        RobotsRules cached = robots.get(host);
        if (cached != null) {
            return cached;
        }
        URI robotsUri = URI.create("https://" + host + "/robots.txt");
        RobotsRules rules;
        HttpTransport.Response r = send(robotsUri, 512 * 1024);
        int s = r.status();
        if (s >= 200 && s < 300) {
            rules = RobotsRules.parse(new String(r.body(), StandardCharsets.UTF_8), ROBOTS_TOKEN);
        } else if (s >= 300 && s < 500) {
            rules = RobotsRules.allowAll(); // no robots.txt (or one we cannot read without following a redirect)
        } else {
            throw new FetchException(FetchException.Kind.HTTP_STATUS, "robots.txt unavailable (HTTP " + s + "); host skipped", s, null);
        }
        robots.put(host, rules);
        return rules;
    }

    private static String pathAndQuery(URI uri) {
        String p = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
        return uri.getRawQuery() == null ? p : p + "?" + uri.getRawQuery();
    }
}
