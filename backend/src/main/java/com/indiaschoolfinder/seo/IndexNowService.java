package com.indiaschoolfinder.seo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver, Yep) which of the site's pages changed. The addresses come only from the
 * site's own sitemaps, read at the public address exactly as crawlers read them, so nothing is submitted that the
 * sitemap does not offer. Each run first checks that {site}/{key}.txt serves the key: without it every submission would
 * be refused, so nothing is sent.
 *
 * <p>Why: in November 2026 Bing showed the site 3 times in a month (Bing Webmaster Tools through Windsor.ai), while
 * ChatGPT, whose search uses Bing's index among others, was the largest source of new visitors (GA4). Google does not
 * use IndexNow; its sitemap is enough.
 */
@Slf4j
@Service
public class IndexNowService {

    /** One GET or POST without following redirects; tests replace it. */
    public interface Http {
        record Reply(int status, String body) {
        }

        Reply get(URI uri, Duration timeout) throws IOException, InterruptedException;

        Reply post(URI uri, String json, Duration timeout) throws IOException, InterruptedException;
    }

    /** What a run did: addresses found, addresses accepted, the HTTP status of each request, and a sentence for people. */
    public record Result(int urls, int submitted, List<Integer> statuses, String message) {
    }

    /** The protocol's limit per request. */
    static final int MAX_URLS = 10_000;
    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9-]{8,128}");
    private static final Pattern LOC = Pattern.compile("<loc>\\s*([^<\\s]+)\\s*</loc>");
    private static final Pattern URL_ENTRY = Pattern.compile("<url>(.*?)</url>", Pattern.DOTALL);
    private static final Pattern LASTMOD = Pattern.compile("<lastmod>\\s*(\\d{4}-\\d{2}-\\d{2})");

    private final IndexNowProperties props;
    private final AppProperties app;
    private final ObjectMapper json;
    private final Http http;

    @Autowired
    public IndexNowService(IndexNowProperties props, AppProperties app, ObjectMapper json) {
        this(props, app, json, new JdkHttp());
    }

    IndexNowService(IndexNowProperties props, AppProperties app, ObjectMapper json, Http http) {
        this.props = props;
        this.app = app;
        this.json = json;
        this.http = http;
    }

    /** The daily run: sitemap addresses whose lastmod is within app.indexnow.look-back-days of today. */
    public Result submitChanged() {
        return run(LocalDate.now(ZoneId.of(app.getTimezone())).minusDays(props.getLookBackDays()));
    }

    /** Every sitemap address, once: after IndexNow is first switched on. */
    public Result submitAll() {
        return run(null);
    }

    private Result run(LocalDate since) {
        String site = site();
        String key = props.getKey() == null ? "" : props.getKey().trim();
        if (!props.isEnabled()) return skipped("IndexNow is switched off (app.indexnow.enabled=false).");
        if (site == null) return skipped("app.public-site-url is not set, so the site's own addresses are unknown.");
        if (!KEY.matcher(key).matches()) return skipped("app.indexnow.key is missing or is not 8-128 letters, digits or dashes.");
        try {
            String keyLocation = site + "/" + key + ".txt";
            Http.Reply file = http.get(URI.create(fetchBase(site) + "/" + key + ".txt"), props.getTimeout());
            if (file.status() != 200 || file.body() == null || !file.body().trim().equals(key)) {
                return skipped(keyLocation + " does not serve the key yet (HTTP " + file.status() + "); nothing was submitted.");
            }
            List<String> urls = sitemapUrls(site, since);
            if (urls.isEmpty()) {
                return skipped(since == null ? "The sitemaps list no addresses." : "No sitemap address changed since " + since + ".");
            }
            List<Integer> statuses = new ArrayList<>();
            int submitted = 0;
            for (int from = 0; from < urls.size(); from += MAX_URLS) {
                List<String> batch = urls.subList(from, Math.min(urls.size(), from + MAX_URLS));
                Http.Reply reply = http.post(URI.create(props.getEndpoint()), payload(URI.create(site).getHost(), key, keyLocation, batch),
                        props.getTimeout());
                statuses.add(reply.status());
                // 200: received; 202: received, key check pending. Anything else is reported and not counted.
                if (reply.status() == 200 || reply.status() == 202) submitted += batch.size();
            }
            String message = "IndexNow: " + submitted + " of " + urls.size() + " addresses accepted"
                    + (since == null ? " (all sitemap addresses)" : " (changed since " + since + ")") + "; HTTP " + statuses + ".";
            log.info(message);
            return new Result(urls.size(), submitted, statuses, message);
        } catch (IOException | RuntimeException e) {
            log.warn("IndexNow run failed: {}", e.toString());
            return skipped("IndexNow run failed: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return skipped("IndexNow run interrupted.");
        }
    }

    /** The site's addresses from its sitemap index and every sitemap in it; only those changed since {@code since} if given. */
    List<String> sitemapUrls(String site, LocalDate since) throws IOException, InterruptedException {
        String base = fetchBase(site);
        Http.Reply index = http.get(URI.create(base + "/sitemap.xml"), props.getTimeout());
        if (index.status() != 200) throw new IOException("sitemap index answered HTTP " + index.status());
        Set<String> urls = new LinkedHashSet<>();
        for (String part : locs(index.body())) {
            // Only the site's own sitemaps: the index is read from the site itself, so this is a second line of defence.
            if (!part.startsWith(site + "/")) continue;
            Http.Reply reply = http.get(URI.create(base + part.substring(site.length())), props.getTimeout());
            if (reply.status() != 200) throw new IOException(part + " answered HTTP " + reply.status());
            for (Entry e : entries(reply.body())) {
                if (!e.loc().startsWith(site + "/")) continue;
                if (since != null && (e.lastmod() == null || e.lastmod().isBefore(since))) continue;
                urls.add(e.loc());
            }
        }
        return new ArrayList<>(urls);
    }

    record Entry(String loc, LocalDate lastmod) {
    }

    /** The {@code <loc>} addresses of a sitemap index. */
    static List<String> locs(String xml) {
        List<String> out = new ArrayList<>();
        Matcher m = LOC.matcher(xml == null ? "" : xml);
        while (m.find()) out.add(unescape(m.group(1)));
        return out;
    }

    /** The {@code <url>} entries of a sitemap, each with its lastmod day when it has one. */
    static List<Entry> entries(String xml) {
        List<Entry> out = new ArrayList<>();
        Matcher m = URL_ENTRY.matcher(xml == null ? "" : xml);
        while (m.find()) {
            Matcher loc = LOC.matcher(m.group(1));
            if (!loc.find()) continue;
            Matcher lastmod = LASTMOD.matcher(m.group(1));
            out.add(new Entry(unescape(loc.group(1)), lastmod.find() ? LocalDate.parse(lastmod.group(1)) : null));
        }
        return out;
    }

    String payload(String host, String key, String keyLocation, List<String> urls) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("host", host);
        body.put("key", key);
        body.put("keyLocation", keyLocation);
        body.put("urlList", urls);
        try {
            return json.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Where to read the sitemaps and key file: app.indexnow.fetch-base when set (without a trailing slash), else the site. */
    private String fetchBase(String site) {
        String base = props.getFetchBase() == null ? "" : props.getFetchBase().trim();
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base.matches("https?://\\S+") ? base : site;
    }

    /** The configured public address without a trailing slash, or null; only https addresses are used. */
    private String site() {
        String url = app.getPublicSiteUrl() == null ? "" : app.getPublicSiteUrl().trim();
        while (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url.startsWith("https://") && url.length() > "https://".length() ? url : null;
    }

    private static String unescape(String s) {
        return s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&");
    }

    private static Result skipped(String message) {
        log.info(message);
        return new Result(0, 0, List.of(), message);
    }

    /** The JDK client: no redirects followed (an address that moved is not ours to submit). */
    static final class JdkHttp implements Http {
        private static final String USER_AGENT = "SchoolDhundo-IndexNow/1.0 (+https://schooldhundo.in/about)";
        private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build();

        @Override
        public Reply get(URI uri, Duration timeout) throws IOException, InterruptedException {
            HttpResponse<String> r = client.send(HttpRequest.newBuilder(uri).timeout(timeout).header("User-Agent", USER_AGENT).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            return new Reply(r.statusCode(), r.body());
        }

        @Override
        public Reply post(URI uri, String body, Duration timeout) throws IOException, InterruptedException {
            HttpResponse<String> r = client.send(HttpRequest.newBuilder(uri).timeout(timeout).header("User-Agent", USER_AGENT)
                    .header("Content-Type", "application/json; charset=utf-8").POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                    HttpResponse.BodyHandlers.ofString());
            return new Reply(r.statusCode(), r.body());
        }
    }
}
