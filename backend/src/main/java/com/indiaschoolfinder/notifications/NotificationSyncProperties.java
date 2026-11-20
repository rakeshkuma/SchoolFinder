package com.indiaschoolfinder.notifications;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * The daily check of official websites (prefix app.notifications). Every value has a safe default; see
 * NOTIFICATION_SYNC_GUIDE.md for what each one does and how to add a source.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.notifications")
public class NotificationSyncProperties {

    /** Master switch for the scheduled check (the admin "check now" button and startup catch-up obey it too). */
    private boolean enabled = true;
    /** Spring cron (second minute hour day month weekday), read in app.timezone: 6:00 AM India time by default. */
    private String cron = "0 0 6 * * *";
    /** Human description of the schedule, shown on the site ("checked daily at 6:00 AM IST"). */
    private String scheduleLabel = "Daily at 6:00 AM IST";
    /** If the last successful run is older than this when the server starts, run once shortly after start. */
    private boolean catchUpOnStartup = true;
    private Duration catchUpAfter = Duration.ofHours(24);
    private Duration catchUpDelay = Duration.ofMinutes(2);
    /** A staff "check now" is refused if a run started less than this long ago. */
    private Duration manualCooldown = Duration.ofMinutes(10);
    /** When non-empty, only these sources run (used by tests; e.g. "nta-aissee,navodaya"). */
    private List<String> onlySources = new ArrayList<>();
    /** Sources switched off (e.g. "cbse-recruitment" while its site refuses automated requests). */
    private List<String> disabledSources = new ArrayList<>();
    /**
     * How long a notice without an official end date stays on the site after its publication date. Notices older
     * than this when first found are not added at all: the feed is for current news.
     */
    private int lifetimeDays = 45;
    /**
     * How long a walk-in interview (or an interview for contractual or part-time posts) stays current when its day was not
     * read from its title or document: such interviews are usually held within days of the notice.
     */
    private int walkInLifetimeDays = 10;
    /** A notice missing from a complete listing for this long is treated as withdrawn. */
    private Duration withdrawAfter = Duration.ofHours(20);
    /**
     * How many websites of a family (the Kendriya Vidyalayas' own sites) are read at the same time. Each site is still
     * asked at most once every perHostInterval; what was read is applied one site after another.
     */
    private int parallelFetches = 6;

    private final Http http = new Http();
    private final Pdf pdf = new Pdf();

    @Getter
    @Setter
    public static class Http {
        /** Sent with every request so site owners can see who is asking and how to reach us. */
        private String userAgent = "SchoolDhundoBot/1.0 (+https://schooldhundo.in/contact)";
        private Duration connectTimeout = Duration.ofSeconds(10);
        private Duration requestTimeout = Duration.ofSeconds(30);
        /** Larger answers are cut off and the source is reported as failed (the NTA archive page is about 2.3 MB). */
        private long maxBodyBytes = 6L * 1024 * 1024;
        /** Attempts per request for network errors, 429 and 5xx answers; 4xx answers are not retried. */
        private int maxAttempts = 3;
        /** Wait before the second attempt; doubled before each later one. */
        private Duration retryBackoff = Duration.ofSeconds(3);
        /** At least this long between two requests to the same host. */
        private Duration perHostInterval = Duration.ofMillis(1500);
        private int maxRedirects = 3;
        /** Honour robots.txt (Disallow rules for "*" or our user agent). */
        private boolean respectRobots = true;
    }

    /** Short text excerpts from notice PDFs, only for the editor's review note (never shown publicly). */
    @Getter
    @Setter
    public static class Pdf {
        private boolean excerpts = true;
        private long maxBytes = 5L * 1024 * 1024;
        private int maxPages = 2;
        private int maxChars = 400;
        /** PDFs read per source per run, at most. */
        private int maxPerSource = 3;
        /**
         * Sources that read their notices' documents for dates (see OfficialSourceAdapter.readDocuments): new job notices
         * read per source per run, and how much of each document is read.
         */
        private int documentsPerSource = 6;
        private int documentPages = 3;
        private int documentChars = 8000;
    }
}
