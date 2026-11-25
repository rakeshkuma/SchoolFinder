package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.dto.ranking.RankingCatalogDtos;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The page's main content as plain, server-rendered HTML: nginx puts it inside the app's root element (see nginx.conf
 * and index.html), so search engines and visitors get headings, facts and links in the first response, before the app
 * starts. The app replaces it as soon as it loads. Every fact here is one the app shows on the same page; nothing is
 * added. Private and unknown pages get nothing.
 */
@Service
public class SeoBodyService {

    private static final Logger log = LoggerFactory.getLogger(SeoBodyService.class);

    private static final Pattern SCHOOL = Pattern.compile("^/schools/([a-z0-9-]+)/?$");
    private static final Pattern STATE = Pattern.compile("^/states/([a-z0-9-]+)(?:/([a-z0-9-]+))?/?$");
    private static final Pattern CITY = Pattern.compile("^/states/([a-z0-9-]+)/city/([a-z0-9-]+)/?$");
    private static final Pattern BLOG_POST = Pattern.compile("^/blog/([a-z0-9-]+)/?$");
    private static final Pattern EXAM = Pattern.compile("^/exams/([a-z0-9-]+)/?$");
    private static final Pattern EXAM_GUIDE = Pattern.compile("^/exams/([a-z0-9-]+)/guide/?$");
    /** A directory view (/rankings/co-ed-boarding-schools ...); other /rankings/* pages fall through to the default. */
    private static final Pattern DIRECTORY_VIEW = Pattern.compile("^/rankings/([a-z0-9-]+)/?$");
    private static final Pattern BEST_IN = Pattern.compile("^/rankings/best-schools-in-([a-z0-9-]+)/?$");
    private static final Pattern BLOG_CATEGORY = Pattern.compile("^/blog/category/([a-z0-9-]+)/?$");
    private static final Pattern EXAM_CLASS = Pattern.compile("^/exams/class/(\\d{1,2})/?$");
    private static final Pattern EXAM_STATE = Pattern.compile("^/exams/state/([a-z0-9-]+)/?$");
    private static final Pattern BOARD = Pattern.compile("^/boards/([A-Za-z0-9-]+)/?$");
    private static final Pattern PRACTICE_SET = Pattern.compile("^/exams/practice/([a-z0-9-]+)/?$");
    private static final Pattern BOARDING = Pattern.compile("^/boarding(?:/([a-z0-9-]+))?/?$");

    /**
     * The boarding landing pages and the rule each states, as in the app (frontend content/boardingLandings.ts): the
     * school search each one runs (always boarding schools, A to Z) and its rule sentence.
     */
    private record BoardingLanding(List<com.indiaschoolfinder.enums.ResidentialSystem> systems, com.indiaschoolfinder.enums.GenderType gender,
                                   java.math.BigDecimal maxFee, String rule) {
    }

    private static final java.util.Map<String, BoardingLanding> BOARDING_LANDINGS = java.util.Map.of(
            "india", new BoardingLanding(null, null, null, "Schools whose official website, prospectus or system record says they "
                    + "offer boarding. Listed alphabetically; this is not a ranking."),
            "government", new BoardingLanding(List.of(com.indiaschoolfinder.enums.ResidentialSystem.NAVODAYA,
                    com.indiaschoolfinder.enums.ResidentialSystem.SAINIK, com.indiaschoolfinder.enums.ResidentialSystem.MILITARY_SCHOOL,
                    com.indiaschoolfinder.enums.ResidentialSystem.MILITARY_COLLEGE, com.indiaschoolfinder.enums.ResidentialSystem.STATE_RESIDENTIAL,
                    com.indiaschoolfinder.enums.ResidentialSystem.TRIBAL_RESIDENTIAL), null, null,
                    "Run by a central or state government or its society. Admission is usually through the system's own entrance exam, "
                            + "with eligibility rules set in each year's official notice."),
            "private", new BoardingLanding(List.of(com.indiaschoolfinder.enums.ResidentialSystem.PRIVATE_BOARDING), null, null,
                    "Privately managed schools whose official source describes them as boarding or residential."),
            "boys", new BoardingLanding(null, com.indiaschoolfinder.enums.GenderType.BOYS, null,
                    "The school or its official system states that it admits boys only."),
            "girls", new BoardingLanding(null, com.indiaschoolfinder.enums.GenderType.GIRLS, null, "The school states that it admits girls only."),
            "co-ed", new BoardingLanding(null, com.indiaschoolfinder.enums.GenderType.CO_ED, null,
                    "The school or its official system states that it admits boys and girls. Hostels are usually separate; check the "
                            + "arrangements with the school."),
            "affordable", new BoardingLanding(null, null, java.math.BigDecimal.valueOf(150_000),
                    "The lowest recurring annual fee in the school's official fee schedule is ₹1,50,000 or less. Schools without a "
                            + "published fee schedule are not listed, even when they charge little or nothing."));
    /** Fixed pages under /exams that are not an exam. */
    private static final Set<String> EXAM_PAGES = Set.of("practice", "finder", "calendar", "syllabus", "resources",
            "leaderboard", "achievements", "challenges", "guide", "olympiad");
    private static final Pattern OLYMPIAD_CLASS = Pattern.compile("^" + OlympiadPages.PATH + "/class-(\\d{1,2})$");
    private static final java.time.ZoneId INDIA = java.time.ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final Pattern TITLE = Pattern.compile("<title>(.*?)</title>", Pattern.DOTALL);
    private static final Pattern DESCRIPTION = Pattern.compile("<meta name=\"description\" content=\"(.*?)\"", Pattern.DOTALL);
    private static final int LIST_SIZE = 40;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    /** The site's sections, as in the app's main navigation. */
    private static final String[][] PILLARS = {
            {"/schools", "Schools"}, {"/rankings", "Rankings"}, {"/admissions", "Admissions"}, {"/exams", "Exam Prep"},
            {"/updates", "Notifications"},
    };

    private final SeoHeadService seoHeadService;
    private final SchoolService schoolService;
    private final LocationService locationService;
    private final SchoolFaqService faqService;
    private final UpdateFeedService updateFeed;
    private final RankingCatalogService rankings;
    private final PremierDirectoryService directory;
    private final BlogService blogService;
    private final ExamService examService;
    private final com.indiaschoolfinder.repository.PracticeSetRepository practiceSets;
    private final PlaceSummaryService placeSummary;
    private final BestPlacesService bestPlaces;
    private final SchoolListService schoolLists;
    private final OlympiadPages olympiadPages;
    private final AdmissionService admissions;
    private final NoticeService notices;
    private final ReferenceDataService referenceData;

    public SeoBodyService(SeoHeadService seoHeadService, SchoolService schoolService, LocationService locationService,
                          SchoolFaqService faqService, UpdateFeedService updateFeed, RankingCatalogService rankings,
                          PremierDirectoryService directory, BlogService blogService, ExamService examService,
                          com.indiaschoolfinder.repository.PracticeSetRepository practiceSets, PlaceSummaryService placeSummary,
                          BestPlacesService bestPlaces, SchoolListService schoolLists, OlympiadPages olympiadPages,
                          AdmissionService admissions, NoticeService notices, ReferenceDataService referenceData) {
        this.referenceData = referenceData;
        this.notices = notices;
        this.admissions = admissions;
        this.olympiadPages = olympiadPages;
        this.placeSummary = placeSummary;
        this.bestPlaces = bestPlaces;
        this.schoolLists = schoolLists;
        this.blogService = blogService;
        this.examService = examService;
        this.practiceSets = practiceSets;
        this.seoHeadService = seoHeadService;
        this.schoolService = schoolService;
        this.locationService = locationService;
        this.faqService = faqService;
        this.updateFeed = updateFeed;
        this.rankings = rankings;
        this.directory = directory;
    }

    /** @param path the page path as requested (any query string is ignored) */
    public String body(String path, String baseUrl) {
        String p = path == null ? "/" : path.split("[?#]", 2)[0];
        if (p.length() > 1 && p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        String head = seoHeadService.head(p, baseUrl);
        // Private, unknown and empty pages get nothing. A real school profile that is noindex only because it is a bare
        // board listing still gets its first paint for visitors; an unknown or hidden school fails its lookup below.
        if (head.contains("name=\"robots\" content=\"noindex\"") && !SCHOOL.matcher(p).matches()) {
            return "";
        }
        String title = first(TITLE, head);
        String description = first(DESCRIPTION, head);
        if (title == null) {
            return "";
        }
        String heading = title.replace(" | " + SeoHeadService.SITE, "");
        String main;
        try {
            Matcher m;
            if (p.equals("/")) {
                main = home();
            } else if (p.equals("/rankings")) {
                main = rankingsHome(description);
            } else if ((m = SCHOOL.matcher(p)).matches()) {
                main = school(schoolService.getActiveBySlug(m.group(1)));
            } else if ((m = CITY.matcher(p)).matches()) {
                main = city(m.group(1), m.group(2), heading, description);
            } else if ((m = STATE.matcher(p)).matches()) {
                main = state(m.group(1), m.group(2), heading, description);
            } else if ((m = BLOG_POST.matcher(p)).matches()) {
                main = blogPost(blogService.published(m.group(1)));
            } else if (p.equals(OlympiadPages.PATH)) {
                main = olympiadHub();
            } else if ((m = OLYMPIAD_CLASS.matcher(p)).matches()) {
                main = olympiadClass(Integer.parseInt(m.group(1)), description);
            } else if ((m = EXAM_GUIDE.matcher(p)).matches()) {
                main = exam(examService.get(m.group(1)), heading, description, false);
            } else if ((m = EXAM.matcher(p)).matches() && !EXAM_PAGES.contains(m.group(1))) {
                main = exam(examService.get(m.group(1)), heading, description, SeoHeadService.PREP_PAGES.contains(m.group(1)));
            } else if (p.equals("/updates")) {
                main = updates(heading, description);
            } else if (p.equals("/jobs")) {
                main = jobs(heading, description);
            } else if ((m = SeoHeadService.JOB_NOTICE.matcher(p)).matches()) {
                main = notice(m.group(1), com.indiaschoolfinder.entity.SiteUpdate.Category.JOB);
            } else if ((m = SeoHeadService.ADMISSION_NOTICE.matcher(p)).matches()
                    && !com.indiaschoolfinder.notifications.opportunity.NoticeSlugs.RESERVED.contains(m.group(1))) {
                main = notice(m.group(1), com.indiaschoolfinder.entity.SiteUpdate.Category.ADMISSION);
            } else if (p.equals("/admissions")) {
                main = admissionsHome();
            } else if ((m = BEST_IN.matcher(p)).matches()) {
                main = bestPlace(m.group(1), heading, description);
            } else if (p.equals("/blog")) {
                main = blogIndex(heading, description, null);
            } else if ((m = BLOG_CATEGORY.matcher(p)).matches()) {
                var category = com.indiaschoolfinder.entity.BlogPost.Category.bySlug(m.group(1))
                        .orElseThrow(() -> new ResourceNotFoundException("Blog category", "?"));
                main = blogIndex(heading, description, category);
            } else if (p.equals("/exams")) {
                main = examsHub(heading, description);
            } else if (p.equals("/exams/calendar")) {
                main = examCalendar(heading, description);
            } else if (p.equals("/exams/resources")) {
                main = examResources(heading, description);
            } else if (p.equals("/exams/practice")) {
                main = practiceCentre(heading, description);
            } else if ((m = EXAM_CLASS.matcher(p)).matches()) {
                int cls = Integer.parseInt(m.group(1));
                var exams = examService.list(new ExamService.Filter(null, cls, null,
                        null, null, null, null, null, null, null, null, null), ExamService.Sort.RELEVANCE, 0, 100).content();
                main = examList(heading, description, exams, cls >= 1 && cls <= 12 ? "Entrance exams for Class " + ROMAN.get(cls - 1)
                        + " compared: who runs each, who can apply, schools, exam date, application, mode and official source" : null);
            } else if ((m = EXAM_STATE.matcher(p)).matches()) {
                main = examList(heading, description, examService.list(new ExamService.Filter(null, null,
                        locationService.state(m.group(1)).code(), null, null, null, null, null, null, null, null, null),
                        ExamService.Sort.RELEVANCE, 0, 100).content());
            } else if ((m = BOARD.matcher(p)).matches()) {
                main = board(m.group(1).toUpperCase(Locale.ROOT), heading, description);
            } else if ((m = PRACTICE_SET.matcher(p)).matches()) {
                String slug = m.group(1);
                main = practiceSet(practiceSets.findBySlugAndPublishedTrue(slug)
                        .orElseThrow(() -> new ResourceNotFoundException("Practice set", slug)), heading, description);
            } else if (p.equals("/schools")) {
                main = directoryHome(heading, description);
            } else if (p.equals("/states")) {
                main = statesIndex(heading, description);
            } else if (p.equals("/cities")) {
                main = citiesIndex(heading, description);
            } else if (p.equals("/rankings/states")) {
                main = bestPlacesIndex(heading, description);
            } else if ((m = BOARDING.matcher(p)).matches() && (m.group(1) == null || BOARDING_LANDINGS.containsKey(m.group(1)))) {
                main = boarding(m.group(1), heading, description);
            } else if ((m = DIRECTORY_VIEW.matcher(p)).matches() && isDirectoryView(m.group(1))) {
                main = directoryView(m.group(1), heading, description);
            } else if ((m = SeoHeadService.NETWORK.matcher(p)).matches() && NETWORKS.containsKey(m.group(1))) {
                main = network(m.group(1), heading, description);
            } else if (TRUST_PAGES.contains(p)) {
                main = trustPage(p, heading, description);
            } else {
                main = "<h1>" + heading + "</h1>" + (description == null ? "" : "<p class=\"pr-lead\">" + description + "</p>");
            }
        } catch (ResourceNotFoundException e) {
            return "";
        } catch (RuntimeException e) {
            // The page still works without this; the app renders it in full.
            log.warn("Server-rendered content for {} failed: {}", p, e.toString());
            main = "<h1>" + heading + "</h1>" + (description == null ? "" : "<p class=\"pr-lead\">" + description + "</p>");
        }
        return shell(main);
    }

    private static String shell(String main) {
        StringBuilder h = new StringBuilder();
        h.append("<div class=\"prerender\" data-prerender>");
        h.append("<header class=\"pr-header\"><div class=\"pr-wrap pr-bar\"><a href=\"/\" class=\"pr-brand\">")
                .append("<img src=\"/favicon.svg\" alt=\"\" width=\"36\" height=\"36\" />School<span>Dhundo</span></a>")
                .append("<nav class=\"pr-nav\" aria-label=\"Main\">");
        for (String[] pillar : PILLARS) {
            h.append("<a href=\"").append(pillar[0]).append("\">").append(pillar[1]).append("</a>");
        }
        h.append("</nav></div></header>");
        h.append("<main class=\"pr-wrap pr-main\">").append(main).append("</main>");
        // The app's footer links to who runs the site and how it checks facts; without them here, crawlers that read only
        // this HTML (most AI assistants) found no page linking to /about or /editorial-policy (Nov 2026 crawl).
        h.append("<footer class=\"pr-footer\"><nav class=\"pr-wrap\" aria-label=\"About SchoolDhundo\">");
        for (String[] f : FOOTER) {
            h.append("<a href=\"").append(f[0]).append("\">").append(f[1]).append("</a>");
        }
        h.append("</nav></footer>");
        h.append("</div>");
        return h.toString();
    }

    /** Who runs the site and how it checks facts: given their text here, as the app shows it, for crawlers that run no script. */
    static final java.util.Set<String> TRUST_PAGES = java.util.Set.of("/about", "/editorial-policy", "/corrections-policy");

    /**
     * The About, Editorial policy and Corrections policy pages as the app shows them (InfoPages.tsx, with the creator and
     * labels of content/site.ts): keep the two in step. Until 25 Nov 2026 these pages sent a heading and one line (about 30
     * words), so Bing and the AI assistants that read only this HTML could not see who runs the site or how it checks facts,
     * and Ubersuggest's audit counted them among its 50 low-word-count pages.
     */
    String trustPage(String path, String heading, String description) {
        StringBuilder h = new StringBuilder("<h1>").append(heading).append("</h1>");
        if (description != null) h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        switch (path) {
            case "/about" -> {
                h.append("<p>SchoolDhundo is an education discovery and preparation platform designed to help parents and students explore ")
                        .append("schools across India.</p>")
                        .append("<p>Our goal is to make school information easier to discover, compare and understand. The platform brings ")
                        .append("together school profiles, locations, facilities, admission information, rankings and educational resources.</p>")
                        .append("<p>We also aim to support students through entrance examination preparation, mock tests, daily quizzes, practice ")
                        .append("questions and learning progress tracking.</p>")
                        .append("<p>SchoolDhundo was created by ").append(CREATOR_NAME).append(", an alumnus of the ").append(CREATOR_INSTITUTE)
                        .append(", with the vision of making school discovery and educational resources more accessible across India.</p>")
                        .append("<h2>Our data principles</h2><ul class=\"pr-list\">")
                        .append("<li>We never invent information. Anything not published by an official source is shown as “Not available”.</li>")
                        .append("<li>Every record links to its source. Once an editor has checked it against that source, it is marked “Verified” ")
                        .append("with the date.</li>")
                        .append("<li>Fees and admission dates are kept per academic year, so history is preserved.</li>")
                        .append("<li>Photos are used only from official sources or with a clear licence, with credit shown.</li>")
                        .append("<li>Our ranking is our own, published methodology — not an official government ranking.</li></ul>")
                        .append("<h2>How we label information</h2><ul class=\"pr-list\">");
                for (String[] kind : INFORMATION_KINDS) {
                    h.append("<li><strong>").append(kind[0]).append(":</strong> ").append(kind[1]).append("</li>");
                }
                h.append("</ul><p>").append(DISCLAIMER).append("</p>")
                        .append("<p>SchoolDhundo is not affiliated with CBSE, CISCE, IIRF, Navodaya Vidyalaya Samiti, Netarhat Awasiya Vidyalaya ")
                        .append("or the Sainik Schools Society.</p>");
                var sources = referenceData.dataSources();
                if (!sources.isEmpty()) {
                    h.append("<h2>Primary sources</h2><ul class=\"pr-list\">");
                    for (var s : sources) {
                        h.append("<li><a href=\"").append(esc(s.url())).append("\" rel=\"noopener\">").append(esc(s.name())).append("</a>");
                        if (s.description() != null && !s.description().isBlank()) h.append(" — ").append(esc(s.description()));
                        h.append("</li>");
                    }
                    h.append("</ul>");
                }
                h.append("<p>Schools: if your information is missing or out of date, please <a href=\"/contact?topic=LISTING\">contact us</a> ")
                        .append("with a link to the official source.</p>");
            }
            case "/editorial-policy" -> h.append("<h2>Sources come first</h2><ul class=\"pr-list\">")
                    .append("<li>School facts come from official and public sources: education boards (for example the CBSE affiliation ")
                    .append("directory, SARAS), government bodies, and schools’ own websites and notices. Each profile links to its source and ")
                    .append("shows when it was retrieved.</li>")
                    .append("<li>We never invent information. A fact no official source publishes is shown as “Not available”, not guessed.</li>")
                    .append("<li>Every record links to its source. Once an editor has checked it against that source, it is marked “Verified” ")
                    .append("with the date.</li>")
                    .append("<li>Fees and admission dates are kept per academic year and linked to the notice they come from.</li>")
                    .append("<li>Photos are used only from official sources or under a clear licence, with credit shown next to each image.</li></ul>")
                    .append("<h2>Rankings</h2><ul class=\"pr-list\">")
                    .append("<li>Rankings published by other organisations are shown with the publisher’s name, the year and the publisher’s ")
                    .append("own rank, and checked against the publisher’s list. They belong to their publishers.</li>")
                    .append("<li>Where a publisher says its list is not a ranking (for example an A-to-Z list), we show it as a list, not as ranks.</li>")
                    .append("<li>Our own SchoolDhundo score is calculated from source-linked evidence using a ")
                    .append("<a href=\"/rankings/methodology\">published methodology</a> and is always kept apart from published rankings. ")
                    .append("It is not an official ranking.</li>")
                    .append("<li>Rankings and scores cannot be bought. No payment changes a school’s rank, score or the facts on its profile.</li></ul>")
                    .append("<h2>Practice questions and articles</h2><ul class=\"pr-list\">")
                    .append("<li>Practice questions and mock tests are written by SchoolDhundo for practice. They are not official exam ")
                    .append("questions, and we say so on every test. Officially published papers are linked to the conducting body’s own site.</li>")
                    .append("<li>Guides and blog articles are written to help families and are dated. Exam dates and rules are always checked ")
                    .append("against the official notice, which is linked.</li></ul>")
                    .append("<h2>Advertising and sponsored content</h2><ul class=\"pr-list\">")
                    .append("<li>The site shows no advertisements today. If advertising or sponsored listings are added, they will be clearly ")
                    .append("labelled “Advertisement” or “Sponsored”, kept apart from school facts and rankings, and will never change them.</li>")
                    .append("<li>We do not promise or guarantee admission to any school.</li></ul>")
                    .append("<h2>Independence</h2><p>SchoolDhundo is independent. It is not affiliated with or endorsed by any school, ")
                    .append("education board, ranking publisher or government body, and listing a school does not mean the school endorses ")
                    .append("this site.</p><p>Found a mistake? See our <a href=\"/corrections-policy\">corrections policy</a>.</p>");
            case "/corrections-policy" -> h.append("<h2>How to report a mistake</h2><ul class=\"pr-list\">")
                    .append("<li>On a school profile, use <strong>Report incorrect information</strong> (in the “Data sources” box), or ")
                    .append("<a href=\"/contact?topic=CORRECTION\">contact us</a> and choose “Report incorrect information”.</li>")
                    .append("<li>Tell us what is wrong and, if you can, give a link to the official page that shows the correct information ")
                    .append("(the school’s website, an admission notice or the board’s directory).</li>")
                    .append("<li>Schools can also <a href=\"/contact?topic=LISTING\">send their information</a> with a link to where they ")
                    .append("publish it.</li></ul>")
                    .append("<h2>How we check it</h2><ul class=\"pr-list\">")
                    .append("<li>An editor compares the report with the official source. We change a fact only when an official or clearly ")
                    .append("reliable source supports the change, so we may ask for a link.</li>")
                    .append("<li>When a fact is corrected, the profile shows the new source and the date it was checked.</li>")
                    .append("<li>Mistakes in our own practice questions can be reported from the question itself; we fix the question or its ")
                    .append("explanation.</li>")
                    .append("<li>Rankings published by others are shown as their publishers published them. If a publisher corrects its list, ")
                    .append("we update ours.</li></ul>")
                    .append("<h2>Reviews</h2><p>To ask for a review to be removed or corrected, <a href=\"/contact\">contact us</a> with the ")
                    .append("school and the review.</p>");
            default -> { }
        }
        return h.toString();
    }

    /** content/site.ts: the creator as supplied by the creator, and how each kind of information is told apart. */
    private static final String CREATOR_NAME = "Rakesh Kumar";
    private static final String CREATOR_INSTITUTE = "Indian Institute of Information Technology, Allahabad";
    private static final String DISCLAIMER = "SchoolDhundo is an independent school discovery and educational preparation platform. "
            + "School information and rankings are presented with their respective sources where available. Parents and students should "
            + "verify important admission, fee and examination details with the relevant official institution.";
    private static final String[][] INFORMATION_KINDS = {
            {"Official school information", "Taken from government records and school sources, with the link and the date it was checked."},
            {"Third-party rankings", "Published by other organisations, shown under their name and year, and kept apart from our own score."},
            {"User-submitted information", "Reviews and suggested updates come from visitors. An editor checks them before they appear."},
            {"Original practice questions", "Written by SchoolDhundo for practice. They are not official exam questions."},
            {"Official previous-year papers", "Linked at their official source. We do not republish them."},
    };

    /** The app footer's site links (Layout.tsx), in its order, plus the contact form. */
    private static final String[][] FOOTER = {
            {"/about", "About Us"}, {"/editorial-policy", "Editorial Policy"}, {"/corrections-policy", "Corrections Policy"},
            {"/contact", "Contact"}, {"/privacy", "Privacy Policy"}, {"/terms", "Terms of Use"}, {"/disclaimer", "Disclaimer"},
    };

    private String home() {
        StringBuilder h = new StringBuilder();
        h.append("<h1>Find the Right School for Your Child</h1>");
        h.append("<p class=\"pr-lead\">Discover, compare and prepare for the best schools across India — from admissions and ")
                .append("rankings to exam updates, preparation and more, all in one place.</p>");
        // The hero photograph is in the first paint, before the app starts (the page's largest element on phones). Same
        // files and sizes as the app's hero (HomeHero.tsx), so it is downloaded once.
        h.append("<img class=\"pr-hero\" src=\"/images/home/hero-students-960.webp\"")
                .append(" srcset=\"/images/home/hero-students-480.webp 480w, /images/home/hero-students-720.webp 720w,")
                .append(" /images/home/hero-students-960.webp 960w, /images/home/hero-students-1200.webp 1200w, /images/home/hero-students-1600.webp 1600w\"")
                .append(" sizes=\"(min-width: 1024px) 48vw, calc(100vw - 32px)\" width=\"1600\" height=\"1071\" fetchpriority=\"high\"")
                .append(" alt=\"Smiling schoolchildren in uniform on a green school campus\" />");
        latestUpdates(h);
        List<StateDto> states = locationService.states().stream().filter(s -> s.schoolCount() > 0)
                .sorted(Comparator.comparing(StateDto::schoolCount).reversed()).toList();
        if (!states.isEmpty()) {
            h.append("<h2>Schools by state</h2><ul class=\"pr-grid\">");
            for (StateDto s : states) {
                h.append("<li><a href=\"/states/").append(s.slug()).append("\">").append(esc(s.name())).append("</a> <span>")
                        .append(String.format("%,d", s.schoolCount())).append(" schools</span></li>");
            }
            h.append("</ul>");
        }
        h.append("<h2>Explore</h2><ul class=\"pr-grid\">")
                .append(link("/boarding", "Boarding schools in India"))
                .append(link("/rankings", "India's top schools"))
                .append(link("/admissions", "Open admissions and deadlines"))
                .append(link("/updates", "Latest school and exam updates"))
                .append(link("/fees", "School fee calculator"))
                .append(link("/exams/jnvst", "JNVST Class 6 preparation"))
                .append(link("/exams/aissee", "AISSEE Sainik School preparation"))
                .append(link("/exams/netarhat", "Netarhat entrance preparation"))
                .append(link("/exams/practice", "Mock tests and daily quiz"))
                .append(link("/blog", "Guides for parents"))
                .append("</ul>");
        return h.toString();
    }

    /**
     * The rankings page: the published national list's top places exactly as its publisher printed them (ties and gaps
     * kept, never renumbered), each linked to the school, then the directory's categories. Same facts as the app.
     */
    private String rankingsHome(String description) {
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › Rankings</nav>");
        h.append("<h1>Discover India's Best Schools</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        RankingCatalogDtos.Edition list = rankings.editions().stream()
                .filter(e -> !e.ratingBased() && e.scope() == RankingScope.NATIONAL && e.boardCode() == null)
                .findFirst().orElse(null);
        if (list != null) {
            List<RankingCatalogDtos.Row> rows = rankings.table(new RankingCatalogDtos.Query(list.id(), null, null, null, null, null, null,
                    null, null, null, 20, null, null), 0, 50).content();
            h.append("<h2>").append(esc(list.publisherCode() + " " + list.year() + ": " + (list.category() != null ? list.category() : list.name())))
                    .append("</h2>");
            h.append("<p>Published by ").append(esc(list.publisher())).append(". Ranks are the publisher's own, for schools matched to ")
                    .append("SchoolDhundo's directory, so positions can repeat or skip. <a href=\"").append(esc(list.sourceUrl()))
                    .append("\" rel=\"nofollow noopener\">Publisher's list</a></p>");
            h.append("<ul class=\"pr-list\">");
            for (RankingCatalogDtos.Row r : rows) {
                h.append("<li>#").append(r.nationalRank()).append(" <a href=\"/schools/").append(esc(r.slug())).append("\">")
                        .append(esc(r.schoolName())).append("</a> <span>")
                        .append(esc(String.join(", ", java.util.stream.Stream.of(r.city(), r.stateName()).filter(x -> x != null && !x.isBlank()).toList())))
                        .append("</span></li>");
            }
            h.append("</ul>");
            h.append("<p><a href=\"/rankings?top=all\">All ").append(list.entries()).append(" ranked schools in this list</a></p>");
        }
        PremierDirectoryDtos.Summary summary = directory.summary();
        if (summary.schools() > 0) {
            h.append("<h2>Explore by category</h2><ul class=\"pr-grid\">");
            for (PremierDirectoryDtos.Category c : summary.categories()) {
                h.append("<li><a href=\"/rankings/").append(c.slug()).append("\">").append(esc(c.title())).append("</a> <span>")
                        .append(c.schools()).append(" schools</span></li>");
            }
            h.append(link("/rankings/states", "Rankings by state and city"))
                    .append(link("/rankings/boards", "Board-wise rankings"))
                    .append(link("/rankings/government-boarding", "Government and boarding school rankings"))
                    .append(link("/rankings/methodology", "How rankings are shown"))
                    .append("</ul>");
            h.append("<p>The premier school directory is SchoolDhundo's own selection of ").append(summary.schools())
                    .append(" schools, listed A to Z; it is not a ranking.</p>");
        }
        return h.toString();
    }

    /** The newest school and exam updates as plain links, so the notices are in the page before the app starts. */
    private void latestUpdates(StringBuilder h) {
        List<UpdateDtos.UpdateItem> items;
        try {
            items = updateFeed.feed(null, 0, 6).content();
        } catch (RuntimeException e) {
            log.warn("Updates for the home page's server-rendered content failed: {}", e.toString());
            return;
        }
        if (items.isEmpty()) {
            return;
        }
        h.append("<h2>Latest school and exam updates</h2><ul class=\"pr-list\">");
        for (UpdateDtos.UpdateItem u : items) {
            String href = u.linkPath() != null ? plainProfilePath(u.linkPath()) : u.sourceUrl();
            if (href == null) {
                continue;
            }
            h.append("<li><a href=\"").append(esc(href)).append("\">").append(esc(u.title())).append("</a>");
            if (u.eventDate() != null) {
                h.append(" <span>").append(esc(u.eventLabel() != null ? u.eventLabel() : "Date")).append(": ")
                        .append(u.eventDate().format(DAY)).append("</span>");
            }
            h.append("</li>");
        }
        h.append("</ul>");
    }

    private String school(SchoolDetailDto s) {
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/schools\">Schools</a>");
        if (s.stateSlug() != null) {
            h.append(" › <a href=\"/states/").append(s.stateSlug()).append("\">").append(esc(s.stateName())).append("</a>");
            if (s.district() != null) {
                h.append(" › <a href=\"/states/").append(s.stateSlug()).append('/').append(s.district().slug()).append("\">")
                        .append(esc(s.district().name())).append("</a>");
            }
        }
        h.append("</nav>");
        h.append("<h1>").append(esc(s.name())).append("</h1>");
        // Answer first: the factual introduction the app's "About" card opens with (the same words; SchoolAboutText),
        // then the school's own description when it has one.
        h.append("<p class=\"pr-lead\">").append(esc(com.indiaschoolfinder.util.SchoolAboutText.about(s))).append("</p>");
        String own = com.indiaschoolfinder.util.SchoolAboutText.ownDescription(s);
        if (own != null) {
            h.append("<p>").append(esc(own)).append("</p>");
        }
        h.append("<dl class=\"pr-facts\">");
        if (s.board() != null) {
            fact(h, "Board", "CISCE".equals(s.board().code()) ? "ICSE/ISC (CISCE)" : s.board().name());
            fact(h, "Affiliation number", s.affiliationNumber());
        }
        if (!s.classesOffered().isEmpty()) {
            String first = s.classesOffered().get(0).name();
            String last = s.classesOffered().get(s.classesOffered().size() - 1).name();
            fact(h, "Classes", first.equals(last) ? first : first + " to " + last);
        }
        if (s.genderType() != null) {
            fact(h, "Admits", switch (s.genderType()) {
                case CO_ED -> "Boys and girls (co-ed)";
                case BOYS -> "Boys";
                case GIRLS -> "Girls";
            });
        }
        fact(h, "Medium", s.mediumOfInstruction());
        fact(h, "Established", s.establishedYear() == null ? null : String.valueOf(s.establishedYear()));
        fact(h, "Website", s.websiteUrl());
        String network = networkSlug(s.network());
        String[] exam = s.boarding() == null ? null : examRoute(s.boarding().entranceExam());
        if (network != null) factLink(h, "School network", "/network/" + network, NETWORKS.get(network)[0]);
        if (exam != null) factLink(h, "Entrance exam", exam[1], exam[0]);
        h.append("</dl>");
        admissionRoutes(h, network, exam);
        List<SchoolFaqService.Faq> faqs = faqService.faqs(s);
        if (!faqs.isEmpty()) {
            h.append("<h2>Quick answers</h2><dl class=\"pr-faq\">");
            for (SchoolFaqService.Faq f : faqs) {
                h.append("<dt>").append(esc(f.question())).append("</dt><dd>").append(esc(f.answer())).append("</dd>");
            }
            h.append("</dl>");
        }
        sources(h, s);
        otherSchools(h, s);
        return h.toString();
    }

    /**
     * "School information & sources", as the app's SourcesCard words it: where the profile comes from and when, whether an
     * editor has checked it, and when the record last changed. Real dates only.
     */
    private static void sources(StringBuilder h, SchoolDetailDto s) {
        h.append("<h2>School information &amp; sources</h2><ul class=\"pr-list\"><li>Profile from the school’s official record");
        if (s.sourceRetrievedDate() != null) h.append(", retrieved ").append(time(s.sourceRetrievedDate()));
        h.append('.');
        if (s.sourceUrl() != null && !s.sourceUrl().isBlank()) {
            h.append(" <a href=\"").append(esc(s.sourceUrl())).append("\" rel=\"noopener nofollow\">Source: ").append(esc(host(s.sourceUrl())))
                    .append("</a>");
        }
        h.append("</li><li>").append(s.lastVerifiedDate() != null
                ? "Checked by a SchoolDhundo editor on " + time(s.lastVerifiedDate()) + "." : "Not yet checked by a SchoolDhundo editor.").append("</li>");
        if (s.updatedAt() != null) {
            h.append("<li>Record last updated ").append(time(java.time.LocalDate.ofInstant(s.updatedAt(), INDIA))).append(".</li>");
        }
        h.append("</ul><p>Missing details are left blank, never estimated. SchoolDhundo is independent; listing a school does not mean ")
                .append("the school endorses this site.</p>");
    }

    /** A date as people read it, with its machine-readable form: {@code <time datetime="2026-11-17">17 Nov 2026</time>}. */
    private static String time(java.time.LocalDate date) {
        return "<time datetime=\"" + date + "\">" + date.format(DAY) + "</time>";
    }

    /** "navodaya.gov.in" for a link to it, as the app's SourceLink shows it. */
    private static String host(String url) {
        try {
            String host = java.net.URI.create(url.trim()).getHost();
            return host == null ? url : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException e) {
            return url;
        }
    }

    /**
     * The profile's "other schools" links, chosen as the app chooses them (SchoolDetailPage): within 5 km when the school is
     * mapped, else in the same town, PIN code or district. Six at most.
     */
    private void otherSchools(StringBuilder h, SchoolDetailDto s) {
        List<SchoolSummaryDto> others;
        String heading;
        if (s.latitude() != null && s.longitude() != null) {
            others = schoolService.nearby(s.latitude(), s.longitude(), 5, 6, s.id());
            heading = "Other schools within 5 km";
        } else if (s.city() != null || s.pinCode() != null || s.district() != null) {
            others = schoolService.search(criteria(s.stateCode(), s.city() == null && s.pinCode() == null ? s.district().slug() : null,
                    s.city(), s.city() == null ? s.pinCode() : null, 7)).content();
            heading = "Other schools in " + (s.city() != null ? s.city() : s.pinCode() != null ? "PIN code " + s.pinCode() : s.district().name() + " district");
        } else {
            return;
        }
        schoolList(h, heading, others.stream().filter(o -> !o.id().equals(s.id())).limit(6).toList());
    }

    private String state(String stateSlug, String districtSlug, String heading, String description) {
        StateDto state = locationService.state(stateSlug);
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/states\">States</a>");
        if (districtSlug != null) {
            h.append(" › <a href=\"/states/").append(state.slug()).append("\">").append(esc(state.name())).append("</a>");
        }
        // The heading the app's StatePage shows, not the title: the title leads with the count ("List of 14 Schools in …").
        String place = districtSlug == null ? state.name() : locationService.districts(state.code()).stream()
                .filter(d -> d.slug().equals(districtSlug)).findFirst()
                .map(d -> SeoHeadService.districtName(d.name()) + ", " + state.name()).orElse(null);
        h.append("</nav><h1>").append(place == null ? heading : esc("Schools in " + place)).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        if (districtSlug != null) {
            // The town of the same name has its own page (as in the app's StatePage).
            locationService.cities(state.code()).stream()
                    .filter(c -> c.slug().equals(districtSlug) && c.schoolCount() >= SeoHeadService.MIN_SCHOOLS_TO_INDEX)
                    .max(Comparator.comparingLong(CityDto::schoolCount))
                    .ifPresent(c -> h.append("<p>Just the city: <a href=\"/states/").append(state.slug()).append("/city/").append(c.slug())
                            .append("\">").append(count(c.schoolCount())).append(" schools in ").append(esc(c.name())).append("</a></p>"));
        }
        var summary = placeSummary.summary(state.slug(), districtSlug, null);
        placeIntro(h, summary);
        if (districtSlug == null) {
            List<DistrictDto> districts = locationService.districts(state.code()).stream().filter(d -> d.schoolCount() > 0)
                    .sorted(Comparator.comparing(DistrictDto::name)).toList();
            if (!districts.isEmpty()) {
                h.append("<h2>Districts</h2><ul class=\"pr-grid\">");
                for (DistrictDto d : districts) {
                    h.append("<li><a href=\"/states/").append(state.slug()).append('/').append(d.slug()).append("\">")
                            .append(esc(d.name())).append("</a> <span>").append(String.format("%,d", d.schoolCount())).append("</span></li>");
                }
                h.append("</ul>");
            }
            schools(h, criteria(state.code(), null, null), "Schools in " + state.name());
        } else {
            DistrictDto district = locationService.districts(state.code()).stream().filter(d -> d.slug().equals(districtSlug))
                    .findFirst().orElseThrow(() -> new ResourceNotFoundException("District", districtSlug));
            schools(h, criteria(state.code(), district.slug(), null), "Schools in " + district.name());
        }
        placeQuestions(h, summary);
        return h.toString();
    }

    private String city(String stateSlug, String citySlug, String heading, String description) {
        StateDto state = locationService.state(stateSlug);
        CityDto city = locationService.cities(state.code()).stream().filter(c -> c.slug().equals(citySlug))
                // Two spellings of one town ("Bhuj", "BHUJ") share a slug; the page is the one with more schools, as in the sitemap.
                .max(java.util.Comparator.comparingLong(CityDto::schoolCount))
                .orElseThrow(() -> new ResourceNotFoundException("City", citySlug));
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/states\">States</a> › <a href=\"/states/")
                .append(state.slug()).append("\">").append(esc(state.name())).append("</a></nav>");
        // The app's heading (StatePage), not the title, which leads with the count.
        h.append("<h1>").append(esc("Schools in " + city.name() + ", " + state.name())).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        // The district of the same name has its own page (as in the app's StatePage).
        locationService.districts(state.code()).stream()
                .filter(d -> d.slug().equals(city.slug()) && d.schoolCount() >= SeoHeadService.MIN_SCHOOLS_TO_INDEX)
                .findFirst()
                .ifPresent(d -> h.append("<p>The whole district: <a href=\"/states/").append(state.slug()).append('/').append(d.slug())
                        .append("\">").append(count(d.schoolCount())).append(" schools in ").append(esc(SeoHeadService.districtName(d.name())))
                        .append("</a></p>"));
        var summary = placeSummary.summary(state.slug(), null, city.slug());
        placeIntro(h, summary);
        schools(h, criteria(state.code(), null, city.name()), "Schools in " + city.name());
        placeQuestions(h, summary);
        return h.toString();
    }

    /** The place's introduction and its numbers at a glance, as the app's PlaceSummary shows them. */
    private static void placeIntro(StringBuilder h, com.indiaschoolfinder.dto.location.PlaceSummaryDto p) {
        if (p.total() == 0) {
            return;
        }
        h.append("<h2>").append(esc(p.place())).append(" at a glance</h2>");
        h.append("<p>").append(esc(p.intro())).append("</p><dl class=\"pr-facts\">");
        fact(h, "Schools listed", String.format(Locale.ENGLISH, "%,d", p.total()));
        for (var c : p.boards()) fact(h, c.label(), String.format(Locale.ENGLISH, "%,d", c.count()));
        for (var c : p.types()) fact(h, c.label(), String.format(Locale.ENGLISH, "%,d", c.count()));
        for (var c : p.networks()) fact(h, c.label() + (c.count() == 1 ? "" : "s"), String.format(Locale.ENGLISH, "%,d", c.count()));
        if (p.boarding() > 0) fact(h, "With boarding", String.format(Locale.ENGLISH, "%,d", p.boarding()));
        if (p.seniorSecondary() > 0) fact(h, "Up to Class XII", String.format(Locale.ENGLISH, "%,d", p.seniorSecondary()));
        h.append("</dl>");
    }

    /** The place's questions and related pages, after its school list. */
    private static void placeQuestions(StringBuilder h, com.indiaschoolfinder.dto.location.PlaceSummaryDto p) {
        if (p.faqs().isEmpty()) {
            return;
        }
        h.append("<h2>Questions about schools in ").append(esc(p.place())).append("</h2><dl class=\"pr-faq\">");
        for (var f : p.faqs()) {
            h.append("<dt>").append(esc(f.question())).append("</dt><dd>").append(esc(f.answer())).append("</dd>");
        }
        h.append("</dl>");
        if (!p.related().isEmpty()) {
            h.append("<h2>Related</h2><ul class=\"pr-grid\">");
            p.related().forEach(l -> h.append(link(l.href(), l.label())));
            h.append("</ul>");
        }
    }

    /** The updates page: the feed's newest items with their summaries, dates and sources, as the app lists them. */
    private String updates(String heading, String description) {
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › Notifications</nav>");
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        items(h, updateFeed.feed(null, 0, 40).content());
        return h.toString();
    }

    /** Feed items as a list: each title links its page (or the official notice), with its key date, summary and source. */
    private static void items(StringBuilder h, List<UpdateDtos.UpdateItem> items) {
        if (items.isEmpty()) {
            return;
        }
        h.append("<ul class=\"pr-list\">");
        for (UpdateDtos.UpdateItem u : items) {
            String href = u.linkPath() != null ? plainProfilePath(u.linkPath()) : u.sourceUrl();
            h.append("<li>");
            if (href != null) {
                h.append("<a href=\"").append(esc(href)).append("\">").append(esc(u.title())).append("</a>");
            } else {
                h.append(esc(u.title()));
            }
            if (u.eventDate() != null) {
                h.append(" <span>").append(esc(u.eventLabel() != null ? u.eventLabel() : "Date")).append(": ")
                        .append(u.eventDate().format(DAY)).append("</span>");
            }
            if (u.summary() != null && !u.summary().isBlank()) {
                h.append("<p>").append(esc(u.summary())).append("</p>");
            }
            if (u.sourceName() != null && u.sourceUrl() != null) {
                h.append("<p>Source: <a href=\"").append(esc(u.sourceUrl())).append("\" rel=\"noopener\">").append(esc(u.sourceName()))
                        .append("</a></p>");
            } else if (u.sourceUrl() != null && u.linkPath() != null) {
                // The title opens the notice's page here, so the official source is linked by its site's name.
                String host = NoticeService.domain(u.sourceUrl());
                h.append("<p>Source: <a href=\"").append(esc(u.sourceUrl())).append("\" rel=\"noopener\">")
                        .append(esc(host != null ? host : "official notice")).append("</a></p>");
            }
            h.append("</li>");
        }
        h.append("</ul>");
    }

    /** The Jobs page: current school job notices from official sources, open ones first, as the app lists them. */
    private String jobs(String heading, String description) {
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › School jobs</nav>");
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        var list = notices.list(com.indiaschoolfinder.entity.SiteUpdate.Category.JOB, NoticeService.Filter.NONE, false, 0, 40);
        items(h, list.page().content());
        if (list.page().content().isEmpty()) {
            h.append("<p>No school job notices are current right now. Teaching and school staff vacancies appear here only with "
                    + "their official source.</p>");
        }
        h.append("<p>Every notice links its official source. SchoolDhundo does not take applications; apply only as the "
                + "official notice describes. <a href=\"/updates?category=JOB\">All job updates</a></p>");
        return h.toString();
    }

    /**
     * A notice's page: its facts (each only as the official source states it, or "not given" for the dates that matter),
     * the posts, questions answered from those facts, the official links and related notices; the same as the app shows.
     */
    private String notice(String slug, com.indiaschoolfinder.entity.SiteUpdate.Category category) {
        var u = notices.visibleNotice(slug, category).orElseThrow(() -> new ResourceNotFoundException("Notice", slug));
        var d = notices.detail(u, notices.today());
        boolean job = category == com.indiaschoolfinder.entity.SiteUpdate.Category.JOB;
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › ")
                .append(job ? "<a href=\"/jobs\">School jobs</a>" : "<a href=\"/admissions\">Admissions</a>").append(" › ")
                .append(esc(d.title())).append("</nav>");
        h.append("<h1>").append(esc(d.title())).append("</h1>");
        h.append("<p class=\"pr-lead\">");
        if (d.applicationStatusLabel() != null) {
            h.append("<strong>").append(esc(d.applicationStatusLabel())).append(".</strong> ");
        }
        h.append(esc(d.summary())).append("</p>");
        h.append("<dl class=\"pr-facts\">");
        fact(h, job ? "Hiring" : "Institution", d.institutionName());
        fact(h, "Campus", d.campus());
        fact(h, "Location", d.city() != null && d.stateName() != null ? d.city() + ", " + d.stateName()
                : d.stateName() != null ? d.stateName() : d.stateCode() == null ? "All India" : null);
        fact(h, "Kind of notice", d.noticeTypeLabel());
        fact(h, "Published", d.publishedOn().format(DAY));
        boolean opening = d.applicationStatus() != null;
        fact(h, "Applications open", d.opensOn() == null ? null : d.opensOn().format(DAY));
        fact(h, "Walk-in interview".equals(d.examLabel()) ? "Walk-in interview" : "Last date",
                d.closesOn() != null ? d.closesOn().format(DAY) : opening ? "Not given in the official listing" : null);
        if (!"Walk-in interview".equals(d.examLabel())) {
            fact(h, d.examLabel(), d.examOn() == null ? null : d.examOn().format(DAY));
        }
        fact(h, "Posts", d.positions().isEmpty() ? String.join(", ", d.postTypes().stream().map(f -> f.label()).toList())
                : String.join(", ", d.positions().stream().map(p -> p.postName()).toList()));
        fact(h, "Subjects", String.join(", ", d.subjects()));
        fact(h, "Number of posts", d.vacancies() == null ? null : String.valueOf(d.vacancies()));
        fact(h, "Classes", d.classes());
        fact(h, "Session", d.academicSession());
        fact(h, "Staff", d.staffKind() == null ? null : switch (d.staffKind()) {
            case TEACHING -> "Teaching";
            case NON_TEACHING -> "Non-teaching";
            case MIXED -> "Teaching and non-teaching";
        });
        fact(h, "Employment", d.employmentType() == null ? null : switch (d.employmentType()) {
            case REGULAR -> "Regular";
            case CONTRACT -> "Contract or guest";
            case PART_TIME -> "Part-time";
            case TEMPORARY -> "Temporary";
        });
        fact(h, "Eligibility", d.eligibility());
        fact(h, "Experience", d.experience());
        fact(h, "TET / CTET", d.tetRequirement());
        fact(h, "Age limit", d.ageLimit());
        fact(h, "Pay (as published)", d.salaryText());
        fact(h, "Application fee", d.applicationFee());
        fact(h, "Selection", d.selectionProcess());
        h.append("</dl>");
        if (!d.answers().isEmpty()) {
            h.append("<h2>Questions and answers</h2><dl class=\"pr-faq\">");
            for (var a : d.answers()) {
                h.append("<dt>").append(esc(a.question())).append("</dt><dd>").append(esc(a.answer()));
                if (a.linkUrl() != null) {
                    h.append(" <a href=\"").append(esc(a.linkUrl())).append("\" rel=\"noopener\">").append(esc(a.linkLabel())).append("</a>");
                }
                h.append("</dd>");
            }
            h.append("</dl>");
        }
        h.append("<h2>Official source</h2><p>");
        if (d.sourceUrl() != null) {
            h.append("<a href=\"").append(esc(d.sourceUrl())).append("\" rel=\"noopener\">Official notice")
                    .append(d.sourceName() == null ? "" : " from " + esc(d.sourceName())).append("</a>");
        }
        if (d.applyUrl() != null) {
            h.append(" · <a href=\"").append(esc(d.applyUrl())).append("\" rel=\"noopener\">Official application page</a>");
        }
        h.append("</p><p>Titles, dates and links are the official source's; the short summary is SchoolDhundo's. Always confirm "
                + "dates and eligibility in the official notice before you apply.</p>");
        if (d.school() != null) {
            h.append("<p><a href=\"/schools/").append(esc(d.school().slug())).append("\">").append(esc(d.school().name()))
                    .append(": school profile</a></p>");
        }
        if (!d.related().isEmpty()) {
            h.append("<h2>").append(job ? "More school jobs" : "More admission notices").append("</h2>");
            items(h, d.related());
        }
        return h.toString();
    }

    /**
     * The government network pages (/network/{slug}): the name used in the list heading, the introduction and official
     * site exactly as the app shows them (frontend content/networks.ts), then where admission is explained on this site.
     */
    private static final java.util.Map<String, String[]> NETWORKS = java.util.Map.of(
            "jawahar-navodaya-vidyalaya", new String[]{"Jawahar Navodaya Vidyalayas",
                    "Residential central government schools run by Navodaya Vidyalaya Samiti; admission to Class VI is through the JNV "
                            + "Selection Test. Education, boarding and lodging are free; a small Vidyalaya Vikas Nidhi contribution applies to "
                            + "some students in Classes IX to XII under the Samiti’s rules.",
                    "https://navodaya.gov.in/", "Navodaya Vidyalaya Samiti",
                    "/exams/jnvst", "JNVST Class 6 preparation: free mock tests", "/exams/jnvst/guide", "JNVST eligibility, dates and syllabus"},
            "sainik-school", new String[]{"Sainik Schools",
                    "Residential schools run by the Sainik Schools Society under the Ministry of Defence. Admission to Classes VI and IX is "
                            + "through the All India Sainik Schools Entrance Examination (AISSEE); eligibility, including for girls, is set in "
                            + "each year’s bulletin. Fees are charged, with scholarships set by states and the Ministry.",
                    "https://sainikschoolsociety.in/", "Sainik Schools Society",
                    "/exams/aissee", "AISSEE Class 6 preparation: free mock tests", "/exams/aissee/guide", "AISSEE eligibility, dates and syllabus"},
            "eklavya-model-residential-school", new String[]{"Eklavya Model Residential Schools",
                    "Residential schools for Scheduled Tribe students, set up under the Ministry of Tribal Affairs and run through the "
                            + "National Education Society for Tribal Students (NESTS) and state societies. Admission rules and dates are set by "
                            + "each state.",
                    "https://emrs.tribal.gov.in/", "Ministry of Tribal Affairs (EMRS)",
                    "/boarding/government", "Government boarding schools in India", "/admissions", "School admissions calendar"},
            "rashtriya-military-school", new String[]{"Rashtriya Military Schools",
                    "Residential schools under the Ministry of Defence. Admission to Classes VI and IX is through the Rashtriya Military "
                            + "Schools Common Entrance Test (RMS CET).",
                    "https://rashtriyamilitaryschools.edu.in/", "Rashtriya Military Schools",
                    "/exams/rms-cet", "RMS CET eligibility, dates and syllabus", "/boarding/government", "Government boarding schools in India"},
            "kendriya-vidyalaya", new String[]{"Kendriya Vidyalayas",
                    "Central government schools run by Kendriya Vidyalaya Sangathan under the Ministry of Education, affiliated to CBSE. "
                            + "They are predominantly day schools, not boarding schools.",
                    "https://kvsangathan.nic.in/", "Kendriya Vidyalaya Sangathan",
                    "/admissions", "School admissions calendar", "/admissions/guide", "School admission guide: process and documents"});

    /** Most schools a network page lists before the app starts (a few networks have more; the app pages through them). */
    private static final int NETWORK_LIST_SIZE = 100;

    /** A government network page: its introduction and official site, its schools, and where admission is explained. */
    private String network(String slug, String heading, String description) {
        String[] n = NETWORKS.get(slug);
        PageResponse<SchoolSummaryDto> page = schoolService.search(
                SeoHeadService.networkCriteria(SeoHeadService.network(slug), NETWORK_LIST_SIZE));
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › <a href=\"/schools\">Schools</a></nav>");
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        h.append("<p>").append(esc(n[1])).append(" Admission notices are published by <a href=\"").append(esc(n[2]))
                .append("\" rel=\"noopener\">").append(esc(n[3])).append("</a>.</p>");
        h.append("<h2>Admission and preparation</h2><ul class=\"pr-grid\">").append(link(n[4], n[5])).append(link(n[6], n[7])).append("</ul>");
        schoolList(h, n[0] + " listed on SchoolDhundo", page.content());
        if (page.totalElements() > page.content().size()) {
            h.append("<p>Showing ").append(page.content().size()).append(" of ").append(String.format(Locale.ENGLISH, "%,d", page.totalElements()))
                    .append(" schools, best documented first. <a href=\"/schools\">Search the full school directory</a></p>");
        }
        h.append("<h2>Other government school networks</h2><ul class=\"pr-grid\">");
        NETWORK_ORDER.stream().filter(other -> !other.equals(slug)).forEach(other -> h.append(link("/network/" + other, NETWORKS.get(other)[0])));
        h.append("</ul>");
        return h.toString();
    }

    /**
     * The network pages in the app's order (content/networks.ts). Each page lists the others: until November 2026 none
     * did, and the Rashtriya Military School and EMRS pages had no link from any server-rendered page.
     */
    static final List<String> NETWORK_ORDER = List.of("jawahar-navodaya-vidyalaya", "sainik-school", "eklavya-model-residential-school",
            "rashtriya-military-school", "kendriya-vidyalaya");

    private static void crumbs(StringBuilder h, String... hrefLabelPairs) {
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a>");
        for (int i = 0; i + 1 < hrefLabelPairs.length; i += 2) {
            h.append(" › <a href=\"").append(hrefLabelPairs[i]).append("\">").append(esc(hrefLabelPairs[i + 1])).append("</a>");
        }
        h.append("</nav>");
    }

    private static void heading(StringBuilder h, String heading, String description) {
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
    }

    private static String count(long n) {
        return String.format(Locale.ENGLISH, "%,d", n);
    }

    /**
     * "Best schools in {state or city}", as the app's BestPlacePage shows it: the counts, the publisher's ranks for the
     * place exactly as printed (never renumbered), the A-to-Z lists that name its schools, the questions and related places.
     */
    private String bestPlace(String slug, String heading, String description) {
        BestPlacesService.Place p = bestPlaces.place(slug);
        boolean city = p.kind() == BestPlacesService.Kind.CITY;
        StringBuilder h = new StringBuilder();
        crumbs(h, "/rankings", "Rankings", "/rankings/states", "State & City");
        heading(h, heading, description);
        h.append("<dl class=\"pr-facts\">");
        fact(h, p.rankingSource() != null ? "Ranked in " + p.rankingSource() : "Ranked in published rankings", count(p.ranked()));
        fact(h, "In SchoolDhundo's A-to-Z lists (not ranks)", count(p.listed()));
        fact(h, "Schools in the directory", count(p.schools()));
        h.append("</dl><p>");
        h.append(p.ranked() > 0
                ? esc(p.ranked() + (p.ranked() == 1 ? " school in " : " schools in ") + p.name() + (p.ranked() == 1 ? " holds" : " hold")
                + " a rank in " + p.rankingSource() + ". ")
                : esc("No published ranking we have checked covers " + p.name() + " yet. "));
        if (p.listed() > 0) {
            h.append(esc(p.listed() + (p.listed() == 1 ? " school is" : " schools are") + " named in SchoolDhundo's compiled A-to-Z lists,"
                    + " which help you find well-known schools but are not rankings. "));
        }
        h.append("Confirm fees, admissions and eligibility with each school before you decide.");
        if (p.checkedOn() != null) h.append(" Ranks last checked ").append(p.checkedOn().format(DAY)).append('.');
        h.append("</p>");

        List<String> topNames = new java.util.ArrayList<>();
        RankingCatalogDtos.Edition national = p.ranked() == 0 ? null : rankings.editions().stream()
                .filter(e -> !e.ratingBased() && e.scope() == RankingScope.NATIONAL && e.boardCode() == null).findFirst().orElse(null);
        if (national != null) {
            List<RankingCatalogDtos.Row> rows = rankings.table(new RankingCatalogDtos.Query(national.id(), p.stateCode(), null, p.city(),
                    null, null, null, null, null, null, null, null, null), 0, 100).content();
            if (!rows.isEmpty()) {
                h.append("<h2>").append(esc("Ranked in " + national.publisherCode() + " " + national.year())).append("</h2><ul class=\"pr-list\">");
                for (RankingCatalogDtos.Row r : rows) {
                    List<String> ranks = new java.util.ArrayList<>();
                    if (city && r.cityRank() != null) ranks.add("City #" + r.cityRank());
                    if (r.stateRank() != null) ranks.add("State #" + r.stateRank());
                    if (r.nationalRank() != null) ranks.add("India #" + r.nationalRank());
                    h.append("<li><a href=\"/schools/").append(esc(r.slug())).append("\">").append(esc(r.schoolName())).append("</a>");
                    if (!ranks.isEmpty()) h.append(" <span>").append(esc(String.join(" · ", ranks))).append("</span>");
                    h.append("</li>");
                    Integer shown = city && r.cityRank() != null ? r.cityRank() : r.stateRank() != null ? r.stateRank() : r.nationalRank();
                    if (topNames.size() < 3) topNames.add(r.schoolName() + " (" + (shown == null ? "–" : "#" + shown) + ")");
                }
                h.append("</ul><p>Ranks are ").append(esc(national.publisher())).append("'s own, as printed. <a href=\"")
                        .append(esc(national.sourceUrl())).append("\" rel=\"nofollow noopener\">Publisher's list</a></p>");
            }
        }

        // A city shows its own city list where one exists, else its state's lists narrowed to the city (as the app does).
        List<com.indiaschoolfinder.dto.common.SchoolListDtos.Summary> all = schoolLists.lists();
        var own = city ? all.stream().filter(l -> "CITY".equals(l.kind()) && p.city() != null
                && l.title().toLowerCase(Locale.ROOT).contains(p.city().toLowerCase(Locale.ROOT))).findFirst().orElse(null) : null;
        List<com.indiaschoolfinder.dto.common.SchoolListDtos.Summary> lists = own != null ? List.of(own)
                : all.stream().filter(l -> "STATE".equals(l.kind()) && p.stateCode().equals(l.code())).toList();
        for (var l : lists) {
            String town = own == null && city ? p.city() : null;
            var items = schoolLists.items(l.key(), town, 0, 60);
            if (items.content().isEmpty()) continue;
            h.append("<h2>").append(esc(town != null ? l.title() + ": " + town : l.title())).append("</h2>");
            h.append("<p>An A-to-Z list, not a ranking.</p><ul class=\"pr-list\">");
            for (var i : items.content()) {
                h.append("<li>");
                if (i.slug() != null) {
                    h.append("<a href=\"/schools/").append(esc(i.slug())).append("\">").append(esc(i.name())).append("</a>");
                } else {
                    h.append(esc(i.name()));
                }
                String about = java.util.stream.Stream.of(i.place(), i.board()).filter(x -> x != null && !x.isBlank())
                        .collect(java.util.stream.Collectors.joining(" · "));
                if (!about.isEmpty()) h.append(" <span>").append(esc(about)).append("</span>");
                h.append("</li>");
            }
            h.append("</ul>");
            if (items.totalElements() > items.content().size()) {
                h.append("<p>Showing ").append(items.content().size()).append(" of ").append(count(items.totalElements())).append(" schools in this list.</p>");
            }
        }

        h.append("<h2>How this page is put together</h2><p>Ranks come only from published rankings we have checked against the ")
                .append("publisher's list, and each publisher's rank is shown as printed; we never combine them into an overall rank. ")
                .append("A-to-Z lists are not rankings. <a href=\"/rankings/methodology\">Ranking methodology</a></p>");
        h.append("<h2>Questions about schools in ").append(esc(p.name())).append("</h2><dl class=\"pr-faq\">");
        if (!topNames.isEmpty()) {
            faq(h, "Which are the best schools in " + p.name() + "?", "In " + p.rankingSource() + ", the highest-placed schools in "
                    + p.name() + " are " + String.join(", ", topNames) + ". These are the publisher's own ranks; the full list is above.");
        }
        faq(h, "How are schools in " + p.name() + " ranked here?", p.ranked() > 0
                ? "SchoolDhundo does not rank schools itself on this page. It shows ranks from published rankings (" + p.rankingSource()
                + "), checked against the publisher's list, with each publisher's own rank and year."
                : "No published ranking that we have checked covers " + p.name() + " yet, so no school here has a rank. The schools shown "
                + "come from SchoolDhundo's A-to-Z lists, which are not rankings.");
        faq(h, "Is there an official government ranking of schools in " + p.name() + "?", "No. Government data such as UDISE+ and "
                + "PGI-D describes schools and states but does not rank individual schools. Rankings shown here come from independent publishers.");
        faq(h, "How many schools are listed in " + p.name() + "?", "SchoolDhundo's directory has " + count(p.schools()) + " schools in "
                + p.name() + ", each linked to its official source. Most are not in any published ranking.");
        h.append("</dl>");
        h.append("<h2>Related places</h2><ul class=\"pr-grid\">");
        h.append(link(city ? "/states/" + p.stateSlug() + "/city/" + p.slug() : "/states/" + p.stateSlug(),
                "All " + count(p.schools()) + " schools in " + p.name()));
        p.related().stream().filter(r -> r.ranked() + r.listed() >= BestPlacesService.MIN_TO_INDEX)
                .forEach(r -> h.append(link("/rankings/best-schools-in-" + r.slug(), "Best schools in " + r.name())));
        h.append("</ul>");
        return h.toString();
    }

    private static void faq(StringBuilder h, String question, String answer) {
        h.append("<dt>").append(esc(question)).append("</dt><dd>").append(esc(answer)).append("</dd>");
    }

    /** The blog's index or one category: its published articles, newest first, with their excerpts (as the app lists them). */
    private String blogIndex(String heading, String description, com.indiaschoolfinder.entity.BlogPost.Category category) {
        StringBuilder h = new StringBuilder();
        if (category == null) crumbs(h); else crumbs(h, "/blog", "Blog");
        heading(h, heading, description);
        var posts = blogService.list(null, category, 0, 50).content();
        if (!posts.isEmpty()) {
            h.append("<h2>").append(category == null ? "Latest articles" : "Articles").append("</h2><ul class=\"pr-list\">");
            for (var post : posts) {
                h.append("<li><a href=\"/blog/").append(esc(post.slug())).append("\">").append(esc(post.title())).append("</a> <span>")
                        .append(esc(post.category().label())).append(" · ").append(post.publishedAt().atZone(INDIA).toLocalDate().format(DAY))
                        .append(" · ").append(post.minutesToRead()).append(" min read</span>");
                if (post.excerpt() != null) h.append("<p>").append(esc(post.excerpt())).append("</p>");
                h.append("</li>");
            }
            h.append("</ul>");
        }
        var counts = blogService.categoryCounts();
        if (!counts.isEmpty()) {
            h.append("<h2>Topics</h2><ul class=\"pr-grid\">");
            for (var c : com.indiaschoolfinder.entity.BlogPost.Category.values()) {
                long n = counts.getOrDefault(c, 0L);
                if (n > 0 && c != category) {
                    h.append("<li><a href=\"/blog/category/").append(c.slug()).append("\">").append(esc(c.label())).append("</a> <span>")
                            .append(n).append(n == 1 ? " article" : " articles").append("</span></li>");
                }
            }
            h.append("</ul>");
        }
        return h.toString();
    }

    /** The exams hub: the preparation dashboards, then every published entrance exam and admission process with its guide. */
    private String examsHub(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h);
        heading(h, heading, description);
        h.append("<h2>Free preparation</h2><ul class=\"pr-grid\">")
                .append(link("/exams/jnvst", "JNVST Class 6 preparation (Navodaya)"))
                .append(link("/exams/aissee", "AISSEE Class 6 preparation (Sainik School)"))
                .append(link("/exams/netarhat", "Netarhat Vidyalaya entrance preparation"))
                .append(link(OlympiadPages.PATH, "Olympiad preparation, Classes 1 to 10"))
                .append(link("/exams/practice", "Practice centre: quizzes and mock tests"))
                .append("</ul>");
        List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams = allExams();
        examItems(h, "Entrance exams and admission processes", exams);
        java.util.SortedSet<Integer> classes = new java.util.TreeSet<>();
        exams.forEach(e -> { if (e.entryClasses() != null) classes.addAll(e.entryClasses()); });
        if (!classes.isEmpty()) {
            h.append("<h2>By admission class</h2><ul class=\"pr-grid\">");
            classes.stream().filter(n -> n >= 1 && n <= 12)
                    .forEach(n -> h.append(link("/exams/class/" + n, "Entrance exams for Class " + ROMAN.get(n - 1))));
            h.append("</ul>");
        }
        // Only states with an exam of their own have a page worth visiting (the others are noindex: they repeat this list).
        Set<String> ownExamStates = new java.util.HashSet<>();
        exams.stream().filter(e -> e.scope() == com.indiaschoolfinder.enums.ExamScope.STATE && e.stateCodes() != null)
                .forEach(e -> ownExamStates.addAll(e.stateCodes()));
        List<StateDto> examStates = locationService.states().stream().filter(s -> ownExamStates.contains(s.code()))
                .sorted(Comparator.comparing(StateDto::name)).toList();
        if (!examStates.isEmpty()) {
            h.append("<h2>By state</h2><ul class=\"pr-grid\">");
            examStates.forEach(s -> h.append(link("/exams/state/" + s.slug(), "Entrance exams in " + s.name())));
            h.append("</ul>");
        }
        h.append("<h2>Plan and prepare</h2><ul class=\"pr-grid\">")
                .append(link("/exams/finder", "Which exams can my child take?"))
                .append(link("/exams/calendar", "Entrance exam calendar"))
                .append(link("/exams/syllabus", "Exam pattern and syllabus"))
                .append(link("/exams/resources", "Official learning resources"))
                .append("</ul>");
        return h.toString();
    }

    private static final List<String> ROMAN = List.of("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII");

    /** A filtered exam page (one class, one state): the exams it lists, each linked to its guide. */
    private String examList(String heading, String description, List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams) {
        return examList(heading, description, exams, null);
    }

    /** As above; with a caption, the exams are first compared in a table, as the app's class page does (ExamComparison). */
    private String examList(String heading, String description, List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams,
                            String compareCaption) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams");
        heading(h, heading, description);
        if (compareCaption != null && exams.size() > 1) {
            Map<String, String> states = new java.util.HashMap<>();
            locationService.states().forEach(s -> states.put(s.code(), s.name()));
            examTable(h, compareCaption, exams, states);
        }
        examItems(h, "Exams", exams);
        return h.toString();
    }

    /**
     * The app's "Compare at a glance" table: who runs each exam, who can apply, the kind of school, the exam date (with
     * "Held on" once it has passed), the application fee, the mode and the official source, from the exams' own records.
     */
    static void examTable(StringBuilder h, String caption, List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams,
                          Map<String, String> stateNames) {
        h.append("<h2>Compare at a glance</h2><table><caption>").append(esc(caption)).append("</caption><thead><tr>");
        for (String col : new String[]{"Exam", "Who can apply", "Schools", "Exam date", "Application", "Mode", "Source"}) {
            h.append("<th scope=\"col\">").append(col).append("</th>");
        }
        h.append("</tr></thead><tbody>");
        for (var e : exams) {
            String scope = e.scope() == com.indiaschoolfinder.enums.ExamScope.NATIONAL ? "All India"
                    : e.stateCodes().stream().map(c -> stateNames.getOrDefault(c, c)).collect(java.util.stream.Collectors.joining(", "));
            String schools = e.boarding() == null ? "Not stated" : switch (e.boarding()) {
                case BOARDING -> "Boarding only";
                case DAY -> "Day school";
                case BOTH -> "Boarding or day";
            };
            String date = e.examDate() == null
                    ? (e.status() == com.indiaschoolfinder.enums.ExamStatus.AWAITING_NOTIFICATION ? "Not announced yet" : "No confirmed date")
                    : (SeoHeadService.examAhead(e) ? "" : "Held on ") + DAY.format(e.examDate());
            String application = e.applicationFree() == null ? "Not stated" : e.applicationFree() ? "Free" : "Fee charged";
            String mode = e.examMode() == null ? "Not stated" : switch (e.examMode()) {
                case PEN_PAPER -> "Pen and paper";
                case COMPUTER -> "Computer-based";
                case NO_WRITTEN_TEST -> "No written test";
            };
            h.append("<tr><th scope=\"row\"><a href=\"/exams/").append(e.slug()).append("\">").append(esc(e.shortName())).append("</a> <span>")
                    .append(esc(e.conductingAuthority())).append("</span></th><td>").append(esc(scope)).append("</td><td>").append(schools)
                    .append("</td><td>").append(date).append(" <span>").append(esc(e.currentCycle())).append("</span></td><td>")
                    .append(application).append("</td><td>").append(mode).append("</td><td>");
            if (e.officialUrl() != null && !e.officialUrl().isBlank()) {
                h.append("<a href=\"").append(esc(e.officialUrl())).append("\" rel=\"noopener\">Official site</a>");
            }
            if (e.lastVerifiedOn() != null) h.append(" <span>Checked ").append(DAY.format(e.lastVerifiedOn())).append("</span>");
            h.append("</td></tr>");
        }
        h.append("</tbody></table>");
    }

    /**
     * A preparation page's name in a breadcrumb: JNVST and AISSEE are acronyms, Netarhat is a place. The slug in capitals
     * gave 27 practice pages the link text "NETARHAT" (Nov 2026 crawl).
     */
    static String prepName(String examSlug) {
        return "netarhat".equals(examSlug) ? "Netarhat" : examSlug.toUpperCase(Locale.ROOT);
    }

    /** Every published exam and admission process, as the exams hub lists them. */
    private List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> allExams() {
        return examService.list(new ExamService.Filter(null, null, null, null, null, null, null, null, null, null, null, null),
                ExamService.Sort.RELEVANCE, 0, 100).content();
    }

    /**
     * From an exam's page to the page of each class it admits to, where that class's exams are compared side by side
     * (examTable). A class this exam alone admits to is left out: its page would only list this exam again.
     */
    private void classComparisons(StringBuilder h, List<Integer> entryClasses) {
        if (entryClasses == null || entryClasses.isEmpty()) return;
        List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams = allExams();
        StringBuilder items = new StringBuilder();
        for (int n : entryClasses) {
            if (n < 1 || n > 12) continue;
            long count = exams.stream().filter(x -> x.entryClasses() != null && x.entryClasses().contains(n)).count();
            if (count > 1) items.append(link("/exams/class/" + n, "All " + count + " Class " + ROMAN.get(n - 1) + " entrance exams compared"));
        }
        if (!items.isEmpty()) h.append("<h2>Other exams for the same class</h2><ul class=\"pr-grid\">").append(items).append("</ul>");
    }

    /** "28 Nov 2026", "1 Dec 2026 to 5 Dec 2026", or "December 2026" for a date known only to the month. */
    static String dateText(com.indiaschoolfinder.dto.exam.ExamDateDto d) {
        boolean month = d.precision() == com.indiaschoolfinder.enums.DatePrecision.MONTH;
        String start = month ? d.startsOn().format(MONTH) : time(d.startsOn());
        if (d.endsOn() == null || d.endsOn().equals(d.startsOn())) return start;
        return start + " to " + (month ? d.endsOn().format(MONTH) : time(d.endsOn()));
    }

    /**
     * The entrance-exam calendar, as the app's list view shows it (ExamCalendarPage): every date of each exam's current
     * cycle that has not passed, month by month, with whether the official notice confirms it and the notice itself;
     * then the exams with no date out yet. A tentative date is called tentative, never counted on.
     */
    String examCalendar(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams");
        heading(h, heading, description);
        List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams = allExams();
        java.time.LocalDate today = java.time.LocalDate.now(INDIA);
        record Event(com.indiaschoolfinder.dto.exam.ExamSummaryDto exam, com.indiaschoolfinder.dto.exam.ExamDateDto date) {
            java.time.LocalDate last() {
                return date.endsOn() != null ? date.endsOn() : date.startsOn();
            }
        }
        List<Event> events = exams.stream()
                .flatMap(e -> (e.currentDates() == null ? List.<com.indiaschoolfinder.dto.exam.ExamDateDto>of() : e.currentDates())
                        .stream().map(d -> new Event(e, d)))
                .filter(ev -> ev.date().startsOn() != null && !ev.last().isBefore(today))
                .sorted(Comparator.comparing((Event ev) -> ev.date().startsOn()).thenComparing(ev -> ev.exam().shortName()))
                .toList();
        String month = null;
        for (Event ev : events) {
            String m = ev.date().startsOn().format(MONTH);
            if (!m.equals(month)) {
                if (month != null) h.append("</tbody></table>");
                month = m;
                h.append("<h2>").append(m).append("</h2><table><thead><tr><th scope=\"col\">Date</th><th scope=\"col\">Exam</th>")
                        .append("<th scope=\"col\">What happens</th><th scope=\"col\">Status</th></tr></thead><tbody>");
            }
            var e = ev.exam();
            String guide = "/exams/" + e.slug() + (SeoHeadService.PREP_PAGES.contains(e.slug()) ? "/guide" : "");
            h.append("<tr><td>").append(dateText(ev.date())).append("</td><th scope=\"row\"><a href=\"").append(guide).append("\">")
                    .append(esc(e.shortName())).append("</a> <span>").append(esc(e.currentCycle())).append("</span></th><td>")
                    .append(esc(ev.date().label())).append("</td><td>").append(ev.date().confirmed() ? "Confirmed" : "Tentative");
            if (ev.date().sourceUrl() != null && !ev.date().sourceUrl().isBlank()) {
                h.append(" · <a href=\"").append(esc(ev.date().sourceUrl())).append("\" rel=\"noopener\">official notice</a>");
            }
            h.append("</td></tr>");
        }
        if (month != null) {
            h.append("</tbody></table>");
        } else {
            h.append("<p>No upcoming date has been announced yet.</p>");
        }
        Set<String> dated = new java.util.HashSet<>();
        events.forEach(ev -> dated.add(ev.exam().slug()));
        examItems(h, "No date announced yet", exams.stream().filter(e -> !dated.contains(e.slug())).toList());
        h.append("<p>Every date is taken from the conducting body's own notice and checked against it; tentative dates are ")
                .append("expected from past cycles, not announced.</p>");
        return h.toString();
    }

    /** The app's names for resource types (ExamResourcesPage TYPE_INFO). */
    private static final java.util.Map<com.indiaschoolfinder.dto.exam.ExamResourceDto.Type, String> RESOURCE_TYPES = java.util.Map.of(
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.QUESTION_PAPER, "Previous-year paper",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.ANSWER_KEY, "Answer key",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.SAMPLE_PAPER, "Sample paper",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.OFFICIAL_LINK, "Official notice or page",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.SYLLABUS, "Syllabus",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.EXAM_PATTERN, "Exam pattern",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.PREPARATION_GUIDE, "Preparation plan",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.DOCUMENT_CHECKLIST, "Document checklist",
            com.indiaschoolfinder.dto.exam.ExamResourceDto.Type.FAQ, "FAQ");

    /**
     * The learning resources, grouped as the app groups them (ExamResourcesPage): first what each conducting body
     * publishes (papers, answer keys, notices), linked at its own site and never copied; then, per exam, this site's
     * guides and its published practice sets, which are original questions, not official ones.
     */
    String examResources(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams");
        heading(h, heading, description);
        List<com.indiaschoolfinder.dto.exam.ExamResourceDto> resources = examService.resources();
        java.util.Map<String, List<com.indiaschoolfinder.dto.exam.ExamResourceDto>> official = new java.util.LinkedHashMap<>();
        java.util.Map<String, List<com.indiaschoolfinder.dto.exam.ExamResourceDto>> own = new java.util.LinkedHashMap<>();
        java.util.Map<String, String> names = new java.util.LinkedHashMap<>();
        for (var r : resources) {
            names.putIfAbsent(r.examSlug(), r.examShortName());
            (r.official() ? official : own).computeIfAbsent(r.examSlug(), k -> new java.util.ArrayList<>()).add(r);
        }
        if (!official.isEmpty()) {
            h.append("<h2>Official: published by the conducting body</h2><p>Each link opens the conducting body's own site. ")
                    .append("Files are linked, never copied or re-hosted.</p>");
            official.forEach((exam, rows) -> resourceGroup(h, names.get(exam), rows));
        }
        h.append("<h2>SchoolDhundo guides and practice</h2><p>Our own material, built from the official notices. Practice ")
                .append("questions are original, not official or previous-year questions.</p>");
        java.util.Map<String, List<Object[]>> setsByExam = new java.util.HashMap<>();
        practiceSets.findPublishedCatalogue().stream().filter(s -> s[4] != null)
                .forEach(s -> setsByExam.computeIfAbsent((String) s[4], k -> new java.util.ArrayList<>()).add(s));
        for (String exam : names.keySet()) {
            List<Object[]> sets = setsByExam.getOrDefault(exam, List.of());
            List<com.indiaschoolfinder.dto.exam.ExamResourceDto> guides = own.getOrDefault(exam, List.of());
            if (guides.isEmpty() && sets.isEmpty()) continue;
            h.append("<h3>").append(esc(names.get(exam))).append("</h3><ul class=\"pr-list\">");
            // One link to the guide's plain address, naming what it holds: the app's ?tab= paths would be new duplicate
            // addresses for search engines (the profile ?tab= problem of November 2026, see profileLink.ts).
            if (!guides.isEmpty()) {
                String guide = "/exams/" + exam + (SeoHeadService.PREP_PAGES.contains(exam) ? "/guide" : "");
                h.append("<li><a href=\"").append(guide).append("\">").append(esc(names.get(exam))).append(" guide</a> <span>")
                        .append(guides.stream().map(r -> RESOURCE_TYPES.getOrDefault(r.type(), "Guide")).distinct()
                                .collect(java.util.stream.Collectors.joining(" · "))).append("</span></li>");
            }
            sets.forEach(s -> h.append("<li><a href=\"/exams/practice/").append(s[0]).append("\">").append(esc((String) s[1]))
                    .append("</a> <span>").append(s[2] == com.indiaschoolfinder.entity.PracticeSet.Kind.MOCK ? "Mock test" : "Practice quiz")
                    .append(s[3] != null ? " · " + s[3] + " min" : "").append("</span></li>"));
            h.append("</ul>");
        }
        return h.toString();
    }

    private static void resourceGroup(StringBuilder h, String exam, List<com.indiaschoolfinder.dto.exam.ExamResourceDto> rows) {
        h.append("<h3>").append(esc(exam)).append("</h3><ul class=\"pr-list\">");
        for (var r : rows) {
            h.append("<li><a href=\"").append(esc(r.url())).append("\" rel=\"noopener\">").append(esc(r.title())).append("</a> <span>")
                    .append(RESOURCE_TYPES.getOrDefault(r.type(), "Official page"));
            if (r.year() != null && !r.year().isBlank()) h.append(" · ").append(esc(r.year()));
            if (r.lastVerifiedOn() != null) h.append(" · checked ").append(time(r.lastVerifiedOn()));
            h.append("</span></li>");
        }
        h.append("</ul>");
    }

    /**
     * The practice centre: every published set, entrance-exam sets under their exam (with its preparation page where it
     * has one), Olympiad practice through its class pages, and school-subject sets by name. Until November 2026 this page
     * had no list in its HTML, and sets such as class8-science-1 had no link from any server-rendered page.
     */
    String practiceCentre(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams");
        heading(h, heading, description);
        h.append("<p>Original questions written by SchoolDhundo, each with an explanation. They are for practice only: not ")
                .append("official or previous-year exam questions. Free, with no sign-up needed to start.</p>");
        List<Object[]> sets = practiceSets.findPublishedCatalogue();
        java.util.Map<String, String> examNames = new java.util.HashMap<>();
        allExams().forEach(e -> examNames.put(e.slug(), e.shortName()));
        java.util.Map<String, List<Object[]>> byExam = new java.util.LinkedHashMap<>();
        List<Object[]> school = new java.util.ArrayList<>();
        boolean olympiad = false;
        for (Object[] s : sets) {
            var category = (com.indiaschoolfinder.entity.PracticeSet.Category) s[5];
            if (s[4] != null) byExam.computeIfAbsent((String) s[4], k -> new java.util.ArrayList<>()).add(s);
            else if (category == com.indiaschoolfinder.entity.PracticeSet.Category.OLYMPIAD) olympiad = true;
            else school.add(s);
        }
        if (!byExam.isEmpty()) {
            h.append("<h2>Entrance exam practice</h2>");
            byExam.forEach((exam, list) -> {
                h.append("<h3>").append(esc(examNames.getOrDefault(exam, exam.toUpperCase(Locale.ROOT)))).append("</h3><ul class=\"pr-list\">");
                if (SeoHeadService.PREP_PAGES.contains(exam)) h.append(link("/exams/" + exam, "Preparation dashboard and study plan"));
                else if (examNames.containsKey(exam)) h.append(link("/exams/" + exam, examNames.get(exam) + ": eligibility, dates and syllabus"));
                list.forEach(s -> practiceItem(h, s));
                h.append("</ul>");
            });
        }
        if (olympiad) {
            h.append("<h2>Olympiad practice</h2><ul class=\"pr-grid\">").append(link(OlympiadPages.PATH, "Olympiad preparation, Classes 1 to 10"));
            for (int c = 1; c <= 10; c++) h.append(link(OlympiadPages.PATH + "/class-" + c, "Class " + c + " Olympiad practice"));
            h.append("</ul>");
        }
        if (!school.isEmpty()) {
            h.append("<h2>School subject practice</h2><ul class=\"pr-list\">");
            school.forEach(s -> practiceItem(h, s));
            h.append("</ul>");
        }
        return h.toString();
    }

    private static void practiceItem(StringBuilder h, Object[] s) {
        h.append("<li><a href=\"/exams/practice/").append(s[0]).append("\">").append(esc((String) s[1])).append("</a> <span>")
                .append(s[2] == com.indiaschoolfinder.entity.PracticeSet.Kind.MOCK ? "Mock test" : "Practice quiz");
        if (s[3] != null) h.append(" · ").append(s[3]).append(" min");
        if (s[6] != null && !((String) s[6]).isBlank()) h.append(" · ").append(esc((String) s[6]));
        h.append("</span></li>");
    }

    private static void examItems(StringBuilder h, String title, List<com.indiaschoolfinder.dto.exam.ExamSummaryDto> exams) {
        if (exams.isEmpty()) return;
        h.append("<h2>").append(esc(title)).append("</h2><ul class=\"pr-list\">");
        for (var e : exams) {
            String guide = "/exams/" + e.slug() + (SeoHeadService.PREP_PAGES.contains(e.slug()) ? "/guide" : "");
            h.append("<li><a href=\"").append(guide).append("\">").append(esc(e.shortName().equals(e.name()) ? e.name() : e.shortName() + ": " + e.name()))
                    .append("</a>");
            String about = java.util.stream.Stream.of(e.entryClassText(), e.conductingAuthority()).filter(x -> x != null && !x.isBlank())
                    .collect(java.util.stream.Collectors.joining(" · "));
            if (!about.isEmpty()) h.append(" <span>").append(esc(about)).append("</span>");
            h.append("</li>");
        }
        h.append("</ul>");
    }

    /** A board's page: its best-documented schools first, as the app's directory lists them, and the other boards. */
    private String board(String code, String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/schools", "Schools");
        heading(h, heading, description);
        PageResponse<SchoolSummaryDto> page = schoolService.search(new SchoolSearchCriteria(null, null, null, null, null, null, null, code,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, "recommended", null, 0, LIST_SIZE));
        schoolList(h, heading, page.content());
        if (page.totalElements() > page.content().size()) {
            h.append("<p>Showing ").append(page.content().size()).append(" of ").append(count(page.totalElements()))
                    .append(" schools, best documented first.</p>");
        }
        // Few IB and Cambridge schools carry the board on their record; the premier directory lists more (as the app links).
        if ("IB".equals(code) || "CAMBRIDGE".equals(code)) {
            String view = "IB".equals(code) ? "ib-schools" : "cambridge-schools";
            h.append("<p>See also <a href=\"/rankings/").append(view).append("\">Best ").append("IB".equals(code) ? "IB" : "Cambridge")
                    .append(" schools in India and how to check one</a>.</p>");
        }
        h.append("<h2>Other boards</h2><ul class=\"pr-grid\">");
        for (String[] b : new String[][]{{"CBSE", "CBSE schools"}, {"CISCE", "ICSE/ISC schools"}, {"IB", "IB schools"}, {"CAMBRIDGE", "Cambridge schools"}}) {
            if (!b[0].equals(code)) h.append(link("/boards/" + b[0], b[1]));
        }
        h.append(link("/rankings/boards", "Board-wise rankings")).append(link("/blog/cbse-vs-icse", "CBSE vs ICSE: which board to choose")).append("</ul>");
        return h.toString();
    }

    /**
     * A practice set's landing page: what it covers, its length and level, and where it belongs. The questions and their
     * answers are not sent here; the app loads them when the set is started.
     */
    private String practiceSet(com.indiaschoolfinder.entity.PracticeSet set, String heading, String description) {
        boolean olympiad = set.getCategory() == com.indiaschoolfinder.entity.PracticeSet.Category.OLYMPIAD;
        boolean prep = set.getExamSlug() != null && SeoHeadService.PREP_PAGES.contains(set.getExamSlug());
        // An Olympiad set for one class belongs to that class's Olympiad page.
        int olympiadClass = olympiad ? OlympiadPages.classNumber(set.getLevel()) : 0;
        String classPage = OlympiadPages.PATH + "/class-" + olympiadClass;
        StringBuilder h = new StringBuilder();
        if (olympiadClass > 0) crumbs(h, "/exams", "Exams", OlympiadPages.PATH, "Olympiad", classPage, "Class " + olympiadClass);
        else if (olympiad) crumbs(h, "/exams", "Exams", OlympiadPages.PATH, "Olympiad");
        else if (prep) crumbs(h, "/exams", "Exams", "/exams/" + set.getExamSlug(), prepName(set.getExamSlug()));
        else crumbs(h, "/exams/practice", "Practice");
        heading(h, heading, null);
        if (set.getDescription() != null) h.append("<p class=\"pr-lead\">").append(esc(set.getDescription())).append("</p>");
        h.append("<dl class=\"pr-facts\">");
        fact(h, "Type", set.getKind() == com.indiaschoolfinder.entity.PracticeSet.Kind.MOCK ? "Timed mock test" : "Practice quiz");
        fact(h, "Level", set.getLevel());
        fact(h, "Questions", set.getContent() == null ? null : String.valueOf(set.getContent().questions().size()));
        fact(h, "Time", set.getDurationMinutes() == null ? "Untimed" : set.getDurationMinutes() + " minutes");
        h.append("</dl>");
        h.append("<p>Original practice questions written by SchoolDhundo, with an explanation for every answer. They are not official ")
                .append("or previous-year exam questions.</p>");
        List<Object[]> related = set.getExamSlug() != null ? practiceSets.findPublishedOutlineByExam(set.getExamSlug())
                : practiceSets.findPublishedOutlineByCategory(set.getCategory());
        List<Object[]> others = related.stream().filter(s -> !set.getSlug().equals(s[0])).limit(12).toList();
        if (!others.isEmpty()) {
            h.append("<h2>More practice</h2><ul class=\"pr-list\">");
            others.forEach(s -> h.append(link("/exams/practice/" + s[0], (String) s[1])));
            h.append("</ul>");
        }
        h.append("<ul class=\"pr-grid\">");
        if (prep) {
            h.append(link("/exams/" + set.getExamSlug(), "Preparation dashboard and study plan"))
                    .append(link("/exams/" + set.getExamSlug() + "/guide", "Eligibility, dates, syllabus and official papers"));
        } else if (olympiad) {
            if (olympiadClass > 0) h.append(link(classPage, "All Class " + olympiadClass + " Olympiad practice"));
            h.append(link(OlympiadPages.PATH, "Olympiad preparation for every class"));
        }
        h.append(link("/exams/practice", "Practice centre")).append("</ul>");
        return h.toString();
    }

    /** The school directory: the best-documented schools first, as the app lists them, and the ways to browse. */
    private String directoryHome(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h);
        heading(h, heading, description);
        List<StateDto> states = locationService.states().stream().filter(s -> s.schoolCount() > 0)
                .sorted(Comparator.comparing(StateDto::name)).toList();
        if (!states.isEmpty()) {
            h.append("<h2>Schools by state</h2><ul class=\"pr-grid\">");
            states.forEach(s -> h.append("<li><a href=\"/states/").append(s.slug()).append("\">").append(esc(s.name())).append("</a> <span>")
                    .append(count(s.schoolCount())).append("</span></li>"));
            h.append("</ul>");
        }
        h.append("<h2>Browse</h2><ul class=\"pr-grid\">")
                .append(link("/cities", "Schools by city"))
                .append(link("/boards/CBSE", "CBSE schools")).append(link("/boards/CISCE", "ICSE/ISC schools"))
                .append(link("/boarding", "Boarding schools"))
                .append(link("/network/jawahar-navodaya-vidyalaya", "Jawahar Navodaya Vidyalayas"))
                .append(link("/network/kendriya-vidyalaya", "Kendriya Vidyalayas"))
                .append(link("/network/sainik-school", "Sainik Schools"))
                .append(link("/nearby", "Schools near me"))
                .append("</ul>");
        schools(h, criteria(null, null, null), "Schools on SchoolDhundo");
        return h.toString();
    }

    /** Every state and union territory with schools, grouped as the app groups them, each with its count. */
    private String statesIndex(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/schools", "Schools");
        heading(h, heading, description);
        List<StateDto> states = locationService.states().stream().filter(s -> s.schoolCount() > 0)
                .sorted(Comparator.comparing(StateDto::name)).toList();
        for (var kind : com.indiaschoolfinder.enums.StateKind.values()) {
            List<StateDto> group = states.stream().filter(s -> s.kind() == kind).toList();
            if (group.isEmpty()) continue;
            h.append("<h2>").append(kind == com.indiaschoolfinder.enums.StateKind.UNION_TERRITORY ? "Union territories" : "States")
                    .append("</h2><ul class=\"pr-grid\">");
            group.forEach(s -> h.append("<li><a href=\"/states/").append(s.slug()).append("\">").append(esc(s.name()))
                    .append("</a> <span>").append(count(s.schoolCount())).append(" schools</span></li>"));
            h.append("</ul>");
        }
        return h.toString();
    }

    /**
     * Every city with schools, largest first, as the app lists them. Only towns with a page of their own are linked
     * (enough schools to be indexed); two spellings of one town are one link.
     */
    private String citiesIndex(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/schools", "Schools");
        heading(h, heading, description);
        Set<String> seen = new java.util.HashSet<>();
        h.append("<ul class=\"pr-grid\">");
        for (var c : locationService.citiesAcrossIndia()) {
            String href = "/states/" + c.stateSlug() + "/city/" + c.slug();
            if (c.schoolCount() < SeoHeadService.MIN_SCHOOLS_TO_INDEX || !seen.add(href)) continue;
            h.append("<li><a href=\"").append(href).append("\">").append(esc(c.name())).append("</a> <span>").append(esc(c.stateName()))
                    .append(" · ").append(count(c.schoolCount())).append("</span></li>");
        }
        h.append("</ul><p><a href=\"/states\">Schools by state</a> · <a href=\"/schools\">Search all schools</a></p>");
        return h.toString();
    }

    /** The rankings' place index: each state and city with enough ranked or listed schools for a page of its own. */
    private String bestPlacesIndex(String heading, String description) {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/rankings", "Rankings");
        heading(h, heading, description);
        List<BestPlacesService.Related> places = bestPlaces.all().stream()
                .filter(r -> r.ranked() + r.listed() >= BestPlacesService.MIN_TO_INDEX).toList();
        if (!places.isEmpty()) {
            h.append("<h2>Best schools by state and city</h2><ul class=\"pr-grid\">");
            places.forEach(r -> h.append(link("/rankings/best-schools-in-" + r.slug(), "Best schools in " + r.name())));
            h.append("</ul>");
        }
        h.append("<p>Ranks are shown only from published rankings checked against the publisher's list. ")
                .append("<a href=\"/rankings/methodology\">Ranking methodology</a></p>");
        return h.toString();
    }

    /**
     * The boarding directory or one of its landing pages: the rule it applies and its schools A to Z (boarding schools
     * only, as the app searches them), with links to the other landing pages.
     */
    private String boarding(String slug, String heading, String description) {
        BoardingLanding l = slug == null ? null : BOARDING_LANDINGS.get(slug);
        StringBuilder h = new StringBuilder();
        if (slug == null) crumbs(h, "/schools", "Schools"); else crumbs(h, "/boarding", "Boarding schools");
        heading(h, heading, description);
        if (l != null) h.append("<p>").append(esc(l.rule())).append("</p>");
        PageResponse<SchoolSummaryDto> page = schoolService.search(new SchoolSearchCriteria(null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, l == null ? null : l.maxFee(), null, null, null, null, null, null, null,
                l == null ? null : l.gender(), null, true, null, l == null ? null : l.systems(), null, null, null, null,
                "name", null, 0, NETWORK_LIST_SIZE));
        schoolList(h, slug == null ? "Boarding and residential schools" : heading, page.content());
        if (page.totalElements() > page.content().size()) {
            h.append("<p>Showing ").append(page.content().size()).append(" of ").append(count(page.totalElements()))
                    .append(" schools, A to Z. Listings are not a ranking.</p>");
        }
        h.append("<h2>Browse boarding schools</h2><ul class=\"pr-grid\">");
        for (String[] b : new String[][]{{"india", "Boarding schools in India"}, {"government", "Government boarding schools"},
                {"private", "Private boarding schools"}, {"boys", "Boys' boarding schools"}, {"girls", "Girls' boarding schools"},
                {"co-ed", "Co-educational boarding schools"}, {"affordable", "Affordable boarding schools"}}) {
            if (!b[0].equals(slug)) h.append(link("/boarding/" + b[0], b[1]));
        }
        h.append(link("/exams/jnvst", "JNVST (Navodaya) preparation")).append(link("/exams/aissee", "AISSEE (Sainik School) preparation"))
                .append(link("/blog/day-school-vs-boarding-school", "Day school or boarding school?")).append("</ul>");
        return h.toString();
    }

    private boolean isDirectoryView(String slug) {
        return directory.categories().stream().anyMatch(c -> c.slug().equals(slug));
    }

    /** A directory view: its description, then its schools A to Z with town, state and board, as the app lists them. */
    private String directoryView(String slug, String heading, String description) {
        PremierDirectoryDtos.Category category = directory.category(slug);
        var schools = directory.list(new PremierDirectoryDtos.Query(slug, null, null, null, null, null, null, null, null, null), 0, 120)
                .content();
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › <a href=\"/rankings\">Rankings</a></nav>");
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        if (category.description() != null && !category.description().isBlank()) {
            h.append("<p>").append(esc(category.description())).append("</p>");
        }
        if (!schools.isEmpty()) {
            h.append("<h2>").append(esc(category.title())).append(": ").append(category.schools()).append(" schools, A to Z</h2><ul class=\"pr-list\">");
            for (PremierDirectoryDtos.School s : schools) {
                h.append("<li>");
                if (s.slug() != null) {
                    h.append("<a href=\"/schools/").append(s.slug()).append("\">").append(esc(s.name())).append("</a>");
                } else {
                    h.append(esc(s.name()));
                }
                Set<String> about = new LinkedHashSet<>();
                if (s.city() != null && !s.city().isBlank()) about.add(s.city().trim());
                if (s.stateName() != null) about.add(s.stateName());
                s.boards().stream().filter(b -> !"OTHER".equals(b.code()))
                        .forEach(b -> about.add(shortBoard(b.code())));
                if (!about.isEmpty()) {
                    h.append(" <span>").append(esc(String.join(" · ", about))).append("</span>");
                }
                h.append("</li>");
            }
            h.append("</ul>");
        }
        DirectoryGuides.forView(slug).ifPresent(g -> directoryGuide(h, g));
        return h.toString();
    }

    /** A board in a list line: "ICSE/ISC", "Cambridge", "State board", or the code (CBSE, IB). */
    static String shortBoard(String code) {
        return switch (code) {
            case "CISCE" -> "ICSE/ISC";
            case "CAMBRIDGE" -> "Cambridge";
            case "STATE" -> "State board";
            default -> code;
        };
    }

    /**
     * A feed link to a profile section (/schools/x?tab=admissions) as the plain profile address: the app opens the section
     * through its navigation state (utils/profileLink.ts), and a ?tab= address is a second copy of the page to a crawler.
     */
    static String plainProfilePath(String path) {
        return path.startsWith("/schools/") && path.contains("?tab=") ? path.substring(0, path.indexOf('?')) : path;
    }

    /** A view's explainer (DirectoryGuides) as the app shows it below the list: sections, questions, then sources. */
    private static void directoryGuide(StringBuilder h, PremierDirectoryDtos.Guide g) {
        h.append("<section><h2>").append(esc(g.heading())).append("</h2><p>").append(esc(g.intro())).append("</p>");
        for (PremierDirectoryDtos.GuideSection s : g.sections()) {
            h.append("<h3>").append(esc(s.heading())).append("</h3>");
            s.paragraphs().forEach(p -> h.append("<p>").append(esc(p)).append("</p>"));
            if (!s.points().isEmpty()) {
                h.append("<ul>");
                s.points().forEach(p -> h.append("<li>").append(esc(p)).append("</li>"));
                h.append("</ul>");
            }
        }
        h.append("<h3>Questions parents ask</h3><dl class=\"pr-faq\">");
        g.faqs().forEach(f -> faq(h, f.question(), f.answer()));
        h.append("</dl><p>Checked against these official sources on <time datetime=\"").append(g.checkedOn()).append("\">")
                .append(DAY.format(g.checkedOn())).append("</time>:</p><ul>");
        g.sources().forEach(s -> h.append("<li><a href=\"").append(esc(s.url())).append("\" rel=\"noopener\">")
                .append(esc(s.title())).append("</a></li>"));
        h.append("</ul></section>");
    }

    /** A published article in full: byline and dates, the body, its questions and its sources, as the app shows them. */
    private String blogPost(com.indiaschoolfinder.entity.BlogPost post) {
        StringBuilder h = new StringBuilder();
        var category = post.getCategory();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › <a href=\"/blog\">Blog</a> › <a href=\"/blog/category/")
                .append(category.slug()).append("\">").append(esc(category.label())).append("</a></nav>");
        h.append("<article><h1>").append(esc(post.getTitle())).append("</h1>");
        java.time.LocalDate published = post.getPublishedAt().atZone(INDIA).toLocalDate();
        java.time.LocalDate updated = post.getUpdatedAt().atZone(INDIA).toLocalDate();
        h.append("<p class=\"pr-meta\">By ").append(esc(post.getAuthorName())).append(" · Published <time datetime=\"").append(published)
                .append("\">").append(published.format(DAY)).append("</time>");
        if (updated.isAfter(published)) {
            h.append(" · Updated <time datetime=\"").append(updated).append("\">").append(updated.format(DAY)).append("</time>");
        }
        h.append("</p>");
        h.append("<p class=\"pr-lead\">").append(esc(post.getExcerpt())).append("</p>");
        h.append(com.indiaschoolfinder.util.BlogBodyHtml.render(post.getBody()));
        if (!post.getFaqs().isEmpty()) {
            h.append("<h2>Frequently asked questions</h2><dl class=\"pr-faq\">");
            for (var f : post.getFaqs()) {
                h.append("<dt>").append(esc(f.getQuestion())).append("</dt><dd>").append(esc(f.getAnswer())).append("</dd>");
            }
            h.append("</dl>");
        }
        if (!post.getSources().isEmpty()) {
            h.append("<h2>Sources</h2><ul class=\"pr-list\">");
            for (var s : post.getSources()) {
                h.append("<li><a href=\"").append(esc(s.getUrl())).append("\" rel=\"noopener\">").append(esc(s.getTitle())).append("</a>");
                if (s.getCheckedOn() != null) {
                    h.append(" <span>checked ").append(s.getCheckedOn().format(DAY)).append("</span>");
                }
                h.append("</li>");
            }
            h.append("</ul>");
        }
        return h.append("</article>").toString();
    }

    /**
     * An entrance exam. Its guide (/exams/{slug}, or /exams/{slug}/guide where the exam has a preparation page) gets the
     * full guide: summary, dates, pattern, eligibility, syllabus, selection, questions and official papers. A preparation
     * page gets what that page shows: dates, pattern, the practice and mock tests, and official links.
     */
    private String exam(com.indiaschoolfinder.dto.exam.ExamDetailDto d, String heading, String description, boolean prep) {
        var e = d.exam();
        var c = d.content();
        boolean hasPrepPage = SeoHeadService.PREP_PAGES.contains(e.slug());
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/\">Home</a> › <a href=\"/exams\">Exams</a>");
        if (!prep && hasPrepPage) {
            h.append(" › <a href=\"/exams/").append(e.slug()).append("\">").append(esc(e.shortName())).append("</a>");
        }
        h.append("</nav><h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        if (prep) {
            practiceSets(h, e.slug());
            h.append("<p><a href=\"/exams/").append(e.slug()).append("/guide\">").append(esc(e.shortName()))
                    .append(": eligibility, dates, syllabus and official papers</a></p>");
        } else {
            if (e.summary() != null) h.append("<p>").append(esc(e.summary())).append("</p>");
            h.append("<dl class=\"pr-facts\">");
            fact(h, "Conducted by", e.conductingAuthority());
            fact(h, "Entry class", c.entryClassText());
            fact(h, "For", c.forSchools());
            fact(h, "Application fee", Boolean.TRUE.equals(e.applicationFree()) ? "Free" : c.fee());
            fact(h, "Languages", c.languages());
            h.append("</dl>");
        }
        examDates(h, e.currentDates());
        for (var block : c.pattern()) {
            h.append("<h2>").append(esc(block.title())).append("</h2><table><thead><tr><th>Section</th><th>Questions</th><th>Marks</th>")
                    .append("<th>Time</th></tr></thead><tbody>");
            for (var s : block.sections()) {
                h.append("<tr><td>").append(esc(s.name())).append("</td><td>").append(s.questions() == null ? "–" : s.questions())
                        .append("</td><td>").append(s.marks() == null ? "–" : s.marks()).append("</td><td>")
                        .append(s.duration() == null ? "–" : esc(s.duration())).append("</td></tr>");
            }
            h.append("</tbody></table>");
            list(h, null, block.notes());
        }
        if (!prep) {
            list(h, "Eligibility", c.eligibility());
            if (!c.syllabus().isEmpty()) {
                h.append("<h2>Syllabus</h2>");
                for (var area : c.syllabus()) {
                    list(h, null, area.topics(), area.area());
                }
            }
            list(h, "Selection", c.selection());
            if (c.faq() != null && !c.faq().isEmpty()) {
                h.append("<h2>Frequently asked questions</h2><dl class=\"pr-faq\">");
                c.faq().forEach(f -> h.append("<dt>").append(esc(f.question())).append("</dt><dd>").append(esc(f.answer())).append("</dd>"));
                h.append("</dl>");
            }
            if (!c.papers().isEmpty()) {
                h.append("<h2>Official papers</h2><ul class=\"pr-list\">");
                c.papers().forEach(p -> h.append("<li><a href=\"").append(esc(p.url())).append("\" rel=\"noopener\">").append(esc(p.title()))
                        .append("</a> <span>").append(esc(p.year())).append(" · ").append(esc(p.kind())).append("</span></li>"));
                h.append("</ul>");
                if (c.papersNote() != null) h.append("<p>").append(esc(c.papersNote())).append("</p>");
            }
        }
        h.append("<h2>Official links</h2><ul class=\"pr-list\">");
        c.officialLinks().forEach(l -> h.append("<li><a href=\"").append(esc(l.url())).append("\" rel=\"noopener\">").append(esc(l.label())).append("</a></li>"));
        h.append("</ul>");
        // When the page's facts were last checked against those sources (the app says the same under its official links).
        if (e.lastVerifiedOn() != null) {
            h.append("<p>Checked against these sources on ").append(time(e.lastVerifiedOn())).append(".</p>");
        }
        classComparisons(h, e.entryClasses());
        if (!prep && hasPrepPage) {
            h.append("<p><a href=\"/exams/").append(e.slug()).append("\">").append(esc(e.shortName()))
                    .append(" practice questions, mock tests and study plan</a></p>");
        }
        return h.toString();
    }

    /** The exam's published practice sets, mock tests first, linked by title (the questions themselves are not loaded). */
    private void practiceSets(StringBuilder h, String exam) {
        List<Object[]> sets = practiceSets.findPublishedOutlineByExam(exam);
        for (var kind : List.of(com.indiaschoolfinder.entity.PracticeSet.Kind.MOCK, com.indiaschoolfinder.entity.PracticeSet.Kind.QUIZ)) {
            List<Object[]> own = sets.stream().filter(s -> s[2] == kind).toList();
            if (own.isEmpty()) continue;
            h.append("<h2>").append(kind == com.indiaschoolfinder.entity.PracticeSet.Kind.MOCK ? "Full mock tests" : "Practice quizzes")
                    .append("</h2><ul class=\"pr-list\">");
            for (Object[] s : own) {
                h.append("<li><a href=\"/exams/practice/").append(s[0]).append("\">").append(esc((String) s[1])).append("</a>");
                if (s[3] != null) h.append(" <span>").append(s[3]).append(" min</span>");
                h.append("</li>");
            }
            h.append("</ul>");
        }
    }

    private static void examDates(StringBuilder h, List<com.indiaschoolfinder.dto.exam.ExamDateDto> dates) {
        if (dates == null || dates.isEmpty()) return;
        h.append("<h2>Important dates</h2><ul class=\"pr-list\">");
        for (var d : dates) {
            DateTimeFormatter f = d.precision() == com.indiaschoolfinder.enums.DatePrecision.MONTH ? MONTH : DAY;
            h.append("<li>").append(esc(d.label())).append(": <span>").append(d.startsOn().format(f));
            if (d.endsOn() != null && !d.endsOn().equals(d.startsOn())) h.append(" to ").append(d.endsOn().format(f));
            if (!d.confirmed()) h.append(" (not confirmed yet)");
            h.append("</span></li>");
        }
        h.append("</ul>");
    }

    private static void list(StringBuilder h, String heading, List<String> items) {
        list(h, heading, items, null);
    }

    private static void list(StringBuilder h, String heading, List<String> items, String subheading) {
        if (items == null || items.isEmpty()) return;
        if (heading != null) h.append("<h2>").append(esc(heading)).append("</h2>");
        if (subheading != null) h.append("<h3>").append(esc(subheading)).append("</h3>");
        h.append("<ul>");
        items.forEach(i -> h.append("<li>").append(esc(i)).append("</li>"));
        h.append("</ul>");
    }

    private void schools(StringBuilder h, SchoolSearchCriteria criteria, String heading) {
        schoolList(h, heading, schoolService.search(criteria).content());
    }

    private static void schoolList(StringBuilder h, String heading, List<SchoolSummaryDto> schools) {
        if (schools.isEmpty()) {
            return;
        }
        h.append("<h2>").append(esc(heading)).append("</h2><ul class=\"pr-list\">");
        for (SchoolSummaryDto s : schools) {
            Set<String> about = new LinkedHashSet<>();
            if (s.boardCode() != null) {
                about.add(shortBoard(s.boardCode()));
            }
            for (String part : new String[]{s.locality(), s.city() != null ? s.city() : s.districtName()}) {
                if (part != null && !part.isBlank()) {
                    about.add(part.trim());
                }
            }
            h.append("<li><a href=\"/schools/").append(s.slug()).append("\">").append(esc(s.name())).append("</a>");
            if (!about.isEmpty()) {
                h.append(" <span>").append(esc(String.join(" · ", about))).append("</span>");
            }
            h.append("</li>");
        }
        h.append("</ul>");
    }

    /** The best-documented schools first, as the app's directory lists them. */
    private static SchoolSearchCriteria criteria(String state, String district, String city) {
        return criteria(state, district, city, null, LIST_SIZE);
    }

    private static SchoolSearchCriteria criteria(String state, String district, String city, String pinCode, int size) {
        return new SchoolSearchCriteria(null, null, null, state, district, city, pinCode, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, "recommended", null, 0, size);
    }

    private static void fact(StringBuilder h, String label, String value) {
        if (value != null && !value.isBlank()) {
            h.append("<div><dt>").append(label).append("</dt><dd>").append(esc(value.trim())).append("</dd></div>");
        }
    }

    private static String link(String href, String label) {
        return "<li><a href=\"" + href + "\">" + esc(label) + "</a></li>";
    }

    private static void factLink(StringBuilder h, String label, String href, String text) {
        h.append("<div><dt>").append(label).append("</dt><dd><a href=\"").append(href).append("\">").append(esc(text)).append("</a></dd></div>");
    }

    /** The network's directory page here (/network/{slug}), or null when the network has none. */
    static String networkSlug(com.indiaschoolfinder.enums.SchoolNetwork network) {
        if (network == null) return null;
        String slug = network.name().toLowerCase(Locale.ROOT).replace('_', '-');
        return NETWORKS.containsKey(slug) ? slug : null;
    }

    /**
     * A school's entrance exam as {label, its page here, its guide or null}, as the app's entranceExamInfo names them; null for
     * the school's own test, which has no page. JNVST, AISSEE and Netarhat have a preparation page with the guide under it.
     */
    static String[] examRoute(com.indiaschoolfinder.enums.EntranceExam exam) {
        if (exam == null) return null;
        return switch (exam) {
            case JNVST -> new String[]{"JNVST", "/exams/jnvst", "/exams/jnvst/guide"};
            case AISSEE -> new String[]{"AISSEE", "/exams/aissee", "/exams/aissee/guide"};
            case NETARHAT -> new String[]{"Netarhat entrance", "/exams/netarhat", "/exams/netarhat/guide"};
            case RMS_CET -> new String[]{"RMS CET", "/exams/rms-cet", null};
            case RIMC -> new String[]{"RIMC entrance", "/exams/rimc", null};
            case SCHOOL_TEST -> null;
        };
    }

    /**
     * Where this site explains how a network school admits students: its free practice, the exam's guide and the network's
     * directory. Until November 2026 none of the 639 JNV or 21 Sainik School profiles in the sitemap linked to any of these.
     */
    static void admissionRoutes(StringBuilder h, String network, String[] exam) {
        if (network == null && exam == null) return;
        h.append("<h2>Admission and network</h2><ul class=\"pr-grid\">");
        if (exam != null && exam[2] != null) {
            h.append(link(exam[1], exam[0] + " preparation: free practice and mock tests")).append(link(exam[2], exam[0] + ": eligibility, dates and syllabus"));
        } else if (exam != null) {
            h.append(link(exam[1], exam[0] + ": eligibility, dates and syllabus"));
        }
        if (network != null) h.append(link("/network/" + network, "All " + NETWORKS.get(network)[0]));
        h.append("</ul>");
    }

    private static String first(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static String esc(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }

    /**
     * The admissions calendar (/admissions) as the app shows it: upcoming and open admission cycles from official notices,
     * soonest deadline first (the first 20, the app's first page), each with its school, class, year, status, last date
     * and official notice. It opens with the answer: how many cycles are recorded and which closes first.
     */
    private String admissionsHome() {
        var page = admissions.upcoming(0, 20);
        StringBuilder h = new StringBuilder();
        crumbs(h);
        heading(h, "Admission process and deadlines",
                "Upcoming and open admission cycles recorded from official notices, soonest deadline first.");
        var first = page.content().stream().filter(a -> a.applicationEndDate() != null).findFirst();
        if (page.totalElements() == 0) {
            h.append("<p>No upcoming or open admission cycles are recorded right now.</p>");
        } else {
            h.append("<p>").append(count(page.totalElements())).append(" upcoming or open admission cycle")
                    .append(page.totalElements() == 1 ? " is" : "s are").append(" recorded.");
            first.ifPresent(a -> h.append(" The soonest last date to apply is ").append(time(a.applicationEndDate())).append(", for ")
                    .append(esc(java.util.Objects.toString(a.className(), "admission"))).append(" at ")
                    .append(esc(java.util.Objects.toString(a.schoolName(), "a listed school"))).append('.'));
            h.append(" Always confirm dates in the official notice before applying.</p><ul class=\"pr-list\">");
            for (var a : page.content()) {
                h.append("<li><a href=\"/schools/").append(a.schoolSlug()).append("\">").append(esc(java.util.Objects.toString(a.schoolName(), "")))
                        .append("</a> <span>").append(esc(java.util.Objects.toString(a.className(), ""))).append(" · ")
                        .append(esc(java.util.Objects.toString(a.academicYear(), ""))).append(" · ")
                        .append(a.status() == com.indiaschoolfinder.enums.AdmissionStatus.OPEN ? "open" : "upcoming");
                if (a.applicationEndDate() != null) h.append(" · last date ").append(time(a.applicationEndDate()));
                h.append("</span>");
                String notice = a.officialNotificationUrl() != null ? a.officialNotificationUrl() : a.sourceUrl();
                if (notice != null && !notice.isBlank()) {
                    h.append(" <a href=\"").append(esc(notice)).append("\" rel=\"noopener nofollow\">Official notice</a>");
                }
                h.append("</li>");
            }
            h.append("</ul>");
        }
        h.append("<h2>Plan your application</h2><ul class=\"pr-grid\">")
                .append(link("/admissions/guide", "School admission guide: process, eligibility and documents"))
                .append(link("/admissions/notifications", "Latest admission notifications"))
                .append(link("/exams", "School entrance exams"))
                .append(link("/updates", "Latest school and exam updates")).append("</ul>");
        return h.toString();
    }

    private static final String OLYMPIAD_NOTE ="<p>Every question is original SchoolDhundo practice in the style of school Olympiads. "
            + "None is an official, sample or previous-year paper, and SchoolDhundo is not connected with SOF, HBCSE or MTA(I).</p>";

    /**
     * The Olympiad page ({@link OlympiadPages#PATH}) as plain HTML: what it offers, a page for each class, its class-wise
     * practice sets (linked by title; the questions are not loaded) and the exams it prepares for. The app replaces it on
     * load.
     */
    private String olympiadHub() {
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams");
        h.append("<h1>Olympiad Preparation &amp; Practice</h1>");
        h.append("<p class=\"pr-lead\">Prepare smarter with class-wise Olympiad questions, topic practice, mock tests and detailed ")
                .append("explanations: Mathematics, Science, English, Logical Reasoning and IOQM-style problems for Classes 1 to 10.</p>");
        h.append(OLYMPIAD_NOTE);
        List<OlympiadPages.ClassPage> classes = olympiadPages.classes();
        if (!classes.isEmpty()) {
            h.append("<h2>Olympiad practice by class</h2><ul class=\"pr-grid\">");
            for (OlympiadPages.ClassPage c : classes) {
                h.append("<li><a href=\"").append(c.path()).append("\">Class ").append(c.number()).append(" Olympiad practice</a> <span>")
                        .append(count(c.questions())).append(" questions</span></li>");
            }
            h.append("</ul>");
        }
        java.util.Map<String, List<Object[]>> byLevel = new java.util.LinkedHashMap<>();
        for (Object[] s : practiceSets.findPublishedOutlineByCategory(com.indiaschoolfinder.entity.PracticeSet.Category.OLYMPIAD)) {
            byLevel.computeIfAbsent((String) s[5], k -> new java.util.ArrayList<>()).add(s);
        }
        if (!byLevel.isEmpty()) {
            h.append("<h2>Class-wise Olympiad practice sets</h2>");
            byLevel.entrySet().stream()
                    .sorted(java.util.Comparator.comparingInt(e -> classNumber(e.getKey())))
                    .forEach(e -> {
                        h.append("<h3>").append(esc(e.getKey())).append("</h3><ul class=\"pr-list\">");
                        for (Object[] s : e.getValue()) {
                            h.append("<li><a href=\"/exams/practice/").append(s[0]).append("\">").append(esc((String) s[1])).append("</a></li>");
                        }
                        h.append("</ul>");
                    });
        }
        h.append("<h2>Olympiads these questions prepare for</h2><ul class=\"pr-list\">")
                .append("<li>SOF International Mathematics Olympiad (IMO): Logical Reasoning, Mathematical Reasoning, Everyday Mathematics and Achievers sections</li>")
                .append("<li>SOF International Science Olympiad (ISO): Logical Reasoning, Science and Achievers sections</li>")
                .append("<li>SOF International English Olympiad (IEO): Word and Structure Knowledge, Reading, Spoken and Written Expression</li>")
                .append("<li>IOQM (Indian Olympiad Qualifier in Mathematics), Classes 8 to 12: IOQM-style problems with whole-number answers</li>")
                .append("</ul>");
        h.append("<p><a href=\"/exams/practice\">Practice centre</a> · <a href=\"/exams\">School entrance exams</a></p>");
        return h.toString();
    }

    /**
     * One class's Olympiad page: what it holds (questions, sets, subjects), each set with its length (linked by title;
     * the questions are not loaded), the timed tests the page offers, and the other classes. As the app's page shows it.
     */
    private String olympiadClass(int number, String description) {
        List<OlympiadPages.ClassPage> classes = olympiadPages.classes();
        OlympiadPages.ClassPage page = classes.stream().filter(c -> c.number() == number).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Olympiad class", number));
        StringBuilder h = new StringBuilder();
        crumbs(h, "/exams", "Exams", OlympiadPages.PATH, "Olympiad");
        h.append("<h1>").append(esc(page.heading())).append("</h1>");
        if (description != null) h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        h.append("<dl class=\"pr-facts\">");
        fact(h, "Questions", count(page.questions()));
        fact(h, "Practice sets", count(page.sets().size()));
        fact(h, "Subjects", String.join(", ", page.subjects()));
        h.append("</dl>");
        h.append("<h2>").append(esc(page.level())).append(" practice sets</h2><ul class=\"pr-list\">");
        for (var set : page.sets()) {
            h.append("<li><a href=\"/exams/practice/").append(set.slug()).append("\">").append(esc(set.title())).append("</a> <span>")
                    .append(set.questionCount()).append(" questions · ")
                    .append(set.durationMinutes() == null ? "untimed" : "timed, " + set.durationMinutes() + " minutes").append("</span></li>");
        }
        h.append("</ul>");
        if (page.questions() >= 10) {
            h.append("<h2>Mock tests and daily challenge</h2>")
                    .append("<p>Timed mock tests are drawn fresh from this class's questions each time, following the order and balance of ")
                    .append("the Olympiad papers where there are enough questions. The daily challenge is the same set of questions for every ")
                    .append(esc(page.level())).append(" student on a given day.</p>");
        }
        h.append(OLYMPIAD_NOTE);
        List<OlympiadPages.ClassPage> others = classes.stream().filter(c -> c.number() != page.number()).toList();
        if (!others.isEmpty()) {
            h.append("<h2>Olympiad practice for other classes</h2><ul class=\"pr-grid\">");
            others.forEach(c -> h.append(link(c.path(), "Class " + c.number() + " Olympiad practice")));
            h.append("</ul>");
        }
        h.append("<p><a href=\"").append(OlympiadPages.PATH).append("\">Olympiad preparation for every class</a> · ")
                .append("<a href=\"/exams/practice\">Practice centre</a></p>");
        return h.toString();
    }

    /** "Class V" → 5, so classes sort in order; other levels go last. */
    private static int classNumber(String level) {
        List<String> roman = List.of("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII");
        int i = level != null && level.startsWith("Class ") ? roman.indexOf(level.substring(6)) : -1;
        return i < 0 ? 100 : i;
    }
}
