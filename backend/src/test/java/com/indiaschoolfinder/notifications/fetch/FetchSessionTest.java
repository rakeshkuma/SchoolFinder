package com.indiaschoolfinder.notifications.fetch;

import com.indiaschoolfinder.notifications.NotificationSyncProperties;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The fetch rules, with canned answers instead of the network and no real waiting. */
class FetchSessionTest {

    /** Answers per URL, in order; resolves every host to a public address unless told otherwise. */
    static final class FakeTransport implements HttpTransport {
        final Map<String, Deque<Object>> answers = new HashMap<>();
        final List<String> requested = new ArrayList<>();
        final Map<String, InetAddress[]> dns = new HashMap<>();

        FakeTransport answer(String url, Object... responses) {
            answers.computeIfAbsent(url, k -> new ArrayDeque<>()).addAll(List.of(responses));
            return this;
        }

        @Override
        public Response get(URI uri, String userAgent, Duration timeout, long maxBytes) throws IOException {
            requested.add(uri.toString());
            assertThat(userAgent).startsWith("SchoolDhundoBot/");
            Deque<Object> q = answers.get(uri.toString());
            Object next = q == null || q.isEmpty() ? new Response(404, null, "text/html", new byte[0], false) : q.poll();
            if (next instanceof IOException e) {
                throw e;
            }
            Response r = (Response) next;
            return r.body().length > maxBytes ? new Response(r.status(), r.location(), r.contentType(), new byte[0], true) : r;
        }

        @Override
        public InetAddress[] resolve(String host) throws UnknownHostException {
            InetAddress[] a = dns.get(host);
            return a != null ? a : new InetAddress[] {InetAddress.getByAddress(host, new byte[] {(byte) 164, 100, 1, 1})};
        }
    }

    static HttpTransport.Response ok(String body) {
        return new HttpTransport.Response(200, null, "text/html; charset=utf-8", body.getBytes(StandardCharsets.UTF_8), false);
    }

    static HttpTransport.Response status(int s) {
        return new HttpTransport.Response(s, null, "text/html", new byte[0], false);
    }

    private final List<Duration> waits = new ArrayList<>();

    private FetchSession session(FakeTransport t, NotificationSyncProperties.Http cfg) {
        return new FetchSession(cfg, t, waits::add, Set.of("nta.ac.in", "kvs.gov.in"), () -> false);
    }

    private static NotificationSyncProperties.Http cfg() {
        NotificationSyncProperties.Http c = new NotificationSyncProperties.Http();
        c.setPerHostInterval(Duration.ZERO);
        return c;
    }

    @Test
    void retriesServerErrorsWithGrowingWaitsThenSucceeds() throws Exception {
        FakeTransport t = new FakeTransport()
                .answer("https://nta.ac.in/page", status(503), new IOException("connection reset"), ok("<p>notices</p>"));
        FetchSession s = session(t, cfg());

        assertThat(s.get("https://nta.ac.in/page").text()).contains("notices");
        assertThat(waits).containsExactly(Duration.ofSeconds(3), Duration.ofSeconds(6));
        assertThat(t.requested).containsExactly("https://nta.ac.in/robots.txt", "https://nta.ac.in/page", "https://nta.ac.in/page",
                "https://nta.ac.in/page");
    }

    @Test
    void givesUpAfterTheLastAttempt() {
        FakeTransport t = new FakeTransport().answer("https://nta.ac.in/page", status(500), status(502), status(504));
        assertThatThrownBy(() -> session(t, cfg()).get("https://nta.ac.in/page"))
                .isInstanceOfSatisfying(FetchException.class, e -> {
                    assertThat(e.kind()).isEqualTo(FetchException.Kind.HTTP_STATUS);
                    assertThat(e.status()).isEqualTo(504);
                });
    }

    @Test
    void aRefusalIsReportedAsBlockedAndNotRetried() {
        FakeTransport t = new FakeTransport().answer("https://kvs.gov.in/page", status(403), ok("never asked"));
        assertThatThrownBy(() -> session(t, cfg()).get("https://kvs.gov.in/page"))
                .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.BLOCKED));
        assertThat(t.requested).filteredOn(u -> u.endsWith("/page")).hasSize(1);
    }

    @Test
    void obeysRobotsTxt() {
        FakeTransport t = new FakeTransport()
                .answer("https://kvs.gov.in/robots.txt", ok("User-agent: *\nDisallow: /private/\n"))
                .answer("https://kvs.gov.in/private/list", ok("secret"));
        assertThatThrownBy(() -> session(t, cfg()).get("https://kvs.gov.in/private/list"))
                .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.ROBOTS));
        assertThat(t.requested).doesNotContain("https://kvs.gov.in/private/list");
    }

    @Test
    void refusesHostsOffTheAllowlistPlainHttpAndBareIps() {
        FetchSession s = session(new FakeTransport(), cfg());
        for (String bad : List.of("https://evil.example.com/x", "http://nta.ac.in/x", "http://14.139.116.16:90/Download/x.pdf",
                "https://127.0.0.1/x", "https://nta.ac.in:8443/x", "https://user:pw@nta.ac.in/x", "file:///etc/passwd")) {
            assertThatThrownBy(() -> s.get(bad)).as(bad)
                    .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.POLICY));
        }
    }

    @Test
    void refusesAnAllowedNameThatResolvesToAPrivateAddress() throws Exception {
        FakeTransport t = new FakeTransport();
        t.dns.put("kvs.gov.in", new InetAddress[] {InetAddress.getByAddress("kvs.gov.in", new byte[] {10, 1, 0, 22})});
        assertThatThrownBy(() -> session(t, cfg()).get("https://kvs.gov.in/x"))
                .isInstanceOfSatisfying(FetchException.class, e -> {
                    assertThat(e.kind()).isEqualTo(FetchException.Kind.POLICY);
                    assertThat(e.getMessage()).contains("private");
                });
        assertThat(t.requested).isEmpty();
    }

    @Test
    void followsRedirectsOnlyToAllowedHosts() throws Exception {
        FakeTransport t = new FakeTransport()
                .answer("https://nta.ac.in/a", new HttpTransport.Response(302, "/b", null, new byte[0], false))
                .answer("https://nta.ac.in/b", ok("arrived"))
                .answer("https://nta.ac.in/c", new HttpTransport.Response(301, "https://169.254.169.254/latest/meta-data", null, new byte[0], false));
        FetchSession s = session(t, cfg());
        assertThat(s.get("https://nta.ac.in/a").text()).isEqualTo("arrived");
        assertThatThrownBy(() -> s.get("https://nta.ac.in/c"))
                .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.POLICY));
    }

    @Test
    void refusesAnswersAboveTheSizeLimit() {
        NotificationSyncProperties.Http c = cfg();
        c.setMaxBodyBytes(10);
        FakeTransport t = new FakeTransport().answer("https://nta.ac.in/big", ok("this body is longer than ten bytes"));
        assertThatThrownBy(() -> session(t, c).get("https://nta.ac.in/big"))
                .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.TOO_LARGE));
    }

    @Test
    void spacesOutRequestsToTheSameHost() throws Exception {
        NotificationSyncProperties.Http c = cfg();
        c.setPerHostInterval(Duration.ofSeconds(60));
        FakeTransport t = new FakeTransport().answer("https://nta.ac.in/one", ok("1")).answer("https://nta.ac.in/two", ok("2"));
        FetchSession s = session(t, c);
        s.get("https://nta.ac.in/one");
        s.get("https://nta.ac.in/two");
        assertThat(waits).isNotEmpty().allMatch(d -> d.toSeconds() > 50);
    }

    @Test
    void stopsWhenTheServerIsShuttingDown() {
        FetchSession s = new FetchSession(cfg(), new FakeTransport(), waits::add, Set.of("nta.ac.in"), () -> true);
        assertThatThrownBy(() -> s.get("https://nta.ac.in/x"))
                .isInstanceOfSatisfying(FetchException.class, e -> assertThat(e.kind()).isEqualTo(FetchException.Kind.STOPPED));
    }
}
