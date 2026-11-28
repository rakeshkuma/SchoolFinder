package com.indiaschoolfinder.notifications.source;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.SiteUpdate;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/** Each adapter against an excerpt of the real page it reads (src/test/resources/notifications, saved 14 Nov 2026). */
class OfficialSourceAdaptersTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

    private static Document html(String name, String baseUri) throws IOException {
        try (InputStream in = OfficialSourceAdaptersTest.class.getResourceAsStream("/notifications/" + name)) {
            return Jsoup.parse(in, null, baseUri);
        }
    }

    @Test
    void ntaKeepsOnlyAisseeAndRimcNoticesDatedByTheirUploadStamp() throws Exception {
        SourceListing l = NtaAisseeAdapter.parse(html("nta-notice-board.html", NtaAisseeAdapter.LISTING), TODAY);

        assertThat(l.listed()).isEqualTo(7);
        assertThat(l.ignored()).isEqualTo(2); // SWAYAM and an old NEET row
        assertThat(l.notices()).extracting(FoundNotice::url, FoundNotice::publishedOn, FoundNotice::category, FoundNotice::topic)
                .containsExactly(
                        tuple("https://nta.ac.in/Download/Notice/Notice_20261103151121.PDF", LocalDate.of(2026, 11, 3), SiteUpdate.Category.EXAM, "aissee"),
                        tuple("https://nta.ac.in/Download/Notice/Notice_20260227175656.pdf", LocalDate.of(2026, 2, 27), SiteUpdate.Category.EXAM, "aissee"),
                        tuple("https://nta.ac.in/Download/Notice/AISSEE_information.pdf", null, SiteUpdate.Category.EXAM, "aissee"),
                        tuple("http://14.139.116.16:90/Download/Notice/Notice_20261101100000.pdf", LocalDate.of(2026, 11, 1), SiteUpdate.Category.EXAM, "aissee"),
                        // NTA also conducts the RIMC entrance exam.
                        tuple("https://nta.ac.in/Download/Notice/Notice_20260901232135.pdf", LocalDate.of(2026, 9, 1), SiteUpdate.Category.EXAM, "rimc"));
        assertThat(l.notices().get(4).linkPath()).isEqualTo("/exams/rimc");
        assertThat(l.notices().get(0).title()).isEqualTo("Inviting Online Application for All India Sainik Schools Entrance Examination(AISSEE)- 2027 reg.");
        assertThat(l.notices().get(0).linkPath()).isEqualTo("/exams/aissee");
    }

    @Test
    void ntaReportsALayoutChangeInsteadOfFindingNothing() {
        assertThatThrownBy(() -> NtaAisseeAdapter.parse(Jsoup.parse("<html><body><table id='other'></table></body></html>"), TODAY))
                .isInstanceOf(SourceLayoutException.class);
    }

    @Test
    void navodayaSortsNoticesAndDropsTendersAndDuplicates() throws Exception {
        JsonNode root;
        try (InputStream in = getClass().getResourceAsStream("/notifications/navodaya-media.json")) {
            root = new ObjectMapper().readTree(in);
        }
        List<JsonNode> items = new ArrayList<>();
        root.path("data").path("items").forEach(items::add);

        SourceListing l = NavodayaAdapter.parse(items, TODAY);

        assertThat(l.listed()).isEqualTo(11);
        assertThat(l.ignored()).isEqualTo(3); // the desks circular, the RFP and the copy of notice 244 posted again as 280
        assertThat(l.notices()).extracting(FoundNotice::itemId, FoundNotice::category, FoundNotice::topic, FoundNotice::publishedOn)
                .contains(
                        tuple("media:343", SiteUpdate.Category.EXAM, "jnvst", LocalDate.of(2026, 10, 29)),
                        tuple("media:265", SiteUpdate.Category.ADMISSION, "navodaya", LocalDate.of(2026, 6, 12)),
                        tuple("media:270", SiteUpdate.Category.EXAM, "nvs-lest", LocalDate.of(2026, 4, 29)),
                        tuple("media:329", SiteUpdate.Category.JOB, "navodaya", LocalDate.of(2026, 10, 7)),
                        tuple("media:244", SiteUpdate.Category.JOB, "navodaya", LocalDate.of(2026, 9, 5)))
                .doesNotContain(tuple("media:280", SiteUpdate.Category.JOB, "navodaya", LocalDate.of(2026, 9, 10)));
        FoundNotice admitCard = l.notices().stream().filter(n -> n.itemId().equals("media:343")).findFirst().orElseThrow();
        assertThat(admitCard.url()).isEqualTo("https://cbseitms.rcil.gov.in/nvs/"); // another site: the ingest step holds it for review
        assertThat(admitCard.linkPath()).isEqualTo("/exams/jnvst");
        FoundNotice job = l.notices().stream().filter(n -> n.itemId().equals("media:329")).findFirst().orElseThrow();
        assertThat(job.url()).isEqualTo("https://navodaya.gov.in/api/public/media/329/download?organization_id=100");
    }

    @Test
    void netarhatUsesThePrintedDateAndKeepsUndatedNoticesForReview() throws Exception {
        SourceListing l = NetarhatAdapter.parse(html("netarhat-home.html", NetarhatAdapter.HOME), TODAY);

        assertThat(l.listed()).isEqualTo(10);
        assertThat(l.notices()).extracting(FoundNotice::url, FoundNotice::publishedOn, FoundNotice::category)
                .containsExactlyInAnyOrder(
                        tuple("https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/24_09_26_dt_ext_notc_304_net_2627.pdf",
                                LocalDate.of(2026, 9, 24), SiteUpdate.Category.EXAM),
                        tuple("https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/140826_advt_net_2627_ntrht.pdf",
                                LocalDate.of(2026, 8, 14), SiteUpdate.Category.EXAM),
                        tuple("https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/admission_net_06102026.pdf",
                                null, SiteUpdate.Category.ADMISSION),
                        tuple("https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/netarhat_adm_06102026.pdf",
                                null, SiteUpdate.Category.EXAM));
        FoundNotice dated = l.notices().stream().filter(FoundNotice::dated).findFirst().orElseThrow();
        assertThat(dated.title()).startsWith("नेतरहाट प्रवेश परीक्षा 2026-27").doesNotStartWith("24-09-2026").doesNotEndWith("|");
    }

    @Test
    void kvsReadsThePublishedOnColumnAndAcceptsAnEmptyAdmissionPage() throws Exception {
        SourceListing jobs = KvsAdapter.parse(html("kvs-interview-notice.html", KvsAdapter.RECRUITMENT), SiteUpdate.Category.JOB, true, TODAY);
        assertThat(jobs.notices()).extracting(FoundNotice::publishedOn)
                .containsExactly(LocalDate.of(2026, 11, 5), LocalDate.of(2026, 10, 30), LocalDate.of(2026, 10, 19));
        assertThat(jobs.notices().get(0).url()).startsWith("https://cdnbbsr.s3waas.gov.in/").endsWith(".pdf");
        assertThat(jobs.notices().get(0).title()).startsWith("Notice for Extension of last date of application");

        SourceListing admissions = KvsAdapter.parse(html("kvs-admission.html", KvsAdapter.ADMISSION), SiteUpdate.Category.ADMISSION, false, TODAY);
        assertThat(admissions.notices()).isEmpty();
        assertThatThrownBy(() -> KvsAdapter.parse(html("kvs-admission.html", KvsAdapter.RECRUITMENT), SiteUpdate.Category.JOB, true, TODAY))
                .isInstanceOf(SourceLayoutException.class);
    }

    @Test
    void rmsNoticesAreUndatedAndClassified() throws Exception {
        SourceListing l = RmsAdapter.parse(html("rms-home.html", RmsAdapter.HOME));
        assertThat(l.notices()).isNotEmpty().allMatch(n -> n.publishedOn() == null);
        assertThat(l.notices()).anySatisfy(n -> {
            assertThat(n.title()).contains("ONLINE INTERVIEW FOR THE POST OF TEACHERS").doesNotContain("CLICK HERE");
            assertThat(n.category()).isEqualTo(SiteUpdate.Category.JOB);
        });
        assertThat(l.notices()).anySatisfy(n -> {
            assertThat(n.title()).contains("shortlisted for interview for admission");
            assertThat(n.category()).isEqualTo(SiteUpdate.Category.ADMISSION);
        });
        assertThat(l.notices()).noneMatch(n -> n.title().toUpperCase().contains("AGREEMENT FORM"));
    }

    @Test
    void cbseCollectsPdfLinksForReviewOnly() throws Exception {
        Document doc = Jsoup.parse("<html><body><a href='/cbsenew/documents/Recruitment_Notice_2026.pdf'>Recruitment of Assistant Secretary 2026</a>"
                + "<a href='/cbsenew/x.pdf'>PDF</a><a href='/about'>About CBSE</a></body></html>", CbseRecruitmentAdapter.LISTING);
        SourceListing l = CbseRecruitmentAdapter.parse(doc);
        assertThat(l.notices()).singleElement().satisfies(n -> {
            assertThat(n.url()).isEqualTo("https://www.cbse.gov.in/cbsenew/documents/Recruitment_Notice_2026.pdf");
            assertThat(n.publishedOn()).isNull();
        });
        assertThat(new CbseRecruitmentAdapter().autoPublish()).isFalse();
    }
}
