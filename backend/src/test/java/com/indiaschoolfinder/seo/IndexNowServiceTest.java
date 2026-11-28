package com.indiaschoolfinder.seo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.config.AppProperties;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class IndexNowServiceTest {

    private static final String SITE = "https://schooldhundo.in";
    private static final String KEY = "1d69358d6e265f485ec60722cd51fb81";

    /** Canned answers by address; every POST is recorded. */
    private static final class FakeHttp implements IndexNowService.Http {
        final Map<String, Reply> gets = new HashMap<>();
        final List<String> posts = new ArrayList<>();
        int postStatus = 200;

        @Override
        public Reply get(URI uri, Duration timeout) {
            return gets.getOrDefault(uri.toString(), new Reply(404, ""));
        }

        @Override
        public Reply post(URI uri, String json, Duration timeout) {
            assertThat(uri.toString()).isEqualTo("https://api.indexnow.org/indexnow");
            posts.add(json);
            return new Reply(postStatus, "");
        }
    }

    private final ObjectMapper json = new ObjectMapper();

    private IndexNowService service(FakeHttp http, boolean enabled) {
        IndexNowProperties props = new IndexNowProperties();
        props.setEnabled(enabled);
        props.setKey(KEY);
        AppProperties app = new AppProperties();
        app.setPublicSiteUrl(SITE + "/");
        return new IndexNowService(props, app, json, http);
    }

    private static FakeHttp siteWithSitemaps() {
        FakeHttp http = new FakeHttp();
        http.gets.put(SITE + "/" + KEY + ".txt", new IndexNowService.Http.Reply(200, KEY + "\n"));
        http.gets.put(SITE + "/sitemap.xml", new IndexNowService.Http.Reply(200, """
                <?xml version="1.0" encoding="UTF-8"?>
                <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                  <sitemap><loc>https://schooldhundo.in/sitemaps/pages.xml</loc></sitemap>
                  <sitemap><loc>https://schooldhundo.in/sitemaps/exams.xml</loc></sitemap>
                  <sitemap><loc>https://elsewhere.example/sitemap.xml</loc></sitemap>
                </sitemapindex>
                """));
        String today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).toString();
        http.gets.put(SITE + "/sitemaps/pages.xml", new IndexNowService.Http.Reply(200, """
                <urlset><url><loc>https://schooldhundo.in/</loc></url>
                <url><loc>https://schooldhundo.in/jobs?state=OD&amp;post=TGT</loc><lastmod>%s</lastmod></url></urlset>
                """.formatted(today)));
        http.gets.put(SITE + "/sitemaps/exams.xml", new IndexNowService.Http.Reply(200, """
                <urlset><url><loc>https://schooldhundo.in/exams/aissee</loc><lastmod>%s</lastmod></url>
                <url><loc>https://schooldhundo.in/exams/rimc</loc><lastmod>2026-10-01</lastmod></url>
                <url><loc>https://other.example/page</loc><lastmod>%s</lastmod></url></urlset>
                """.formatted(today, today)));
        return http;
    }

    @Test
    void submitsOnlyTheSitesOwnChangedAddresses() throws IOException {
        FakeHttp http = siteWithSitemaps();
        IndexNowService.Result result = service(http, true).submitChanged();
        assertThat(result.urls()).isEqualTo(2);
        assertThat(result.submitted()).isEqualTo(2);
        assertThat(result.statuses()).containsExactly(200);
        JsonNode body = json.readTree(http.posts.get(0));
        assertThat(body.get("host").asText()).isEqualTo("schooldhundo.in");
        assertThat(body.get("key").asText()).isEqualTo(KEY);
        assertThat(body.get("keyLocation").asText()).isEqualTo(SITE + "/" + KEY + ".txt");
        assertThat(body.get("urlList")).extracting(JsonNode::asText)
                .containsExactly(SITE + "/jobs?state=OD&post=TGT", SITE + "/exams/aissee");
    }

    @Test
    void theFullSubmissionIncludesAddressesWithoutALastmod() {
        FakeHttp http = siteWithSitemaps();
        IndexNowService.Result result = service(http, true).submitAll();
        assertThat(result.urls()).isEqualTo(4);
        assertThat(http.posts.get(0)).contains("\"https://schooldhundo.in/\"", "/exams/rimc").doesNotContain("other.example");
    }

    @Test
    void sendsNothingWhileSwitchedOffOrWhileTheKeyFileIsNotLive() {
        FakeHttp http = siteWithSitemaps();
        assertThat(service(http, false).submitAll().message()).contains("switched off");
        http.gets.put(SITE + "/" + KEY + ".txt", new IndexNowService.Http.Reply(200, "<!doctype html><html>app shell</html>"));
        IndexNowService.Result result = service(http, true).submitAll();
        assertThat(result.submitted()).isZero();
        assertThat(result.message()).contains("does not serve the key");
        assertThat(http.posts).isEmpty();
    }

    @Test
    void aRefusedSubmissionIsReportedAndNotCounted() {
        FakeHttp http = siteWithSitemaps();
        http.postStatus = 403;
        IndexNowService.Result result = service(http, true).submitAll();
        assertThat(result.submitted()).isZero();
        assertThat(result.statuses()).containsExactly(403);
    }

    /** On the server the sitemaps and key file are read from nginx on the machine; what is submitted stays public. */
    @Test
    void readsThroughTheLocalAddressButSubmitsThePublicOnes() throws IOException {
        FakeHttp site = siteWithSitemaps();
        FakeHttp local = new FakeHttp();
        site.gets.forEach((url, reply) -> local.gets.put(url.replace(SITE, "http://127.0.0.1:8081"), reply));
        IndexNowProperties props = new IndexNowProperties();
        props.setEnabled(true);
        props.setKey(KEY);
        props.setFetchBase("http://127.0.0.1:8081/");
        AppProperties app = new AppProperties();
        app.setPublicSiteUrl(SITE);
        IndexNowService.Result result = new IndexNowService(props, app, json, local).submitAll();
        assertThat(result.submitted()).isEqualTo(4);
        JsonNode body = json.readTree(local.posts.get(0));
        assertThat(body.get("keyLocation").asText()).isEqualTo(SITE + "/" + KEY + ".txt");
        assertThat(body.get("urlList")).extracting(JsonNode::asText).allMatch(u -> u.startsWith(SITE + "/"));
    }

    @Test
    void largeSitemapsGoInBatchesTheProtocolAccepts() {
        FakeHttp http = siteWithSitemaps();
        StringBuilder many = new StringBuilder("<urlset>");
        for (int i = 0; i < IndexNowService.MAX_URLS + 5; i++) many.append("<url><loc>").append(SITE).append("/schools/s-").append(i).append("</loc></url>");
        http.gets.put(SITE + "/sitemaps/exams.xml", new IndexNowService.Http.Reply(200, many.append("</urlset>").toString()));
        IndexNowService.Result result = service(http, true).submitAll();
        assertThat(http.posts).hasSize(2);
        assertThat(result.submitted()).isEqualTo(result.urls());
    }

    /** The key the application ships with must be the one frontend/public serves, or every submission is refused. */
    @Test
    void theConfiguredKeyIsTheKeyFileTheSiteServes() throws IOException {
        Properties props = new Properties();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            props.load(in);
        }
        String configured = props.getProperty("app.indexnow.key").replaceAll("^\\$\\{INDEXNOW_KEY:(.*)}$", "$1");
        assertThat(configured).isEqualTo(KEY);
        Path file = Path.of("..", "frontend", "public", configured + ".txt");
        assertThat(Files.readString(file, StandardCharsets.UTF_8).trim()).isEqualTo(configured);
    }
}
