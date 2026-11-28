package com.indiaschoolfinder.seo;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * IndexNow (prefix app.indexnow): tells Bing and the other IndexNow engines which pages changed, so they recrawl them
 * without waiting for the sitemap. Off unless switched on (production only); see IndexNowService.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.indexnow")
public class IndexNowProperties {

    private boolean enabled = false;
    /**
     * The site's IndexNow key (8-128 letters, digits or dashes). The same key must be served as the whole content of
     * {public-site-url}/{key}.txt (frontend/public/{key}.txt); nothing is submitted while that file does not match.
     */
    private String key = "";
    /** The shared endpoint: one submission reaches every engine that takes part (Bing, Yandex, Seznam, Naver, Yep). */
    private String endpoint = "https://api.indexnow.org/indexnow";
    /** Spring cron in app.timezone: 7:30 AM India time, well after the 6:00 AM check of official sources. */
    private String cron = "0 30 7 * * *";
    /** The daily run submits sitemap addresses whose lastmod is within this many days (so a missed day is caught up). */
    private int lookBackDays = 2;
    /**
     * Where the server itself reads its sitemaps and key file; empty means the public address. On the Oracle server the
     * backend reaches nginx directly on http://127.0.0.1:8081, as deploy/warm-seo-cache.sh does, rather than going out and
     * back in through the public address. The addresses submitted are always the public ones the sitemaps list.
     */
    private String fetchBase = "";
    private Duration timeout = Duration.ofSeconds(20);
}
