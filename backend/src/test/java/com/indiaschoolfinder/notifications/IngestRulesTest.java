package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import com.indiaschoolfinder.notifications.opportunity.OpportunityClassifier;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Rules of the ingest step that need no database: careers pages, displayed titles and summaries. */
class IngestRulesTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 14);

    private static OfficialSourceAdapter source(String institution, boolean careersPage) {
        SourceProfile profile = new SourceProfile(institution, "SCHOOL", SiteUpdate.Sector.PRIVATE, true, "RJ", "Ajmer", null,
                SourceProfile.OFFICIAL_SCHOOL_SITE, "HTML_ITEMS", Set.of(SiteUpdate.Category.JOB), true, careersPage);
        return new OfficialSourceAdapter() {
            @Override public String key() { return "test"; }
            @Override public String name() { return institution; }
            @Override public String listingUrl() { return "https://www.example.edu.in/career"; }
            @Override public Set<String> hosts() { return Set.of("www.example.edu.in"); }
            @Override public boolean autoPublish() { return true; }
            @Override public boolean completeListing() { return false; }
            @Override public SourceProfile profile() { return profile; }
            @Override public SourceListing fetch(FetchSession http, LocalDate today) { throw new UnsupportedOperationException(); }
        };
    }

    private static FoundNotice job(String title) {
        return new FoundNotice("x", title, "https://www.example.edu.in/uploads/jobs/1.pdf", DAY, SiteUpdate.Category.JOB, "test", null, null, null);
    }

    @Test
    void aWalkInWhoseDayWasNotReadStaysTenDaysNotFortyFive() {
        LocalDate posted = LocalDate.of(2026, 11, 12);
        var walkIn = OpportunityClassifier.facts(SiteUpdate.Category.JOB, "WALK IN INTERVIEW FOR PGT MATHS", posted);
        assertThat(NotificationIngestService.expiry(posted, null, walkIn, null, 45, 10)).isEqualTo(posted.plusDays(10));
        // "Interview notice for contractual teachers" is attended like a walk-in.
        var interview = OpportunityClassifier.facts(SiteUpdate.Category.JOB, "INTERVIEW NOTICE FOR CONTRACTUAL TEACHERS FOR SESSION 2026-27", posted);
        assertThat(NotificationIngestService.expiry(posted, null, interview, null, 45, 10)).isEqualTo(posted.plusDays(10));
        // With its day known, it stays until that day.
        var dated = OpportunityClassifier.facts(SiteUpdate.Category.JOB, "Walk-in interview for contractual teachers on 25/11/2026", posted);
        assertThat(NotificationIngestService.expiry(posted, null, dated, dated.closesOn(), 45, 10)).isEqualTo(LocalDate.of(2026, 11, 25));
        // Other notices keep the usual lifetime.
        var advert = OpportunityClassifier.facts(SiteUpdate.Category.JOB, "Recruitment of PGT Physics", posted);
        assertThat(NotificationIngestService.expiry(posted, null, advert, null, 45, 10)).isEqualTo(posted.plusDays(45));
        var result = OpportunityClassifier.facts(SiteUpdate.Category.JOB, "Result of walk-in interview for contractual teachers", posted);
        assertThat(NotificationIngestService.expiry(posted, null, result, null, 45, 10)).isEqualTo(posted.plusDays(45));
        // Switched off (0): the usual lifetime.
        assertThat(NotificationIngestService.expiry(posted, null, walkIn, null, 45, 0)).isEqualTo(posted.plusDays(45));
    }

    @Test
    void aNoticePagesHiddenDocumentPageHasTheSameName() {
        assertThat(NotificationSyncService.guessedDocumentPage(
                "https://afsthane.kvs.ac.in/en/advertisement-of-walk-in-interview-for-contractual-teachers-for-the-session-2026-2027/"))
                .isEqualTo("https://afsthane.kvs.ac.in/en/document/advertisement-of-walk-in-interview-for-contractual-teachers-for-the-session-2026-2027/");
        assertThat(NotificationSyncService.guessedDocumentPage("https://afsthane.kvs.ac.in/en/document/x/")).isNull();
        assertThat(NotificationSyncService.guessedDocumentPage("https://cdnbbsr.s3waas.gov.in/s3kv0/uploads/2026/10/1.pdf")).isNull();
        assertThat(NotificationSyncService.guessedDocumentPage("https://afsthane.kvs.ac.in/?p=7543")).isNull();
    }

    @Test
    void anEntryOfACareersPageIsAnOpening() {
        assertThat(NotificationIngestService.facts(source("Mayo College", true), SiteUpdate.Category.JOB, "Engineering Associate, MCGC", DAY)
                .noticeType()).isEqualTo(SiteUpdate.NoticeType.OPENING);
        // Elsewhere the same words say nothing about what kind of notice it is.
        assertThat(NotificationIngestService.facts(source("Mayo College", false), SiteUpdate.Category.JOB, "Engineering Associate, MCGC", DAY)
                .noticeType()).isEqualTo(SiteUpdate.NoticeType.OTHER);
        // A careers page's result is still a result.
        assertThat(NotificationIngestService.facts(source("Mayo College", true), SiteUpdate.Category.JOB, "Result of TGT German interview", DAY)
                .noticeType()).isEqualTo(SiteUpdate.NoticeType.RESULT);
    }

    @Test
    void aSchoolsOwnUploadIsTitledWithTheSchoolAndSummarisedFromItsFactsOnly() {
        OfficialSourceAdapter mayo = source("Mayo College", true);
        assertThat(NotificationIngestService.displayTitle(mayo, job("TGT German Teacher"))).isEqualTo("Mayo College: TGT German Teacher");
        assertThat(NotificationIngestService.displayTitle(mayo, job("Mayo College invites applications for PGT Physics")))
                .isEqualTo("Mayo College invites applications for PGT Physics");
        assertThat(NotificationIngestService.displayTitle(mayo, job("Advt_Recruitment_03_2026"))).isEqualTo("Mayo College: Advt Recruitment 03 2026");

        FoundNotice german = job("TGT German Teacher");
        var facts = NotificationIngestService.facts(mayo, SiteUpdate.Category.JOB, german.title(), DAY);
        assertThat(NotificationIngestService.opportunitySummary(mayo, german, DAY, facts, null))
                .isEqualTo("Mayo College published this notice on 14 Nov 2026: recruitment for TGT (German). No last date is given on the listing. "
                        + "Open the official notice for the posts, eligibility, pay and how to apply.");
        FoundNotice engineer = job("Engineering Associate, MCGC");
        var engineerFacts = NotificationIngestService.facts(mayo, SiteUpdate.Category.JOB, engineer.title(), DAY);
        // No post name to give ("Support Staff" is a kind of staff), so none is claimed.
        assertThat(NotificationIngestService.opportunitySummary(mayo, engineer, DAY, engineerFacts, null))
                .startsWith("Mayo College published this notice on 14 Nov 2026: recruitment. No last date is given on the listing.");
    }
}
