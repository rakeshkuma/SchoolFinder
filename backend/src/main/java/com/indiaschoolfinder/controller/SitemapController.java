package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.entity.Exam;
import com.indiaschoolfinder.repository.ExamRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.service.RankingCatalogService;
import com.indiaschoolfinder.service.SeoHeadService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * robots.txt and an XML sitemap index for search engines: site pages, places (states, districts and towns with schools),
 * exams and practice sets, the blog, and every active school profile (10,000 per file).
 */
@Hidden
@RestController
@Transactional(readOnly = true)
public class SitemapController {

    /** 10,000 school profiles per file (the protocol allows 50,000): smaller files show indexing by part in Search Console. */
    static final int SCHOOLS_PER_FILE = 10_000;
    /** The other sitemaps, by kind of page, so Search Console reports each kind separately. */
    private static final List<String> PARTS = List.of("pages", "places", "exams", "blog", "notices");
    private static final List<String> PAGES = List.of("/", "/find", "/schools", "/states", "/cities", "/rankings", "/rankings/methodology",
            "/admissions", "/admissions/guide", "/admissions/notifications", "/updates", "/jobs", "/fees", "/compare", "/nearby", "/boarding", "/boarding/india", "/boarding/government", "/boarding/private", "/boarding/boys",
            "/boarding/girls", "/boarding/co-ed", "/boarding/affordable", "/rankings/score", "/exams", "/exams/finder", "/exams/calendar", "/exams/practice", com.indiaschoolfinder.service.OlympiadPages.PATH, "/exams/syllabus", "/exams/resources", "/reviews", "/about", "/contact",
            "/privacy", "/terms", "/disclaimer", "/editorial-policy", "/corrections-policy", "/data-deletion", "/advertise", "/claim-school",
            "/network/jawahar-navodaya-vidyalaya", "/network/sainik-school", "/network/eklavya-model-residential-school",
            "/network/rashtriya-military-school", "/network/kendriya-vidyalaya");
    private static final MediaType XML = MediaType.parseMediaType("application/xml;charset=UTF-8");
    private static final CacheControl CACHE = CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic();

    private final SchoolRepository schoolRepository;
    private final ExamRepository examRepository;
    private final LocationService locationService;
    private final AppProperties properties;
    private final com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository;
    private final RankingCatalogService rankingCatalog;
    private final com.indiaschoolfinder.repository.BlogPostRepository blogPosts;
    private final com.indiaschoolfinder.service.BestPlacesService bestPlaces;
    private final com.indiaschoolfinder.service.PremierDirectoryService premierDirectory;
    private final com.indiaschoolfinder.service.OlympiadPages olympiadPages;
    private final com.indiaschoolfinder.repository.SiteUpdateRepository siteUpdates;
    private final com.indiaschoolfinder.service.NoticeService notices;
    private final com.indiaschoolfinder.service.MentalAbilityPage mentalAbilityPage;

    public SitemapController(SchoolRepository schoolRepository, ExamRepository examRepository, LocationService locationService,
                             AppProperties properties, com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository,
                             RankingCatalogService rankingCatalog, com.indiaschoolfinder.repository.BlogPostRepository blogPosts,
                             com.indiaschoolfinder.service.BestPlacesService bestPlaces,
                             com.indiaschoolfinder.service.PremierDirectoryService premierDirectory,
                             com.indiaschoolfinder.service.OlympiadPages olympiadPages,
                             com.indiaschoolfinder.repository.SiteUpdateRepository siteUpdates,
                             com.indiaschoolfinder.service.NoticeService notices,
                             com.indiaschoolfinder.service.MentalAbilityPage mentalAbilityPage) {
        this.mentalAbilityPage = mentalAbilityPage;
        this.siteUpdates = siteUpdates;
        this.notices = notices;
        this.olympiadPages = olympiadPages;
        this.premierDirectory = premierDirectory;
        this.bestPlaces = bestPlaces;
        this.blogPosts = blogPosts;
        this.practiceSetRepository = practiceSetRepository;
        this.rankingCatalog = rankingCatalog;
        this.schoolRepository = schoolRepository;
        this.examRepository = examRepository;
        this.locationService = locationService;
        this.properties = properties;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robots(HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CACHE).contentType(MediaType.TEXT_PLAIN)
                .body(robotsTxt(base(request), properties.isAiTrainingCrawlers()));
    }

    /** Crawlers that only collect pages to train AI models; none of them is how a search or answer engine shows a page. */
    static final List<String> AI_TRAINING_CRAWLERS = List.of("GPTBot", "ClaudeBot", "CCBot", "Applebot-Extended", "meta-externalagent",
            "Bytespider");

    /**
     * robots.txt. Every crawler, search and answer engines included (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
     * PerplexityBot, Applebot …), follows the general rules. When AI-training crawlers are shut out
     * (app.ai-training-crawlers=false) they get a group of their own, and since a crawler obeys only its own group, the
     * general rules are unaffected. Google-Extended is not in that list on purpose: besides training, it governs whether
     * Gemini apps may ground their answers in these pages, which shows and links them.
     * <p>
     * The claim form's per-school addresses (/claim-school?school=…, about 700 of the 2,000 "alternate page" URLs in
     * Search Console on 28 Nov 2026) are kept out because they only cost crawling; the plain /claim-school page stays open.
     * Old profile and exam-guide section addresses (/schools/x?tab=…) are deliberately NOT blocked: nginx answers them with
     * a permanent redirect to the page itself (nginx.conf), and a crawler has to fetch one to see that. Some were still
     * shown in Google on 26 Nov 2026 under their ?tab= address; blocking them would have left those copies in the index.
     */
    static String robotsTxt(String base, boolean allowTraining) {
        String general = """
                User-agent: *
                Allow: /
                Disallow: /admin
                Disallow: /api/v1/admin/
                Disallow: /api/v1/account
                Disallow: /api/v1/auth/
                Disallow: /api/v1/participants
                Disallow: /api/v1/dev/
                Disallow: /saved
                Disallow: /suggest
                Disallow: /claim-school?
                Disallow: /account
                Disallow: /signin
                Disallow: /register
                Disallow: /verify-email
                Disallow: /forgot-password
                Disallow: /reset-password
                Disallow: /exams/practice/progress
                Disallow: /exams/practice/attempts
                Disallow: /exams/practice/session
                Disallow: /exams/leaderboard
                Disallow: /exams/achievements
                Disallow: /exams/challenges
                """;
        StringBuilder body = new StringBuilder(general);
        if (!allowTraining) {
            body.append("\n# Crawlers that only collect pages to train AI models. Search and answer engines follow the rules above.\n");
            AI_TRAINING_CRAWLERS.forEach(c -> body.append("User-agent: ").append(c).append('\n'));
            body.append("Disallow: /\n");
        }
        return body.append("\nSitemap: ").append(base).append("/sitemap.xml\n").toString();
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> index(HttpServletRequest request) {
        String base = base(request);
        // Bare board listings are noindex (SchoolRepository.INDEXABLE), so only fuller profiles are offered.
        long files = Math.max(1, (schoolRepository.countIndexable() + SCHOOLS_PER_FILE - 1) / SCHOOLS_PER_FILE);
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (String part : PARTS) {
            xml.append("  <sitemap><loc>").append(escape(base + "/sitemaps/" + part + ".xml")).append("</loc></sitemap>\n");
        }
        for (int i = 1; i <= files; i++) {
            xml.append("  <sitemap><loc>").append(escape(base + "/sitemaps/schools-" + i + ".xml")).append("</loc></sitemap>\n");
        }
        return xml(xml.append("</sitemapindex>\n"));
    }

    @GetMapping("/sitemaps/pages.xml")
    public ResponseEntity<String> pages(HttpServletRequest request) {
        String base = base(request);
        StringBuilder xml = urlset();
        PAGES.forEach(p -> url(xml, base + p, null));
        // Ranking pages with no verified data stay out, as they do in the menu.
        var sections = rankingCatalog.sections();
        if (sections.rankings()) url(xml, base + "/rankings/states", null);
        if (sections.boards()) url(xml, base + "/rankings/boards", null);
        if (sections.government() || sections.boarding()) url(xml, base + "/rankings/government-boarding", null);
        // Directory views that hold schools, and the state and city indexes once there is something to group.
        var views = premierDirectory.categories();
        views.forEach(c -> url(xml, base + "/rankings/" + c.slug(), null));
        if (!views.isEmpty()) {
            url(xml, base + "/rankings/schools-by-state", null);
            url(xml, base + "/rankings/schools-by-city", null);
        }
        // "Best schools in" pages only where enough schools are ranked or listed (the same rule as their noindex).
        bestPlaces.all().stream().filter(r -> r.ranked() + r.listed() >= com.indiaschoolfinder.service.BestPlacesService.MIN_TO_INDEX)
                .forEach(r -> url(xml, base + "/rankings/best-schools-in-" + r.slug(), null));
        for (String board : schoolRepository.boardCodesWithSchools()) {
            if (!"OTHER".equals(board)) { // "Other / multiple curricula" is not a meaningful directory page
                url(xml, base + "/boards/" + board, null);
            }
        }
        return xml(xml.append("</urlset>\n"));
    }

    /** The blog: articles (with their real last-updated date) and categories that hold one. Drafts never appear. */
    @GetMapping("/sitemaps/blog.xml")
    public ResponseEntity<String> blog(HttpServletRequest request) {
        String base = base(request);
        StringBuilder xml = urlset();
        var posts = blogPosts.findVisible(java.time.Instant.now());
        if (!posts.isEmpty()) url(xml, base + "/blog", null);
        posts.forEach(p -> url(xml, base + "/blog/" + p.getSlug(), p.getUpdatedAt()));
        posts.stream().map(p -> p.getCategory()).distinct().forEach(c -> url(xml, base + "/blog/category/" + c.slug(), null));
        return xml(xml.append("</urlset>\n"));
    }

    /**
     * Admission and job notices whose pages may be indexed (NoticeService.indexable: published, current openings with
     * facts beyond their title), with the date they last changed. Expired, closed, results-only and title-only notices
     * stay out, so the file never offers a page that says noindex.
     */
    @GetMapping("/sitemaps/notices.xml")
    public ResponseEntity<String> notices(HttpServletRequest request) {
        String base = base(request);
        StringBuilder xml = urlset();
        java.time.LocalDate today = notices.today();
        for (var category : List.of(com.indiaschoolfinder.entity.SiteUpdate.Category.JOB, com.indiaschoolfinder.entity.SiteUpdate.Category.ADMISSION)) {
            siteUpdates.findByCategoryAndStatusIn(category, List.of(com.indiaschoolfinder.entity.SiteUpdate.Status.PUBLISHED)).stream()
                    .filter(u -> com.indiaschoolfinder.service.NoticeService.indexable(u, today))
                    .sorted(java.util.Comparator.comparing(com.indiaschoolfinder.entity.SiteUpdate::getSlug))
                    .forEach(u -> url(xml, base + com.indiaschoolfinder.service.UpdateFeedService.noticePath(u),
                            u.getLastChangedAt() != null ? u.getLastChangedAt()
                                    : u.getPublishedOn().atStartOfDay(java.time.ZoneId.of("Asia/Kolkata")).toInstant()));
        }
        return xml(xml.append("</urlset>\n"));
    }

    /** States, and the districts and towns with enough schools to be worth a page of their own (the noindex rule). */
    @GetMapping("/sitemaps/places.xml")
    public ResponseEntity<String> places(HttpServletRequest request) {
        String base = base(request);
        StringBuilder xml = urlset();
        for (StateDto state : locationService.states()) {
            if (state.schoolCount() > 0) {
                url(xml, base + "/states/" + state.slug(), null);
                for (CityDto city : locationService.cities(state.code())) {
                    if (city.schoolCount() >= SeoHeadService.MIN_SCHOOLS_TO_INDEX) {
                        url(xml, base + "/states/" + state.slug() + "/city/" + city.slug(), null);
                    }
                }
            }
        }
        for (Object[] row : schoolRepository.districtsWithSchools(SeoHeadService.MIN_SCHOOLS_TO_INDEX)) {
            url(xml, base + "/states/" + row[0] + "/" + row[1], null);
        }
        return xml(xml.append("</urlset>\n"));
    }

    /** Entrance exams (preparation pages and guides), exam finders by class and state, and published practice sets. */
    @GetMapping("/sitemaps/exams.xml")
    public ResponseEntity<String> exams(HttpServletRequest request) {
        String base = base(request);
        StringBuilder xml = urlset();
        List<Exam> exams = examRepository.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc();
        for (Exam exam : exams) {
            url(xml, base + "/exams/" + exam.getSlug(), exam.getUpdatedAt());
            if (SeoHeadService.PREP_PAGES.contains(exam.getSlug())) url(xml, base + "/exams/" + exam.getSlug() + "/guide", exam.getUpdatedAt());
            if ("jnvst".equals(exam.getSlug())) {
                // Dated by when its facts were last checked, the date the page shows.
                url(xml, base + com.indiaschoolfinder.service.MentalAbilityPage.PATH,
                        mentalAbilityPage.content().checkedOn().atStartOfDay(ZoneOffset.UTC).toInstant());
            }
        }
        // Class pages only for classes with an entrance test; state pages only for states with their own exam
        // (others would repeat existing pages).
        exams.stream().filter(e -> e.getKind() == com.indiaschoolfinder.enums.ExamKind.ENTRANCE_TEST)
                .flatMap(e -> e.getEntryClasses().stream()).distinct().sorted()
                .forEach(c -> url(xml, base + "/exams/class/" + c, null));
        java.util.Set<String> stateCodes = new java.util.HashSet<>();
        exams.forEach(e -> stateCodes.addAll(e.getStateCodes()));
        for (StateDto state : locationService.states()) {
            if (stateCodes.contains(state.code())) {
                url(xml, base + "/exams/state/" + state.slug(), null);
            }
        }
        // Published practice sets (original questions); sittings, attempts and progress stay out (robots.txt).
        for (Object[] set : practiceSetRepository.findPublishedOutline()) { // without the questions
            url(xml, base + "/exams/practice/" + set[0], (Instant) set[4]);
        }
        // An Olympiad page for each class that has published Olympiad sets.
        olympiadPages.classes().forEach(c -> url(xml, base + c.path(), null));
        return xml(xml.append("</urlset>\n"));
    }

    @GetMapping("/sitemaps/schools-{n}.xml")
    public ResponseEntity<String> schools(@PathVariable int n, HttpServletRequest request) {
        if (n < 1) {
            throw new ResourceNotFoundException("Sitemap", n);
        }
        List<Object[]> rows = schoolRepository.findIndexableSlugs(PageRequest.of(n - 1, SCHOOLS_PER_FILE));
        if (rows.isEmpty() && n > 1) {
            throw new ResourceNotFoundException("Sitemap", n);
        }
        String base = base(request);
        StringBuilder xml = urlset();
        for (Object[] row : rows) {
            url(xml, base + "/schools/" + row[0], instant(row[1]));
        }
        return xml(xml.append("</urlset>\n"));
    }

    /** A native query's timestamp, whichever Java type the driver returns it as. */
    private static Instant instant(Object value) {
        if (value instanceof Instant i) return i;
        if (value instanceof java.sql.Timestamp t) return t.toInstant();
        if (value instanceof java.time.OffsetDateTime o) return o.toInstant();
        if (value instanceof java.time.LocalDateTime l) return l.toInstant(ZoneOffset.UTC);
        return null;
    }

    private String base(HttpServletRequest request) {
        return baseUrl(properties, request);
    }

    /** Configured public address, else scheme://host of this request (forwarded headers are honoured in prod). */
    static String baseUrl(AppProperties properties, HttpServletRequest request) {
        String configured = properties.getPublicSiteUrl();
        if (configured != null && !configured.isBlank()) {
            return configured.trim().replaceAll("/+$", "");
        }
        return ServletUriComponentsBuilder.fromContextPath(request).replacePath(null).build().toUriString();
    }

    private static StringBuilder urlset() {
        return new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
    }

    private static void url(StringBuilder xml, String loc, Instant lastModified) {
        xml.append("  <url><loc>").append(escape(loc)).append("</loc>");
        if (lastModified != null) {
            xml.append("<lastmod>").append(DateTimeFormatter.ISO_LOCAL_DATE.format(lastModified.atOffset(ZoneOffset.UTC)))
                    .append("</lastmod>");
        }
        xml.append("</url>\n");
    }

    private static ResponseEntity<String> xml(StringBuilder body) {
        return ResponseEntity.ok().cacheControl(CACHE).contentType(XML).body(body.toString());
    }

    static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }
}
