package com.indiaschoolfinder.notifications.registry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.SiteUpdate.Category;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceListing;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/**
 * The reviewed source registry (notifications/sources.json) and each way of reading a source, against excerpts of the
 * real pages saved on 19 Nov 2026 (src/test/resources/notifications). No network.
 */
class RegistrySourceAdapterTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 19);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final SourceRegistry REGISTRY = new SourceRegistry(JSON);

    private static RegistrySourceAdapter source(String key) {
        return REGISTRY.adapters().stream().filter(a -> a.key().equals(key)).map(RegistrySourceAdapter.class::cast).findFirst()
                .orElseThrow(() -> new AssertionError("no registry source " + key));
    }

    private static RegistrySourceAdapter.Collector collector(RegistrySourceAdapter a) {
        return new RegistrySourceAdapter.Collector(new RegistrySourceAdapter.Rules(a.definition(), a.profile().noticeTypes()), TODAY);
    }

    private static Document html(String name, String baseUri) throws IOException {
        try (InputStream in = RegistrySourceAdapterTest.class.getResourceAsStream("/notifications/" + name)) {
            return Jsoup.parse(in, null, baseUri);
        }
    }

    @Test
    void theRegistryFileIsCleanAndComplete() {
        assertThat(REGISTRY.problems()).isEmpty();
        List<OfficialSourceAdapter> all = REGISTRY.adapters();
        assertThat(all).filteredOn(a -> a.family() == null).hasSize(15);
        assertThat(all).filteredOn(a -> a.family() != null).hasSize(1107);
        Set<String> keys = new HashSet<>();
        for (OfficialSourceAdapter a : all) {
            assertThat(keys.add(a.key())).as("unique key %s", a.key()).isTrue();
            assertThat(a.listingUrl()).startsWith("https://");
            assertThat(a.profile().noticeTypes()).isNotEmpty().allMatch(c -> c == Category.ADMISSION || c == Category.JOB);
            assertThat(((RegistrySourceAdapter) a).definition().checked()).as("%s was looked at by a person", a.key()).isNotBlank();
        }
        // Built-in adapter keys are not reused.
        assertThat(keys).doesNotContain("kvs", "navodaya", "nta-aissee", "netarhat", "rms", "cbse-recruitment");
        // School sites name their schools; commissions keep school posts only.
        assertThat(source("sainik-school-korukonda").profile().schoolSlug()).isEqualTo("sainik-school-vizianagaram");
        assertThat(source("bpsc").schoolPostsOnly()).isTrue();
        assertThat(source("dsssb").schoolPostsOnly()).isTrue();
        // A page without dates is review-only.
        assertThat(source("nests-emrs").autoPublish()).isFalse();
        assertThat(source("nests-emrs").reviewOnlyReason()).contains("without dates");
    }

    @Test
    void kendriyaVidyalayaWebsitesAreOneFamilyEachWithItsOwnSchool() {
        List<OfficialSourceAdapter> kv = REGISTRY.adapters().stream().filter(a -> a.family() != null).toList();
        assertThat(kv).allMatch(a -> a.key().startsWith("kv-") && "kv".equals(a.family().key()) && a.family().sites() == 1107);
        assertThat(kv).allMatch(a -> a.hosts().size() == 1 && a.hosts().iterator().next().endsWith(".kvs.ac.in"));
        assertThat(kv).allMatch(a -> a.profile().schoolSlug().startsWith("cbse:") && a.profile().stateCode() != null);
        RegistrySourceAdapter mankhurd = source("kv-mankhurd");
        assertThat(mankhurd.name()).isEqualTo("PM SHRI Kendriya Vidyalaya Mankhurd");
        assertThat(mankhurd.listingUrl()).isEqualTo("https://mankhurd.kvs.ac.in/en/latest-news/");
        assertThat(mankhurd.hosts()).containsExactly("mankhurd.kvs.ac.in");
        assertThat(mankhurd.documentHosts()).containsExactlyInAnyOrder("mankhurd.kvs.ac.in", "cdnbbsr.s3waas.gov.in");
        assertThat(mankhurd.profile().institution()).isEqualTo("PM SHRI Kendriya Vidyalaya Mankhurd");
        assertThat(mankhurd.profile().stateCode()).isEqualTo("MH");
        assertThat(mankhurd.profile().city()).isEqualTo("Mumbai");
        assertThat(mankhurd.profile().schoolSlug()).isEqualTo("cbse:1100047");
        assertThat(mankhurd.profile().sector()).isEqualTo(com.indiaschoolfinder.entity.SiteUpdate.Sector.GOVERNMENT);
        assertThat(mankhurd.profile().noticeTypes()).containsExactly(Category.JOB);
        assertThat(mankhurd.readDocuments()).isTrue();
        assertThat(mankhurd.autoPublish()).isTrue();
        assertThat(mankhurd.completeListing()).isFalse(); // the news table keeps its history; nothing is withdrawn
    }

    @Test
    void aFamilySiteListWithAMistakeLeavesOutOnlyThatSite() {
        assertThat(SourceRegistry.Csv.read("id,host,name,state,city,school\r\na,\"x, y\",\"Say \"\"hi\"\"\",DL,,cbse:1\n"))
                .containsExactly(List.of("id", "host", "name", "state", "city", "school"), List.of("a", "x, y", "Say \"hi\"", "DL", "", "cbse:1"));
        assertThatThrownBy(() -> SourceRegistry.Csv.read("id,\"open")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aKendriyaVidyalayasNewsKeepsItsTeacherNoticesAndLeavesOutFormsAndAdmissions() throws Exception {
        RegistrySourceAdapter samana = source("kv-samanaafs");
        RegistrySourceAdapter.Collector c = new RegistrySourceAdapter.Collector(
                new RegistrySourceAdapter.Rules(samana.definition(), samana.profile().noticeTypes()), LocalDate.of(2026, 11, 20));
        RegistrySourceAdapter.parseItems(html("kv-latest-news-samana.html", "https://samanaafs.kvs.ac.in/en/latest-news/"), c);
        SourceListing listing = c.listing();
        assertThat(listing.listed()).isEqualTo(8);
        // The bio-data form and the eligibility page (spelt "Eligilblity" by the site) support the interview notice; admission
        // lists, the auction notice and the rest are not jobs.
        assertThat(listing.notices()).extracting(FoundNotice::title, FoundNotice::publishedOn, FoundNotice::url, FoundNotice::category)
                .containsExactly(tuple("part time contractual interview (session 2026-27)", LocalDate.of(2026, 11, 19),
                        "https://samanaafs.kvs.ac.in/en/part-time-contractual-interview-session-2026-27/", Category.JOB));
        assertThat(listing.ignored()).isEqualTo(7);
    }

    /** Titles from the Vidyalayas' news on 20 Nov 2026 that are about teachers or vacancies but are not job openings. */
    @Test
    void aKendriyaVidyalayasNewsLeavesOutWorkshopsStudentVacanciesAndSupportingPages() {
        RegistrySourceAdapter kv = source("kv-chhattarpur");
        RegistrySourceAdapter.Collector c = new RegistrySourceAdapter.Collector(
                new RegistrySourceAdapter.Rules(kv.definition(), kv.profile().noticeTypes()), LocalDate.of(2026, 11, 20));
        LocalDate d = LocalDate.of(2026, 11, 10);
        c.consider("Two-Day Regional Training Workshop for Teachers under KVS Civic Behaviour programme", "https://chhattarpur.kvs.ac.in/en/a/", d, null, null);
        c.consider("Vacancies for students in OBC category in Balvatika 2", "https://chhattarpur.kvs.ac.in/en/b/", d, null, null);
        c.consider("Part Time Contractual Bio Data Form", "https://chhattarpur.kvs.ac.in/en/c/", d, null, null);
        c.consider("Eligibility Criteria for the post of PGT Commerece, TGT English and Educational Counsellor", "https://chhattarpur.kvs.ac.in/en/d/", d, null, null);
        c.consider("Selected Panel for contractual teachers", "https://chhattarpur.kvs.ac.in/en/e/", d, null, null);
        c.consider("Annual Panel Inspection will be held on 03.11.2026.", "https://chhattarpur.kvs.ac.in/en/f/", d, null, null);
        c.consider("Panel of the candidates of contractual teachers for the interview held on 10.10.2026", "https://chhattarpur.kvs.ac.in/en/h/", d, null, null);
        c.consider("EMPANELLED CANDIDATES FOR APPOINTMENT ON PART-TIME CONTRACTUAL BASIS", "https://chhattarpur.kvs.ac.in/en/i/", d, null, null);
        c.consider("Panel for Part Time Contractual Teacher (TGT-Sanskrit) for the session 2026-27", "https://chhattarpur.kvs.ac.in/en/j/", d, null, null);
        c.consider("INTERVIEW NOTICE FOR CONTRACTUAL TEACHERS FOR SESSION 2026-27", "https://chhattarpur.kvs.ac.in/en/g/", d, null, null);
        // "Preparing a panel" in a walk-in notice is the opening itself.
        c.consider("Walk-in interview for preparing a panel of contractual teachers on 25.11.2026", "https://chhattarpur.kvs.ac.in/en/k/", d, null, null);
        assertThat(c.listing().notices()).extracting(FoundNotice::title).containsExactly("INTERVIEW NOTICE FOR CONTRACTUAL TEACHERS FOR SESSION 2026-27",
                "Walk-in interview for preparing a panel of contractual teachers on 25.11.2026");
        assertThat(c.listing().ignored()).isEqualTo(9);
    }

    @Test
    void aNoticePageWithoutAPdfLeadsToItsDocumentPage() throws Exception {
        Document page = html("kv-notice-mankhurd.html", "https://mankhurd.kvs.ac.in/en/walk-in-interview-21-11-26/");
        Set<String> hosts = Set.of("mankhurd.kvs.ac.in", "cdnbbsr.s3waas.gov.in");
        assertThat(com.indiaschoolfinder.notifications.NotificationSyncService.documentLink(page, hosts)).isNull();
        assertThat(com.indiaschoolfinder.notifications.NotificationSyncService.documentPage(page, Set.of("mankhurd.kvs.ac.in")))
                .isEqualTo("https://mankhurd.kvs.ac.in/en/document/walk-in-interview-21-11-26/");
    }

    @Test
    void aKendriyaVidyalayaNoticePagesDocumentIsThePdfInItsMainContent() throws Exception {
        Document page = html("kv-notice-page.html",
                "https://ssbpaliakalan.kvs.ac.in/en/advertisement-for-interview-for-the-post-of-contractual-pgt-english-for-the-session-2026-27/");
        assertThat(com.indiaschoolfinder.notifications.NotificationSyncService.documentLink(page, Set.of("ssbpaliakalan.kvs.ac.in", "cdnbbsr.s3waas.gov.in")))
                .isEqualTo("https://cdnbbsr.s3waas.gov.in/s3kv05a94e15d2591837ed8815bdd539e4/uploads/2026/10/2026102737.pdf");
        // A document on a host the source does not name is not taken.
        assertThat(com.indiaschoolfinder.notifications.NotificationSyncService.documentLink(page, Set.of("ssbpaliakalan.kvs.ac.in"))).isNull();
    }

    @Test
    void aCareersPagesJobPostingsGiveTheirOwnPostingAndClosingDates() throws Exception {
        RegistrySourceAdapter doon = source("doon-international-bbsr");
        assertThat(doon.profile().sector()).isEqualTo(com.indiaschoolfinder.entity.SiteUpdate.Sector.PRIVATE);
        assertThat(doon.profile().openingsPage()).isTrue();
        RegistrySourceAdapter.Collector c = collector(doon);
        RegistrySourceAdapter.parseJobPostings(html("doon-careers.html", "https://www.dooninternational.in/careers/"), c, JSON);
        // The descriptions hold raw line breaks (as served); the postings are read all the same.
        assertThat(c.listing().notices())
                .extracting(FoundNotice::title, FoundNotice::publishedOn, FoundNotice::closesOn, FoundNotice::itemId, FoundNotice::category)
                .containsExactly(
                        tuple("Higher Secondary Teacher (Physics)", LocalDate.of(2026, 9, 21), LocalDate.of(2027, 1, 26),
                                "https://www.dooninternational.in/careers/#hss-physics", Category.JOB),
                        tuple("Higher Secondary Teacher (Chemistry)", LocalDate.of(2026, 9, 21), LocalDate.of(2027, 1, 26),
                                "https://www.dooninternational.in/careers/#hss-chemistry", Category.JOB),
                        tuple("Higher Secondary Teacher (Biology)", LocalDate.of(2026, 9, 21), LocalDate.of(2027, 1, 26),
                                "https://www.dooninternational.in/careers/#hss-biology", Category.JOB));
        // The employer's own employmentType is kept (Search Console, 24 Nov 2026: JobPosting data lacked it), and the
        // notices belong to the school's profile, whose address the job data then carries.
        assertThat(c.listing().notices()).extracting(FoundNotice::employmentType)
                .containsOnly(com.indiaschoolfinder.entity.SiteUpdate.EmploymentType.FULL_TIME);
        assertThat(doon.profile().schoolSlug()).isEqualTo("doon-international-school-3");
    }

    @Test
    void anEmployersEmploymentTypeIsKeptOnlyWhenItIsOneKnownKind() throws Exception {
        var full = com.indiaschoolfinder.entity.SiteUpdate.EmploymentType.FULL_TIME;
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("\"FULL_TIME\""))).isEqualTo(full);
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("[\"full-time\"]"))).isEqualTo(full);
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("\"CONTRACTOR\"")))
                .isEqualTo(com.indiaschoolfinder.entity.SiteUpdate.EmploymentType.CONTRACT);
        // Two kinds, a kind with no counterpart, or none: nothing is assumed.
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("[\"FULL_TIME\", \"PART_TIME\"]"))).isNull();
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("\"INTERN\""))).isNull();
        assertThat(RegistrySourceAdapter.employment(JSON.readTree("{}").path("employmentType"))).isNull();
    }

    @Test
    void wordpressMediaKeepsRecruitmentNoticesAndLeavesOutTendersAndCirculars() throws Exception {
        RegistrySourceAdapter korukonda = source("sainik-school-korukonda");
        RegistrySourceAdapter.Collector c = collector(korukonda);
        JsonNode root;
        try (InputStream in = getClass().getResourceAsStream("/notifications/wp-media-korukonda.json")) {
            root = JSON.readTree(in);
        }
        RegistrySourceAdapter.parseWpMedia(root, c);
        SourceListing l = c.listing();

        assertThat(l.listed()).isEqualTo(20);
        assertThat(l.ignored()).isEqualTo(18); // a mango-orchard lease, flags, a shamiyana, homework, certificates, fee structure...
        assertThat(l.notices()).extracting(FoundNotice::itemId, FoundNotice::title, FoundNotice::publishedOn, FoundNotice::category)
                .containsExactly(
                        tuple("wp:18187", "Final Result for the Post of TGT ( Social Science) on Regular Basis", LocalDate.of(2026, 11, 17), Category.JOB),
                        tuple("wp:18185", "SHORTLISTED CANDIDATES OF TGT (MATHEMATICS)", LocalDate.of(2026, 11, 14), Category.JOB));
        assertThat(l.notices().get(0).url())
                .isEqualTo("https://www.sainikschoolkorukonda.org/wp-content/uploads/2026/11/Final-Result-for-the-Post-of-TGT-Social-Science-on-Regular-Basis.pdf");
        assertThat(l.notices()).allMatch(n -> n.reviewNote() == null);
        assertThat(korukonda.autoPublish()).isTrue();
    }

    @Test
    void anApiThatRefusesIsALayoutProblemNotAnEmptyListing() throws Exception {
        RegistrySourceAdapter.Collector c = collector(source("sainik-school-rewari"));
        assertThatThrownBy(() -> RegistrySourceAdapter.parseWpMedia(JSON.readTree("{\"code\":\"rest_not_logged_in\"}"), c))
                .hasMessageContaining("rest_not_logged_in");
    }

    @Test
    void dsssbKeepsOnlySchoolPostsAndSendsGeneralAdvertisementsToReview() throws Exception {
        RegistrySourceAdapter.Collector c = collector(source("dsssb"));
        RegistrySourceAdapter.parseItems(html("dsssb-vacancies.html", "https://dsssb.delhi.gov.in/dsssb-vacancies"), c);
        SourceListing l = c.listing();

        assertThat(l.listed()).isEqualTo(10);
        // Engineers, multi-tasking staff, personal assistants, a labour-department inspector, a forensic laboratory, Delhi
        // Jal Board and an office-assistant guide are not school posts; nor is a lab assistant without a school named.
        assertThat(l.ignored()).isEqualTo(8);
        assertThat(l.notices()).extracting(FoundNotice::title, FoundNotice::publishedOn)
                .containsExactly(
                        tuple("VACANCY NOTICE ADVERTISEMENT NO. 05/2026", LocalDate.of(2026, 10, 9)),
                        tuple("Corrigendum In partial modification to the advertisement No. 08/22 in respect of the post of Physical "
                                + "Education Teacher, Post Code- 41/22.", LocalDate.of(2026, 9, 17)));
        assertThat(l.notices().get(0).reviewNote()).contains("names no post");
        assertThat(l.notices().get(1).reviewNote()).isNull();
        assertThat(l.notices().get(1).url()).startsWith("https://dsssb.delhi.gov.in/sites/default/files/");
    }

    @Test
    void oavDatesNoticesByTheUploadTimeInTheFileNameAndLeavesOutPromotionLists() throws Exception {
        RegistrySourceAdapter.Collector c = collector(source("oav-odisha"));
        RegistrySourceAdapter.parseItems(html("oav-home.html", "https://oav.edu.in/"), c);
        SourceListing l = c.listing();

        assertThat(l.listed()).isEqualTo(12);
        // Six promotion lists and two HRA orders; and two Odia cards whose text the site itself cuts off after a few
        // words (mid-character), so nothing in them says what they are (both repeat English notices on the same page).
        assertThat(l.ignored()).isEqualTo(10);
        // The site prints only the first 100 characters of each title; the cut is marked.
        assertThat(l.notices()).extracting(FoundNotice::title, FoundNotice::publishedOn, FoundNotice::category).containsExactly(
                tuple("The online registration process for the entrance examination for admission to Odisha Adarsha Vidyala…",
                        LocalDate.of(2026, 10, 28), Category.ADMISSION),
                tuple("Notification for Entrance Test for OAVET & OMAVET 2027", LocalDate.of(2026, 10, 27), Category.ADMISSION));
        assertThat(l.notices().get(1).url()).isEqualTo("https://oav.edu.in/uploads/OAVS/NOTIFICATION_OAVS_20261027161706.pdf");
    }

    @Test
    void mayoCollegeOpeningsAreDatedByTheirAdvertisementsUploadTime() throws Exception {
        RegistrySourceAdapter.Collector c = collector(source("mayo-college"));
        RegistrySourceAdapter.parseItems(html("mayo-career.html", "https://www.mayocollege.com/career"), c);
        SourceListing l = c.listing();

        ZoneId india = ZoneId.of("Asia/Kolkata");
        assertThat(l.notices()).extracting(FoundNotice::title, FoundNotice::url, FoundNotice::publishedOn)
                .containsExactly(
                        tuple("Engineering Associate, MCGC", "https://www.mayocollege.com/uploads/jobs/1794641620.jpg",
                                Instant.ofEpochSecond(1794641620L).atZone(india).toLocalDate()),
                        tuple("Lead Engineer, MCGC", "https://www.mayocollege.com/uploads/jobs/1794641505.png",
                                Instant.ofEpochSecond(1794641505L).atZone(india).toLocalDate()),
                        tuple("Incharge of Carpentry, Metal, Glass work & Hobbies - Technical Skills Development Centre",
                                "https://www.mayocollege.com/uploads/jobs/1793878897.png", Instant.ofEpochSecond(1793878897L).atZone(india).toLocalDate()),
                        tuple("TGT German Teacher", "https://www.mayocollege.com/uploads/jobs/1793878754.pdf",
                                Instant.ofEpochSecond(1793878754L).atZone(india).toLocalDate()));
        assertThat(l.notices()).allMatch(n -> n.category() == Category.JOB);
        assertThat(l.ignored()).isZero(); // the template's "Collapsible Group Item #2" card is inside an HTML comment
        assertThat(l.notices().get(3).publishedOn()).isEqualTo(LocalDate.of(2026, 11, 5));
    }

    @Test
    void nestsNoticesHaveNoDatesAndWaitForAnEditor() throws Exception {
        RegistrySourceAdapter nests = source("nests-emrs");
        RegistrySourceAdapter.Collector c = collector(nests);
        RegistrySourceAdapter.parseItems(html("nests-home.html", "https://nests.tribal.gov.in/"), c);
        SourceListing l = c.listing();

        assertThat(l.listed()).isEqualTo(15);
        assertThat(l.ignored()).isEqualTo(1); // tobacco-free institutions guidelines
        assertThat(l.notices()).hasSize(14).allMatch(n -> n.publishedOn() == null && n.category() == Category.JOB);
        // The link's title attribute, without the "(211.52 KB) |" its text adds.
        assertThat(l.notices().get(0).title()).isEqualTo("Notice Regarding Tier-II examination Result for the post of TGT Computer Science and TGT English");
        assertThat(l.notices().get(0).url()).isEqualTo("https://nests.tribal.gov.in/showfile.php?lang=1&level=1&ls_id=1061&lid=666");
    }

    @Test
    void mistakesInAnEntryAreReportedAndTheEntryIsLeftOut() {
        SourceDefinition bad = new SourceDefinition("Bad Key!", "", null, "SHOP", "STATE", null, "Delhi", null, null, List.of("EXAM"),
                "HTML_ITEMS", "http://example.gov.in/", List.of("http://example.gov.in/list"), List.of("Example.gov.in"), null, true, null, false,
                "BLOG", null, null, "TEACHER", null, null, null, null, "SOURCE", "(", null, null, null, null, false, null, null, null, null);
        List<String> errors = SourceRegistry.validate(bad);
        assertThat(String.join(" | ", errors)).contains("key must be", "name is required", "category must be", "sector must be",
                "state must be", "notices must list", "reliability must be", "assume must be", "hosts must list", "must be https",
                "listingUrl must be", "linkPattern is not a valid", "HTML_ITEMS needs an item selector", "an HTML page has no date",
                "a switched-off source needs a disabledReason");
    }

    @Test
    void fileNamesStandingInForTitlesAreSpotted() {
        assertThat(RegistrySourceAdapter.fileNameLike("Advt Recruitment_03_2026_03Oct 26")).isTrue();
        assertThat(RegistrySourceAdapter.fileNameLike("202611031014468651")).isTrue();
        assertThat(RegistrySourceAdapter.fileNameLike("Important-Notice-01-222023-Advertisement-cancelled_BPSC-20261110-pt0kgn")).isTrue();
        assertThat(RegistrySourceAdapter.fileNameLike("Final Result for the Post of TGT ( Social Science) on Regular Basis")).isFalse();
    }
}
