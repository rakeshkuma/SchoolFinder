package com.indiaschoolfinder.notifications;

import com.fasterxml.jackson.databind.JsonNode;
import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceLayoutException;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The daily check end to end against PostgreSQL, with fake sources standing in for the official websites (no network):
 * two consecutive daily runs, corrections, revised dates, expiry, withdrawal, a failing source, the run lock, recovery
 * after a crash, and the public and staff endpoints.
 */
@Import(NotificationSyncIT.FakeSources.class)
@TestPropertySource(properties = {
        "app.notifications.only-sources=test-official,test-broken,test-review",
        "app.notifications.manual-cooldown=PT10M",
        "app.notifications.http.retry-backoff=PT0S",
        "app.notifications.http.per-host-interval=PT0S"})
class NotificationSyncIT extends AbstractIntegrationTest {

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final String HOST = "notices.example.gov.in";

    /** A source whose listing (or failure) each test sets. */
    static final class FakeSource implements OfficialSourceAdapter {
        final String key;
        final boolean autoPublish;
        final boolean complete;
        volatile SourceListing listing = new SourceListing(0, List.of(), 0);
        volatile Exception failure;

        FakeSource(String key, boolean autoPublish, boolean complete) {
            this.key = key;
            this.autoPublish = autoPublish;
            this.complete = complete;
        }

        @Override public String key() { return key; }
        @Override public String name() { return "Test Board " + key; }
        @Override public String listingUrl() { return "https://" + HOST + "/" + key + "/"; }
        @Override public Set<String> hosts() { return Set.of(HOST); }
        @Override public boolean autoPublish() { return autoPublish; }
        @Override public String reviewOnlyReason() { return autoPublish ? null : "Test source is review-only."; }
        @Override public boolean completeListing() { return complete; }

        @Override
        public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException {
            if (failure instanceof FetchException f) {
                throw f;
            }
            if (failure instanceof SourceLayoutException l) {
                throw l;
            }
            if (failure instanceof RuntimeException r) {
                throw r;
            }
            return listing;
        }

        void list(FoundNotice... notices) {
            listing = new SourceListing(notices.length + 3, List.of(notices), 3);
            failure = null;
        }
    }

    @TestConfiguration
    static class FakeSources {
        @Bean FakeSource testOfficial() { return new FakeSource("test-official", true, true); }
        @Bean FakeSource testBroken() { return new FakeSource("test-broken", true, false); }
        @Bean FakeSource testReview() { return new FakeSource("test-review", false, false); }
    }

    @Autowired NotificationSyncService sync;
    @Autowired SiteUpdateRepository updates;
    @Autowired DataSource dataSource;
    @Autowired List<FakeSource> fakes;

    private FakeSource official;
    private FakeSource broken;
    private FakeSource review;
    private LocalDate today;

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE site_update, notification_sync_run RESTART IDENTITY CASCADE");
        official = fake("test-official");
        broken = fake("test-broken");
        review = fake("test-review");
        for (FakeSource f : fakes) {
            f.listing = new SourceListing(0, List.of(), 0);
            f.failure = null;
        }
        today = LocalDate.now(INDIA);
    }

    private FakeSource fake(String key) {
        return fakes.stream().filter(f -> f.key.equals(key)).findFirst().orElseThrow();
    }

    /** Six in the morning, India time, {@code days} from today. */
    private Instant morning(int days) {
        return today.plusDays(days).atTime(6, 0).atZone(INDIA).toInstant();
    }

    private static FoundNotice notice(String id, String title, LocalDate published, SiteUpdate.Category category) {
        return new FoundNotice(id, title, "https://" + HOST + "/files/" + id + ".pdf", published, category, "aissee", "/exams/aissee", null, null);
    }

    private NotificationSyncRun run(int days) {
        return sync.run(NotificationSyncRun.Trigger.SCHEDULED, "test", morning(days)).orElseThrow();
    }

    private SiteUpdate stored(String itemId) {
        return updates.findAll().stream().filter(u -> itemId.equals(u.getSourceItemId())).findFirst().orElseThrow();
    }

    private JsonNode feed(String query) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/v1/updates" + query)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    @Test
    void twoConsecutiveDailyRunsAddNoticesOnceAndChangeNothingTheSecondTime() throws Exception {
        official.list(
                notice("aissee-2027", "Inviting Online Application for AISSEE-2027", today.minusDays(1), SiteUpdate.Category.EXAM),
                notice("teachers", "Recruitment of Teachers 2026: notification", today.minusDays(2), SiteUpdate.Category.JOB),
                new FoundNotice("undated", "Admission notice without a date on the listing", "https://" + HOST + "/files/undated.pdf", null,
                        SiteUpdate.Category.ADMISSION, "aissee", null, null, "Listed without a date."),
                new FoundNotice("elsewhere", "Admit card for AISSEE-2027 on the exam portal", "https://exams.example.org/admit", today,
                        SiteUpdate.Category.EXAM, "aissee", null, null, null),
                notice("old", "AISSEE-2025 result (old news)", today.minusDays(200), SiteUpdate.Category.EXAM));

        NotificationSyncRun first = run(0);

        assertThat(first.getStatus()).isEqualTo(NotificationSyncRun.Status.SUCCEEDED);
        assertThat(first.getItemsCreated()).isEqualTo(4);
        assertThat(first.getItemsPublished()).isEqualTo(2);
        assertThat(first.getItemsPending()).isEqualTo(2);
        SiteUpdate aissee = stored("aissee-2027");
        assertThat(aissee.getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(aissee.getPublishedOn()).isEqualTo(today.minusDays(1)); // the source's date, not the day found
        assertThat(aissee.getOrigin()).isEqualTo(SiteUpdate.Origin.OFFICIAL_SYNC);
        assertThat(aissee.getSummary()).isEqualTo("Test Board test-official published this notice on "
                + today.minusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", java.util.Locale.ENGLISH))
                + ". Open the official notice for dates, eligibility and how to apply.");
        assertThat(aissee.getExpiresOn()).isEqualTo(today.minusDays(1).plusDays(45));
        SiteUpdate undated = stored("undated");
        assertThat(undated.getStatus()).isEqualTo(SiteUpdate.Status.PENDING_REVIEW);
        assertThat(undated.isDateConfirmed()).isFalse();
        assertThat(undated.getReviewNote()).contains("gives no date");
        assertThat(stored("elsewhere").getStatus()).isEqualTo(SiteUpdate.Status.PENDING_REVIEW);
        assertThat(stored("elsewhere").getReviewNote()).contains("exams.example.org");
        assertThat(updates.findAll()).noneMatch(u -> "old".equals(u.getSourceItemId()));
        Instant updatedAt = aissee.getUpdatedAt();

        NotificationSyncRun second = run(1); // the next morning, same listing

        assertThat(second.getItemsCreated()).isZero();
        assertThat(second.getItemsUpdated()).isZero();
        assertThat(sync.results(second)).filteredOn(r -> r.key.equals("test-official"))
                .singleElement().satisfies(r -> assertThat(r.unchanged).isEqualTo(4));
        assertThat(updates.count()).isEqualTo(4);
        SiteUpdate again = stored("aissee-2027");
        assertThat(again.getUpdatedAt()).isEqualTo(updatedAt);
        assertThat(again.getPublishedOn()).isEqualTo(today.minusDays(1));
        assertThat(again.getLastSeenAt()).isEqualTo(morning(1));
        assertThat(again.getLastChangedAt()).isNull();

        // The feed shows the published notices only, as official-source items, in their own tabs.
        JsonNode all = feed("?size=50").path("content");
        List<String> titles = new ArrayList<>();
        all.forEach(n -> titles.add(n.path("title").asText()));
        assertThat(titles).contains("Inviting Online Application for AISSEE-2027", "Recruitment of Teachers 2026: notification")
                .doesNotContain("Admission notice without a date on the listing", "Admit card for AISSEE-2027 on the exam portal");
        JsonNode item = all.findParents("title").stream().filter(n -> n.path("title").asText().contains("AISSEE-2027")).findFirst().orElseThrow();
        assertThat(item.path("origin").asText()).isEqualTo("OFFICIAL_SOURCE");
        assertThat(item.path("badge").asText()).isEqualTo("NEW");
        assertThat(item.path("verified").asBoolean()).isFalse(); // no editor has checked it
        assertThat(feed("?category=JOB").path("content")).extracting(n -> n.path("title").asText())
                .contains("Recruitment of Teachers 2026: notification");
        assertThat(feed("?category=EXAM").path("content")).extracting(n -> n.path("title").asText())
                .doesNotContain("Recruitment of Teachers 2026: notification");
    }

    @Test
    void aCorrectionAtTheSourceShowsAsUpdatedWithoutMovingThePublicationDate() throws Exception {
        LocalDate published = today.minusDays(12);
        official.list(notice("n1", "AISSEE-2027: last date to apply", published, SiteUpdate.Category.EXAM));
        run(0);

        // The source fixes the title and re-dates the notice.
        official.list(notice("n1", "AISSEE-2027: last date to apply extended", published.plusDays(3), SiteUpdate.Category.EXAM));
        NotificationSyncRun next = run(0);

        assertThat(next.getItemsUpdated()).isEqualTo(1);
        SiteUpdate u = stored("n1");
        assertThat(u.getTitle()).isEqualTo("AISSEE-2027: last date to apply extended");
        assertThat(u.getPublishedOn()).isEqualTo(published); // never moved later
        assertThat(u.getLastChangedAt()).isNotNull();
        assertThat(u.getReviewNote()).contains("title").contains("stays dated");
        JsonNode item = feed("?category=EXAM&size=50").path("content").findParents("title").stream()
                .filter(n -> n.path("title").asText().endsWith("extended")).findFirst().orElseThrow();
        assertThat(item.path("badge").asText()).isEqualTo("UPDATED");
        assertThat(item.path("publishedOn").asText()).isEqualTo(published.toString());
    }

    @Test
    void staffWordingIsKeptWhenTheSourceChangesLater() throws Exception {
        official.list(notice("n1", "AISSEE-2027 notice from the source", today.minusDays(2), SiteUpdate.Category.EXAM));
        run(0);
        long id = stored("n1").getId();
        String body = "{\"category\":\"EXAM\",\"title\":\"AISSEE 2027: applications open\",\"summary\":\"Written by our editor for parents, citing NTA.\","
                + "\"publishedOn\":\"" + today.minusDays(2) + "\",\"sourceUrl\":\"https://" + HOST + "/files/n1.pdf\",\"priority\":0}";
        mockMvc.perform(put("/api/v1/admin/updates/" + id).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());

        official.list(notice("n1", "AISSEE-2027 notice from the source (corrected)", today.minusDays(2), SiteUpdate.Category.EXAM));
        run(0);

        SiteUpdate u = stored("n1");
        assertThat(u.isStaffEdited()).isTrue();
        assertThat(u.getTitle()).isEqualTo("AISSEE 2027: applications open");
        assertThat(u.getOfficialTitle()).isEqualTo("AISSEE-2027 notice from the source (corrected)");
        assertThat(u.getReviewNote()).contains("Staff wording kept");
    }

    @Test
    void expiredNoticesLeaveTheFeedAndAnOfficialExtensionReopensThem() throws Exception {
        LocalDate published = today.minusDays(3);
        official.list(new FoundNotice("n1", "Applications for Class VI admission", "https://" + HOST + "/files/n1.pdf", published,
                SiteUpdate.Category.ADMISSION, "aissee", null, today.plusDays(2), null));
        run(0);
        assertThat(stored("n1").getExpiresOn()).isEqualTo(today.plusDays(2));

        NotificationSyncRun later = run(5); // three days after the closing date
        assertThat(later.getItemsExpired()).isEqualTo(1);
        assertThat(stored("n1").getStatus()).isEqualTo(SiteUpdate.Status.EXPIRED);

        // The source extends the closing date.
        official.list(new FoundNotice("n1", "Applications for Class VI admission", "https://" + HOST + "/files/n1.pdf", published,
                SiteUpdate.Category.ADMISSION, "aissee", null, today.plusDays(20), null));
        run(6);
        SiteUpdate u = stored("n1");
        assertThat(u.getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(u.getExpiresOn()).isEqualTo(today.plusDays(20));
        assertThat(u.getPublishedOn()).isEqualTo(published);
    }

    @Test
    void pastUpdatesListShowsExpiredNoticesWithTheExpiredBadge() throws Exception {
        official.list(new FoundNotice("n1", "Applications for Class IX admission closed", "https://" + HOST + "/files/n1.pdf",
                today.minusDays(20), SiteUpdate.Category.ADMISSION, "aissee", null, today.minusDays(1), null));
        // Created with a closing date already past: not added (old news).
        run(0);
        assertThat(updates.count()).isZero();

        official.list(new FoundNotice("n2", "Applications for Class IX admission", "https://" + HOST + "/files/n2.pdf",
                today.minusDays(20), SiteUpdate.Category.ADMISSION, "aissee", null, today.plusDays(1), null));
        run(0);
        jdbc.update("UPDATE site_update SET expires_on = ? WHERE source_item_id = 'n2'", java.sql.Date.valueOf(today.minusDays(1)));
        run(0);
        assertThat(stored("n2").getStatus()).isEqualTo(SiteUpdate.Status.EXPIRED);
        assertThat(feed("?category=ADMISSION").path("content")).isEmpty();
        JsonNode past = objectMapper.readTree(mockMvc.perform(get("/api/v1/updates/past?category=ADMISSION")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).path("content");
        assertThat(past).singleElement().satisfies(n -> assertThat(n.path("badge").asText()).isEqualTo("EXPIRED"));
    }

    @Test
    void aNoticeMissingFromACompleteListingForADayIsWithdrawn() {
        official.list(notice("n1", "AISSEE-2027 notice later withdrawn", today.minusDays(1), SiteUpdate.Category.EXAM),
                notice("n2", "AISSEE-2027 notice that stays", today.minusDays(1), SiteUpdate.Category.EXAM));
        run(0);

        official.list(notice("n2", "AISSEE-2027 notice that stays", today.minusDays(1), SiteUpdate.Category.EXAM));
        run(1);
        assertThat(stored("n1").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(stored("n1").getMissingSince()).isEqualTo(morning(1));

        NotificationSyncRun third = run(2);
        assertThat(third.getItemsWithdrawn()).isEqualTo(1);
        SiteUpdate gone = stored("n1");
        assertThat(gone.getStatus()).isEqualTo(SiteUpdate.Status.ARCHIVED);
        assertThat(gone.getWithdrawnAt()).isEqualTo(morning(2));
        assertThat(stored("n2").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
    }

    @Test
    void oneFailingSourceDoesNotStopTheOthers() {
        broken.failure = new FetchException(FetchException.Kind.NETWORK, "network error after 3 attempt(s): ConnectException");
        official.list(notice("n1", "AISSEE-2027 notice from a working source", today, SiteUpdate.Category.EXAM));
        review.failure = new SourceLayoutException("the notice table has no rows");

        NotificationSyncRun run = run(0);

        assertThat(run.getStatus()).isEqualTo(NotificationSyncRun.Status.PARTIAL);
        assertThat(run.getSourcesFailed()).isEqualTo(2);
        assertThat(stored("n1").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(sync.results(run)).filteredOn(r -> r.key.startsWith("test-")).extracting(r -> r.key + "=" + r.outcome)
                .containsExactlyInAnyOrder("test-broken=FAILED", "test-official=OK", "test-review=FAILED");
        // The real official sources are switched off in tests: no test ever contacts a real website.
        assertThat(sync.results(run)).filteredOn(r -> !r.key.startsWith("test-")).isNotEmpty()
                .allSatisfy(r -> assertThat(r.outcome).isEqualTo("SKIPPED"));
        assertThat(sync.results(run)).filteredOn(r -> r.key.equals("test-review")).singleElement()
                .satisfies(r -> assertThat(r.error).startsWith("page layout changed"));

        broken.failure = new FetchException(FetchException.Kind.BLOCKED, "the site refused automated access (HTTP 403)", 403, null);
        official.failure = new RuntimeException("boom");
        review.list();
        NotificationSyncRun next = run(1);
        assertThat(sync.results(next)).filteredOn(r -> r.key.startsWith("test-")).extracting(r -> r.key + "=" + r.outcome)
                .containsExactlyInAnyOrder("test-broken=BLOCKED", "test-official=FAILED", "test-review=OK");
    }

    @Test
    void aReviewOnlySourceNeverPublishesAndAnUndatedNoticeNeedsADateBeforePublishing() throws Exception {
        review.list(new FoundNotice("r1", "Recruitment of Assistant Masters 2026", "https://" + HOST + "/files/r1.pdf", null,
                SiteUpdate.Category.JOB, "rms", null, null, "Listed on the home page without a date."));
        run(0);
        SiteUpdate u = stored("r1");
        assertThat(u.getStatus()).isEqualTo(SiteUpdate.Status.PENDING_REVIEW);
        assertThat(u.getReviewNote()).contains("Test source is review-only.");

        JsonNode pending = objectMapper.readTree(mockMvc.perform(get("/api/v1/admin/updates?status=PENDING_REVIEW")
                .header("Authorization", editorToken())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(pending.path("content")).singleElement().satisfies(n -> {
            assertThat(n.path("origin").asText()).isEqualTo("OFFICIAL_SYNC");
            assertThat(n.path("dateConfirmed").asBoolean()).isFalse();
        });

        mockMvc.perform(post("/api/v1/admin/updates/" + u.getId() + "/publish").header("Authorization", editorToken()))
                .andExpect(status().isBadRequest());
        String body = "{\"category\":\"JOB\",\"title\":\"Recruitment of Assistant Masters 2026\",\"summary\":\"Rashtriya Military Schools "
                + "invite applications; the notice is dated 10 Nov 2026.\",\"publishedOn\":\"" + today.minusDays(4)
                + "\",\"sourceUrl\":\"https://" + HOST + "/files/r1.pdf\",\"priority\":0}";
        mockMvc.perform(put("/api/v1/admin/updates/" + u.getId()).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/updates/" + u.getId() + "/publish").header("Authorization", editorToken()))
                .andExpect(status().isOk());
        assertThat(stored("r1").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(stored("r1").isDateConfirmed()).isTrue();
    }

    @Test
    void anEditorCanMarkAnUpdateSupersededByALaterOne() throws Exception {
        official.list(notice("old", "AISSEE-2027 information bulletin", today.minusDays(5), SiteUpdate.Category.EXAM),
                notice("new", "AISSEE-2027 revised information bulletin", today.minusDays(1), SiteUpdate.Category.EXAM));
        run(0);
        long oldId = stored("old").getId();
        long newId = stored("new").getId();
        mockMvc.perform(post("/api/v1/admin/updates/" + oldId + "/supersede").param("by", String.valueOf(newId))
                .header("Authorization", editorToken())).andExpect(status().isOk());
        assertThat(stored("old").getStatus()).isEqualTo(SiteUpdate.Status.ARCHIVED);
        assertThat(stored("old").getSupersededById()).isEqualTo(newId);
    }

    @Test
    void onlyOneRunAtATimeAcrossServers() throws Exception {
        try (Connection other = dataSource.getConnection()) { // another server holding the run lock
            try (PreparedStatement ps = other.prepareStatement("SELECT pg_advisory_lock(?)")) {
                ps.setLong(1, NotificationSyncService.LOCK_KEY);
                ps.execute();
            }
            assertThat(sync.run(NotificationSyncRun.Trigger.SCHEDULED, "test", morning(0))).isEmpty();
            assertThat(sync.recoverAbandoned()).isZero();
            try (PreparedStatement ps = other.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                ps.setLong(1, NotificationSyncService.LOCK_KEY);
                ps.execute();
            }
        }
        assertThat(sync.run(NotificationSyncRun.Trigger.SCHEDULED, "test", morning(0))).isPresent();
    }

    @Test
    void aRunLeftUnfinishedByAStoppedServerIsMarkedAbandoned() {
        jdbc.update("INSERT INTO notification_sync_run (trigger_kind, status, started_at) VALUES ('SCHEDULED', 'RUNNING', now() - interval '3 hours')");
        assertThat(sync.recoverAbandoned()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM notification_sync_run", String.class)).isEqualTo("ABANDONED");
    }

    @Test
    void publicStatusIsReadOnlyAndStartingACheckNeedsAnAdmin() throws Exception {
        official.list(notice("n1", "AISSEE-2027 notice for the status test", today, SiteUpdate.Category.EXAM));
        sync.run(NotificationSyncRun.Trigger.SCHEDULED, "test").orElseThrow(); // just now

        JsonNode status = objectMapper.readTree(mockMvc.perform(get("/api/v1/updates/sync-status")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(status.path("lastCheckedAt").asText()).isNotBlank();
        assertThat(status.path("schedule").asText()).isEqualTo("Daily at 6:00 AM IST");
        assertThat(status.has("sources")).isTrue();
        assertThat(status.toString()).doesNotContain("error").doesNotContain("test-official");
        mockMvc.perform(post("/api/v1/updates/sync-status")).andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/v1/admin/updates/sync-runs")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/updates/sync")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/updates/sync").header("Authorization", editorToken())).andExpect(status().isForbidden());
        JsonNode runs = objectMapper.readTree(mockMvc.perform(get("/api/v1/admin/updates/sync-runs").header("Authorization", editorToken()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(runs.path("content")).singleElement().satisfies(r -> {
            assertThat(r.path("status").asText()).isEqualTo("SUCCEEDED");
            assertThat(r.path("sources")).extracting(s -> s.path("key").asText()).contains("test-official");
        });
        JsonNode admin = objectMapper.readTree(mockMvc.perform(get("/api/v1/admin/updates/sync-status").header("Authorization", editorToken()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(admin.path("cron").asText()).isEqualTo("0 0 6 * * *");
        assertThat(admin.path("timezone").asText()).isEqualTo("Asia/Kolkata");

        // The last run was moments ago: an admin's "check now" waits for the cool-down.
        mockMvc.perform(post("/api/v1/admin/updates/sync").header("Authorization", adminToken())).andExpect(status().isTooManyRequests());
        jdbc.update("UPDATE notification_sync_run SET started_at = now() - interval '1 hour'");
        mockMvc.perform(post("/api/v1/admin/updates/sync").header("Authorization", adminToken())).andExpect(status().isAccepted());
        long deadline = System.nanoTime() + Duration.ofSeconds(20).toNanos();
        while (jdbc.queryForObject("SELECT count(*) FROM notification_sync_run WHERE trigger_kind = 'MANUAL' AND status <> 'RUNNING'",
                Integer.class) == 0 && System.nanoTime() < deadline) {
            Thread.sleep(100);
        }
        assertThat(jdbc.queryForObject("SELECT triggered_by FROM notification_sync_run WHERE trigger_kind = 'MANUAL'", String.class))
                .isEqualTo(ADMIN);
        mockMvc.perform(post("/api/v1/admin/updates/sync").header("Authorization", adminToken())).andExpect(status().isTooManyRequests());
    }
}
