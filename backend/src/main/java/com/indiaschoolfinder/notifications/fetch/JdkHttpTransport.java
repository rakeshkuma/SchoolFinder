package com.indiaschoolfinder.notifications.fetch;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** The real transport: the JDK HTTP client, redirects off (the session checks each hop), bodies read up to a limit. */
public class JdkHttpTransport implements HttpTransport {

    private final HttpClient client;

    public JdkHttpTransport(Duration connectTimeout) {
        this.client = HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    @Override
    public Response get(URI uri, String userAgent, Duration timeout, long maxBytes) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(timeout)
                .header("User-Agent", userAgent)
                .header("Accept", "text/html,application/json,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5")
                .header("Accept-Language", "en-IN,en;q=0.9,hi;q=0.6")
                .GET()
                .build();
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        boolean truncated = false;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (InputStream in = response.body()) {
            byte[] buf = new byte[16 * 1024];
            long total = 0;
            int n;
            while ((n = in.read(buf)) != -1) {
                if (total + n > maxBytes) {
                    truncated = true;
                    break;
                }
                out.write(buf, 0, n);
                total += n;
            }
        }
        return new Response(response.statusCode(), response.headers().firstValue("Location").orElse(null),
                response.headers().firstValue("Content-Type").orElse(null), out.toByteArray(), truncated);
    }
}
