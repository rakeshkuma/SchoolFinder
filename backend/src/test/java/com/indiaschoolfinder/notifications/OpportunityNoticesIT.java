package com.indiaschoolfinder.notifications;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indiaschoolfinder.entity.NotificationSource;
import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceLayoutException;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import com.indiaschoolfinder.repository.NotificationSourceRepository;
import com.indiaschoolfinder.repository.SiteUpdatePositionRepository;
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
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admission and job notices end to end against PostgreSQL, with fake sources (no network): facts read from titles,
 * posts, page addresses, the school-post rule, closed and later-step notices, source health in the registry table, the
 * fill-in of notices stored before V47, the Jobs list with filters, and each notice's page head, body and sitemap entry.
 */
@Import(OpportunityNoticesIT.FakeSources.class)
@TestPropertySource(properties = {
        "app.notifications.only-sources=test-board,test-school,test-down",
        "app.notifications.http.retry-backoff=PT0S",
        "app.notifications.http.per-host-interval=PT0S"})
class OpportunityNoticesIT extends AbstractIntegrationTest {

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final String HOST = "jobs.example.gov.in";
    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    static final class FakeSource implements OfficialSourceAdapter {
        final String key;
        final SourceProfile profile;
        volatile List<FoundNotice> notices = List.of();
        volatile boolean down;

        FakeSource(String key, SourceProfile profile) {
            this.key = key;
            this.profile = profile;
        }

        @Override public String key() { return key; }
        @Override public String name() { return key.equals("test-school") ? "Test Sainik School" : "Test Recruitment Board"; }
        @Override public String listingUrl() { return "https://" + HOST + "/" + key + "/"; }
        @Override public Set<String> hosts() { return Set.of(HOST); }
        @Override public boolean autoPublish() { return true; }
        @Override public boolean completeListing() { return false; }
        @Override public SourceProfile profile() { return profile; }

        @Override
        public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException {
            if (down) {
                throw new SourceLayoutException("no entries found");
            }
            return new SourceListing(notices.size(), notices, 0);
        }
    }

    @TestConfiguration
    static class FakeSources {
        @Bean FakeSource testBoard() {
            return new FakeSource("test-board", SourceProfile.national("Test Recruitment Board", "SCHOOL_SYSTEM", false, "HTML",
                    SiteUpdate.Category.JOB, SiteUpdate.Category.ADMISSION));
        }

        @Bean FakeSource testSchool() {
            return new FakeSource("test-school", new SourceProfile("Test Sainik School", "SCHOOL", SiteUpdate.Sector.GOVERNMENT, true,
                    "DL", "New Delhi", null, SourceProfile.OFFICIAL_SCHOOL_SITE, "WP_MEDIA",
                    Set.of(SiteUpdate.Category.JOB, SiteUpdate.Category.ADMISSION), true));
        }

        @Bean FakeSource testDown() {
            FakeSource f = new FakeSource("test-down", SourceProfile.national("Test Offline Board", "RECRUITMENT_BODY", null, "HTML",
                    SiteUpdate.Category.JOB));
            f.down = true;
            return f;
        }
    }

    @Autowired NotificationSyncService sync;
    @Autowired NotificationIngestService ingest;
    @Autowired SiteUpdateRepository updates;
    @Autowired SiteUpdatePositionRepository positions;
    @Autowired NotificationSourceRepository sources;
    @Autowired List<FakeSource> fakes;

    private FakeSource board;
    private FakeSource school;
    private LocalDate today;

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE site_update, notification_sync_run, notification_source RESTART IDENTITY CASCADE");
        board = fakes.stream().filter(f -> f.key.equals("test-board")).findFirst().orElseThrow();
        school = fakes.stream().filter(f -> f.key.equals("test-school")).findFirst().orElseThrow();
        board.notices = List.of();
        school.notices = List.of();
        today = LocalDate.now(INDIA);
    }

    private NotificationSyncRun run(int days) {
        return sync.run(NotificationSyncRun.Trigger.SCHEDULED, "test", today.plusDays(days).atTime(6, 0).atZone(INDIA).toInstant()).orElseThrow();
    }

    private static FoundNotice notice(String id, String title, LocalDate published, SiteUpdate.Category category) {
        return new FoundNotice(id, title, "https://" + HOST + "/files/" + id + ".pdf", published, category, "test", null, null, null);
    }

    private SiteUpdate stored(String itemId) {
        return updates.findAll().stream().filter(u -> itemId.equals(u.getSourceItemId())).findFirst().orElseThrow();
    }

    private JsonNode getJson(String url) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private String getText(String url) throws Exception {
        return mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    void aWalkInNoticeGetsItsFactsItsPostsAndAPageOfItsOwn() throws Exception {
        LocalDate walkIn = today.plusDays(10);
        school.notices = List.of(notice("walk-in", "Walk-in interview for PGT Physics, PGT Chemistry and TGT Maths on contract basis on "
                + walkIn.format(DMY), today.minusDays(1), SiteUpdate.Category.JOB));

        NotificationSyncRun r = run(0);

        assertThat(r.getItemsPublished()).isEqualTo(1);
        assertThat(sync.results(r)).filteredOn(s -> s.key.equals("test-school")).singleElement()
                .satisfies(s -> assertThat(s.createdJobs).isEqualTo(1));
        SiteUpdate u = stored("walk-in");
        assertThat(u.getTitle()).startsWith("Test Sainik School: Walk-in interview"); // a school's own upload names the school
        assertThat(u.getNoticeType()).isEqualTo(SiteUpdate.NoticeType.OPENING);
        assertThat(u.getPostTypes()).isEqualTo("PGT,TGT");
        assertThat(u.getSubjects()).contains("Physics", "Chemistry", "Mathematics");
        assertThat(u.getEmploymentType()).isEqualTo(SiteUpdate.EmploymentType.CONTRACT);
        assertThat(u.getClosesOn()).isEqualTo(walkIn);
        assertThat(u.getEventDate()).isEqualTo(walkIn);
        assertThat(u.getEventLabel()).isEqualTo("Walk-in interview");
        assertThat(u.isDeadline()).isTrue();
        assertThat(u.getExpiresOn()).isEqualTo(walkIn); // off the current feed once the walk-in has passed
        assertThat(u.getInstitutionName()).isEqualTo("Test Sainik School");
        assertThat(u.getSector()).isEqualTo(SiteUpdate.Sector.GOVERNMENT);
        assertThat(u.getBoarding()).isTrue();
        assertThat(u.getStateCode()).isEqualTo("DL");
        assertThat(u.getSlug()).startsWith("test-sainik-school-walk-in-interview-for-pgt-physics");
        assertThat(u.getSummary()).contains("Test Sainik School published this notice on").contains("Walk-in interview: ");
        assertThat(positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(u.getId()))
                .extracting(p -> p.getPostName()).containsExactly("PGT (Physics)", "PGT (Chemistry)", "TGT (Mathematics)");

        // The card opens the notice's page, with the status the dates give.
        JsonNode item = getJson("/api/v1/updates?category=JOB").at("/content/0");
        assertThat(item.path("linkPath").asText()).isEqualTo("/jobs/" + u.getSlug());
        assertThat(item.path("applicationStatus").asText()).isEqualTo("CLOSING_SOON");
        assertThat(item.path("noticeType").asText()).isEqualTo("OPENING");
        assertThat(item.path("eventLabel").asText()).isEqualTo("Walk-in interview");

        JsonNode detail = getJson("/api/v1/notices/" + u.getSlug());
        assertThat(detail.path("applicationStatusLabel").asText()).isEqualTo("Closing soon");
        assertThat(detail.path("indexable").asBoolean()).isTrue();
        assertThat(detail.path("positions")).hasSize(3);
        List<String> questions = new ArrayList<>();
        detail.path("answers").forEach(a -> questions.add(a.path("question").asText()));
        assertThat(questions).contains("When is the walk-in interview?", "Which posts does the notice cover?", "Where is the official notice?",
                "When was this information last checked?");

        String head = getText("/api/v1/seo/head/jobs/" + u.getSlug());
        assertThat(head).contains("<link rel=\"canonical\" href=\"http://localhost/jobs/" + u.getSlug() + "\"")
                .contains("\"@type\":\"JobPosting\"").contains("\"validThrough\":\"" + walkIn + "T23:59:59+05:30\"")
                .contains("\"employmentType\":\"CONTRACTOR\"").contains("\"addressRegion\":\"Delhi\"")
                .contains("\"@type\":\"BreadcrumbList\"").doesNotContain("noindex").doesNotContain("baseSalary").doesNotContain("directApply");
        String body = getText("/api/v1/seo/body/jobs/" + u.getSlug());
        assertThat(body).contains("<h1>Test Sainik School: Walk-in interview").contains("Questions and answers")
                .contains("PGT (Physics)").contains("https://" + HOST + "/files/walk-in.pdf");
        assertThat(getText("/sitemaps/notices.xml")).contains("<loc>http://localhost/jobs/" + u.getSlug() + "</loc>");
        assertThat(getText("/sitemap.xml")).contains("<loc>http://localhost/sitemaps/notices.xml</loc>");

        // The next morning's run changes nothing.
        NotificationSyncRun again = run(1);
        assertThat(again.getItemsCreated()).isZero();
        assertThat(again.getItemsUpdated()).isZero();
        assertThat(stored("walk-in").getSlug()).isEqualTo(u.getSlug());
    }

    @Test
    void aSchoolSystemsNoticeForAPostThatIsNotSchoolEmploymentWaitsForAnEditor() {
        board.notices = List.of(
                notice("engineer", "Recruitment of Executive Engineer (Civil) on deputation basis", today.minusDays(1), SiteUpdate.Category.JOB),
                notice("teachers", "Recruitment of PGT and TGT teachers 2026", today.minusDays(1), SiteUpdate.Category.JOB));

        run(0);

        assertThat(stored("engineer").getStatus()).isEqualTo(SiteUpdate.Status.PENDING_REVIEW);
        assertThat(stored("engineer").getReviewNote()).contains("does not look like school employment");
        assertThat(stored("teachers").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
    }

    @Test
    void aNonSchoolPostPublishedEarlierStaysListedButLastAndIsNotIndexed() throws Exception {
        board.notices = List.of(
                notice("engineer", "Notice for Extension of last date of application for filling up the post of Superintending Engineer",
                        today.minusDays(1), SiteUpdate.Category.JOB),
                notice("teachers", "Recruitment of PGT and TGT teachers 2026", today.minusDays(3), SiteUpdate.Category.JOB));
        run(0);
        // As the earlier rules did: published without review.
        SiteUpdate engineer = stored("engineer");
        engineer.setStatus(SiteUpdate.Status.PUBLISHED);
        engineer.setReviewNote(null);
        updates.save(engineer);

        List<String> order = new ArrayList<>();
        getJson("/api/v1/updates?category=JOB").path("content").forEach(n -> order.add(n.path("title").asText()));
        assertThat(order).containsExactly("Recruitment of PGT and TGT teachers 2026",
                "Notice for Extension of last date of application for filling up the post of Superintending Engineer");
        assertThat(getJson("/api/v1/notices/" + engineer.getSlug()).path("indexable").asBoolean()).isFalse();
        assertThat(getText("/api/v1/seo/head/jobs/" + engineer.getSlug())).contains("noindex").doesNotContain("JobPosting");
    }

    @Test
    void anOpeningWhoseLastDateHasPassedIsNotAddedAndResultsAreListedButNotIndexed() throws Exception {
        board.notices = List.of(
                notice("closed", "Recruitment of TGT English. Last date: " + today.minusDays(1).format(DMY), today.minusDays(5), SiteUpdate.Category.JOB),
                notice("result", "Final result for the post of TGT English", today.minusDays(1), SiteUpdate.Category.JOB));

        NotificationSyncRun r = run(0);

        assertThat(sync.results(r)).filteredOn(s -> s.key.equals("test-board")).singleElement()
                .satisfies(s -> assertThat(s.tooOld).isEqualTo(1));
        assertThat(updates.findAll()).noneMatch(u -> "closed".equals(u.getSourceItemId()));
        SiteUpdate result = stored("result");
        assertThat(result.getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        assertThat(result.getNoticeType()).isEqualTo(SiteUpdate.NoticeType.RESULT);
        JsonNode detail = getJson("/api/v1/notices/" + result.getSlug());
        assertThat(detail.path("applicationStatus").isNull()).isTrue(); // a result has no application window
        assertThat(detail.path("indexable").asBoolean()).isFalse();
        String head = getText("/api/v1/seo/head/jobs/" + result.getSlug());
        assertThat(head).contains("noindex").doesNotContain("JobPosting").doesNotContain("rel=\"canonical\"");
        assertThat(getText("/sitemaps/notices.xml")).doesNotContain(result.getSlug());
        // A job's page is not an admission page.
        assertThat(getText("/api/v1/seo/head/admissions/" + result.getSlug())).contains("noindex");
    }

    @Test
    void theRegistryTableRecordsEachSourcesHealthAndAFailingSourceStopsNothing() {
        board.notices = List.of(notice("teachers", "Recruitment of PRT teachers", today, SiteUpdate.Category.JOB));

        NotificationSyncRun first = run(0);
        run(1);

        assertThat(first.getStatus()).isEqualTo(NotificationSyncRun.Status.PARTIAL);
        NotificationSource ok = sources.findById("test-board").orElseThrow();
        assertThat(ok.getLastOutcome()).isEqualTo("OK");
        assertThat(ok.getLastSuccessAt()).isNotNull();
        assertThat(ok.getConsecutiveFailures()).isZero();
        assertThat(ok.getSourceCategory()).isEqualTo("SCHOOL_SYSTEM");
        NotificationSource down = sources.findById("test-down").orElseThrow();
        assertThat(down.getLastOutcome()).isEqualTo("FAILED");
        assertThat(down.getLastSuccessAt()).isNull();
        assertThat(down.getConsecutiveFailures()).isEqualTo(2);
        assertThat(down.getLastError()).contains("no entries found");
        // The registry file's sources are registered too (switched off here by only-sources).
        NotificationSource dsssb = sources.findById("dsssb").orElseThrow();
        assertThat(dsssb.isEnabled()).isFalse();
        assertThat(dsssb.getExtractionMethod()).isEqualTo("HTML_ITEMS");
        assertThat(dsssb.getLastAttemptAt()).isNull();
        assertThat(stored("teachers").getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
    }

    @Test
    void noticesStoredBeforeTheirFactsExistedGetThemAndAPage() {
        SiteUpdate old = new SiteUpdate();
        old.setOrigin(SiteUpdate.Origin.OFFICIAL_SYNC);
        old.setSourceKey("test-board");
        old.setSourceItemId("https://" + HOST + "/files/old.pdf");
        old.setCategory(SiteUpdate.Category.JOB);
        old.setTitle("Recruitment Notification No.1/2025 - Filling up the Teaching and Non-Teaching posts");
        old.setOfficialTitle(old.getTitle());
        old.setSummary("Test Recruitment Board published this notice. Open the official notice for the posts.");
        old.setPublishedOn(today.minusDays(3));
        old.setSourceUrl("https://" + HOST + "/files/old.pdf");
        old.setStatus(SiteUpdate.Status.PUBLISHED);
        old.setContentHash("before-v47");
        old.setExpiresOn(today.plusDays(40));
        old = updates.save(old);

        run(0);

        SiteUpdate after = updates.findById(old.getId()).orElseThrow();
        assertThat(after.getSlug()).isNotNull();
        assertThat(after.getNoticeType()).isEqualTo(SiteUpdate.NoticeType.OPENING);
        assertThat(after.getStaffKind()).isEqualTo(SiteUpdate.StaffKind.MIXED);
        assertThat(after.getInstitutionName()).isEqualTo("Test Recruitment Board");
        assertThat(after.getSummary()).isEqualTo(old.getSummary()); // the wording is left alone
        assertThat(after.getExpiresOn()).isEqualTo(today.plusDays(40));
    }

    @Test
    void theJobsListFiltersByStatePostAndSectorAndOffersItsChoices() throws Exception {
        editorial("Delhi PGT recruitment", "DL", SiteUpdate.Sector.GOVERNMENT, false, "PGT", today.plusDays(20));
        editorial("Bihar head teacher recruitment", "BR", SiteUpdate.Sector.GOVERNMENT, false, "HEADMASTER", null);
        editorial("Boarding school housemaster", "UK", SiteUpdate.Sector.PRIVATE, true, "WARDEN", today.plusDays(3));

        JsonNode all = getJson("/api/v1/notices?category=JOB");
        assertThat(all.path("current").asInt()).isEqualTo(3);
        // Open ones first, nearest last date first; the one without a last date after them.
        List<String> order = new ArrayList<>();
        all.path("page").path("content").forEach(n -> order.add(n.path("title").asText()));
        assertThat(order).containsExactly("Boarding school housemaster", "Delhi PGT recruitment", "Bihar head teacher recruitment");
        List<String> states = new ArrayList<>();
        all.path("facets").path("states").forEach(f -> states.add(f.path("value").asText() + ":" + f.path("count").asInt()));
        assertThat(states).containsExactlyInAnyOrder("BR:1", "DL:1", "UK:1");

        assertThat(getJson("/api/v1/notices?category=JOB&state=DL").path("page").path("content")).hasSize(1);
        assertThat(getJson("/api/v1/notices?category=JOB&post=WARDEN").path("page").path("content").get(0).path("title").asText())
                .isEqualTo("Boarding school housemaster");
        assertThat(getJson("/api/v1/notices?category=JOB&sector=BOARDING").path("page").path("content")).hasSize(1);
        assertThat(getJson("/api/v1/notices?category=JOB&status=DATE_NOT_ANNOUNCED").path("page").path("content")).hasSize(1);
        mockMvc.perform(get("/api/v1/notices?category=EXAM")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/notices/no-such-notice")).andExpect(status().isNotFound());

        String jobsHead = getText("/api/v1/seo/head/jobs");
        assertThat(jobsHead).contains("<link rel=\"canonical\" href=\"http://localhost/jobs\"").contains("3 current school job notices");
        // Filter combinations are one page for search engines.
        assertThat(getText("/api/v1/seo/head/jobs?state=DL")).contains("href=\"http://localhost/jobs\"");
        assertThat(getText("/api/v1/seo/body/jobs")).contains("Delhi PGT recruitment").contains("Boarding school housemaster");

        // Job markup only with an official last date still ahead; without one the page is indexed as an ordinary page.
        assertThat(getText("/api/v1/seo/head/jobs/delhi-pgt-recruitment")).contains("\"@type\":\"JobPosting\"");
        String noLastDate = getText("/api/v1/seo/head/jobs/bihar-head-teacher-recruitment");
        assertThat(noLastDate).contains("rel=\"canonical\"").doesNotContain("JobPosting").doesNotContain("noindex");
    }

    @Test
    void aNoticeWaitingForReviewHasNoPublicPage() throws Exception {
        board.notices = List.of(new FoundNotice("undated", "Recruitment of TGT Hindi", "https://" + HOST + "/files/undated.pdf", null,
                SiteUpdate.Category.JOB, "test", null, null, null));
        run(0);
        SiteUpdate pending = stored("undated");
        assertThat(pending.getStatus()).isEqualTo(SiteUpdate.Status.PENDING_REVIEW);
        assertThat(pending.getSlug()).isNotNull();
        mockMvc.perform(get("/api/v1/notices/" + pending.getSlug())).andExpect(status().isNotFound());
        assertThat(getText("/api/v1/seo/head/jobs/" + pending.getSlug())).contains("noindex");
    }

    @Test
    void aWalkInsDayIsReadFromItsOfficialDocumentWhenItsTitleGivesNone() {
        school.notices = List.of(notice("walkin", "Walk-in interview for contractual teachers 2026-27", today.minusDays(2), SiteUpdate.Category.JOB));
        run(0);
        SiteUpdate before = stored("walkin");
        assertThat(before.getClosesOn()).isNull();
        assertThat(before.getStatus()).isEqualTo(SiteUpdate.Status.PUBLISHED);
        // Its day unknown so far: current for 10 days after its publication, not 45.
        assertThat(before.getExpiresOn()).isEqualTo(today.minusDays(2).plusDays(10));
        LocalDate interview = today.plusDays(5);
        String text = "PM SHRI KENDRIYA VIDYALAYA WALK-IN-INTERVIEW F.No. KV/2026-27/412 Dated: " + today.minusDays(2).format(DMY)
                + " A walk-in interview for preparing a panel of contractual teachers will be held on " + interview.format(DMY)
                + " at 09:00 AM in the Vidyalaya premises. PRINCIPAL";
        String document = "https://" + HOST + "/files/walkin-notice.pdf";

        assertThat(ingest.applyDocument(school, before.getId(), document, text)).isTrue();
        SiteUpdate after = stored("walkin");
        assertThat(after.getClosesOn()).isEqualTo(interview);
        assertThat(after.getExamOn()).isEqualTo(interview);
        assertThat(after.getEventDate()).isEqualTo(interview);
        assertThat(after.getEventLabel()).isEqualTo("Walk-in interview");
        assertThat(after.isDeadline()).isTrue();
        assertThat(after.getExpiresOn()).isEqualTo(interview); // off the current list once the interview is over
        assertThat(after.getSummary()).contains("Walk-in interview").contains("as the official notice states");
        assertThat(after.getSourceUrl()).isEqualTo(before.getSourceUrl()); // the notice's own page stays its link
        // Once only: a notice with its date is not read again.
        assertThat(ingest.applyDocument(school, before.getId(), document, text)).isFalse();
    }

    @Test
    void anUndatedWalkInFoundMoreThanTenDaysAfterItsNoticeIsNotAdded() {
        school.notices = List.of(
                notice("late", "Walk-in interview for contractual teachers 2026-27", today.minusDays(12), SiteUpdate.Category.JOB),
                notice("advert", "Recruitment of PGT Physics on regular basis", today.minusDays(12), SiteUpdate.Category.JOB));
        NotificationSyncRun r = run(0);
        assertThat(updates.findAll()).extracting(SiteUpdate::getSourceItemId).containsExactly("advert");
        assertThat(sync.results(r)).filteredOn(s -> s.key.equals("test-school")).singleElement()
                .satisfies(s -> assertThat(s.tooOld).isEqualTo(1));
    }

    @Test
    void aDocumentWhoseOnlyDateIsItsOwnChangesNothing() {
        school.notices = List.of(notice("walkin2", "Walk-in interview for contractual teachers 2026-27", today.minusDays(2), SiteUpdate.Category.JOB));
        run(0);
        SiteUpdate before = stored("walkin2");
        String text = "Walk-in interview for contractual teachers. Dated: " + today.minusDays(2).format(DMY) + ". The date will be announced.";
        assertThat(ingest.applyDocument(school, before.getId(), "https://" + HOST + "/files/w.pdf", text)).isFalse();
        SiteUpdate after = stored("walkin2");
        assertThat(after.getClosesOn()).isNull();
        assertThat(after.getExpiresOn()).isEqualTo(before.getExpiresOn());
        assertThat(after.getSummary()).isEqualTo(before.getSummary());
    }

    @Test
    void aRunKeepsAFamilysQuietSitesAsOneLine() {
        java.util.function.BiFunction<String, String, SourceResult> result = (key, outcome) -> {
            SourceResult r = new SourceResult(key, key);
            r.outcome = outcome;
            r.listed = 10;
            r.ignored = 10;
            return r;
        };
        SourceResult board = result.apply("test-board", "OK");
        SourceResult quiet = result.apply("kv-mankhurd", "OK");
        quiet.tooOld = 2;
        SourceResult found = result.apply("kv-samanaafs", "OK");
        found.created = 1;
        found.createdJobs = 1;
        SourceResult down = result.apply("kv-sukna", "FAILED");
        SourceResult off = result.apply("kv-tonk", "SKIPPED");

        List<SourceResult> kept = sync.stored(List.of(board, quiet, found, down, off));

        assertThat(kept).extracting(r -> r.key).containsExactly("test-board", "kv", "kv-samanaafs", "kv-sukna");
        SourceResult family = kept.get(1);
        assertThat(family.name).isEqualTo("Kendriya Vidyalaya websites: 1 site(s) read with nothing new, 1 skipped");
        assertThat(family.outcome).isEqualTo("OK");
        assertThat(family.listed).isEqualTo(20);
        assertThat(family.tooOld).isEqualTo(2);
        assertThat(family.created).isZero();
    }

    @Test
    void anAdminRowWithItsFactsCanBeSavedBackUnchanged() throws Exception {
        board.notices = List.of(notice("teachers", "Recruitment of PGT Physics, last date " + today.plusDays(9).format(DMY),
                today.minusDays(1), SiteUpdate.Category.JOB));
        run(0);
        long id = stored("teachers").getId();
        JsonNode rows = objectMapper.readTree(mockMvc.perform(get("/api/v1/admin/updates?status=PUBLISHED").header("Authorization", editorToken()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("content");
        JsonNode row = null;
        for (JsonNode r : rows) if (r.path("id").asLong() == id) row = r;
        assertThat(row).isNotNull();
        assertThat(row.path("details").has("windowValid")).isFalse(); // a validation rule, not a field
        saveAsAdminPage(id, row).andExpect(status().isOk());
        SiteUpdate saved = updates.findById(id).orElseThrow();
        assertThat(saved.getClosesOn()).isEqualTo(today.plusDays(9));
        assertThat(saved.getPostTypes()).isEqualTo("PGT");
        assertThat(saved.isStaffEdited()).isTrue();

        // The rule still applies: facts that open after their last date are refused, and nothing is saved.
        ObjectNode wrong = row.deepCopy();
        ((ObjectNode) wrong.get("details")).put("opensOn", today.plusDays(10).toString());
        String refused = saveAsAdminPage(id, wrong).andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        assertThat(refused).contains("opensOn must not be after closesOn");
        assertThat(updates.findById(id).orElseThrow().getOpensOn()).isEqualTo(saved.getOpensOn());
    }

    /** Saves an update as the admin page sends it: every request field of its admin row, with the facts exactly as they came. */
    private ResultActions saveAsAdminPage(long id, JsonNode row) throws Exception {
        Map<String, Object> request = new LinkedHashMap<>();
        for (String field : List.of("category", "title", "summary", "imageUrl", "publishedOn", "eventDate", "eventLabel", "deadline", "sourceUrl",
                "sourceName", "linkPath", "actionLabel", "verificationStatus", "expiresOn", "priority", "details")) {
            request.put(field, objectMapper.treeToValue(row.get(field), Object.class));
        }
        return mockMvc.perform(put("/api/v1/admin/updates/" + id).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(json(request)));
    }

    private void editorial(String title, String state, SiteUpdate.Sector sector, boolean boarding, String post, LocalDate closes) {
        SiteUpdate u = new SiteUpdate();
        u.setCategory(SiteUpdate.Category.JOB);
        u.setTitle(title);
        u.setSummary("An editor's job notice, citing its official source.");
        u.setPublishedOn(today.minusDays(2));
        u.setSourceUrl("https://" + HOST + "/files/" + title.hashCode() + ".pdf");
        u.setSourceName("Test board");
        u.setStatus(SiteUpdate.Status.PUBLISHED);
        u.setVerificationStatus(VerificationStatus.VERIFIED);
        u.setStateCode(state);
        u.setSector(sector);
        u.setBoarding(boarding);
        u.setPostTypes(post);
        u.setStaffKind(SiteUpdate.StaffKind.TEACHING);
        u.setNoticeType(SiteUpdate.NoticeType.OPENING);
        u.setClosesOn(closes);
        // As the editor's form stores a last date: the card's date line.
        u.setEventDate(closes);
        u.setEventLabel(closes == null ? null : "Last date");
        u.setDeadline(closes != null);
        u.setSlug(title.toLowerCase().replace(' ', '-'));
        u.setExpiresOn(today.plusDays(40));
        updates.save(u);
    }
}
