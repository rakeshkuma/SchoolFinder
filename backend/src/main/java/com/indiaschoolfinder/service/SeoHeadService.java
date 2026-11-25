package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.exam.ExamDetailDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.EducationBoardRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The &lt;head&gt; of a page as search engines and link previews should see it: title, description, canonical URL,
 * Open Graph tags and, for school profiles, schema.org School data built only from published facts. nginx splices it
 * into the app shell (server-side include), so crawlers that do not run JavaScript still get page-specific metadata.
 * Unknown schools, states or boards get the site defaults plus noindex, so error pages are never indexed.
 */
@Service
public class SeoHeadService {

    public static final String SITE = "SchoolDhundo";
    /**
     * A district or town page listing fewer schools than this would mostly repeat those schools' own pages, so it stays
     * reachable but is left out of the sitemap and marked noindex until more schools are listed there.
     */
    public static final int MIN_SCHOOLS_TO_INDEX = 3;
    /**
     * The home page's title, well inside 60 characters: Bing Webmaster Tools flagged the earlier 60-character one ("…,
     * Admissions &amp; Exam Prep") as too long on 17 Nov 2026, so it has room to spare and no character that HTML escapes.
     */
    static final String DEFAULT_TITLE = "SchoolDhundo: Find Schools, Rankings and Exam Prep";
    /** Longest title kept with the " | SchoolDhundo" suffix; Google shows the site name above every result anyway. */
    static final int TITLE_MAX = 60;
    /** Bing recommends descriptions under 160 characters (Bing Webmaster Tools flagged a 179-character one); Google cuts about there too. */
    static final int DESCRIPTION_MAX = 160;
    static final String DEFAULT_DESCRIPTION = "Find schools across India, compare school rankings and boarding schools, check admissions, "
            + "and prepare for entrance exams with free mock tests and practice.";

    private static final Pattern SCHOOL = Pattern.compile("^/schools/([a-z0-9-]+)/?$");
    /** /schools/{state}/{place}: a short address that hands over to the state, district or town page; not a page itself. */
    private static final Pattern PLACE_SHORTCUT = Pattern.compile("^/schools/[a-z0-9-]+/[a-z0-9-]+/?$");
    private static final Pattern STATE = Pattern.compile("^/states/([a-z0-9-]+)(?:/([a-z0-9-]+))?/?$");
    private static final Pattern CITY = Pattern.compile("^/states/([a-z0-9-]+)/city/([a-z0-9-]+)/?$");
    private static final Pattern BOARD = Pattern.compile("^/boards/([A-Za-z0-9-]+)/?$");
    private static final Pattern EXAM = Pattern.compile("^/exams/([a-z0-9-]+)/?$");
    /** The eligibility and dates guide of an exam that has its own preparation page (JNVST, AISSEE, Netarhat). */
    private static final Pattern EXAM_GUIDE = Pattern.compile("^/exams/([a-z0-9-]+)/guide/?$");
    /** Exams whose /exams/{slug} is a preparation dashboard, with the guide at /exams/{slug}/guide. */
    public static final java.util.Set<String> PREP_PAGES = java.util.Set.of("jnvst", "aissee", "netarhat");
    private static final Pattern EXAM_CLASS = Pattern.compile("^/exams/class/(\\d{1,2})/?$");
    private static final Pattern EXAM_STATE = Pattern.compile("^/exams/state/([a-z0-9-]+)/?$");
    /** A practice set; progress, attempts and sessions under /exams/practice are private and handled first. */
    private static final Pattern PRACTICE_SET = Pattern.compile("^/exams/practice/([a-z0-9-]+)/?$");
    private static final Pattern BLOG_POST = Pattern.compile("^/blog/([a-z0-9-]+)/?$");
    private static final Pattern BLOG_CATEGORY = Pattern.compile("^/blog/category/([a-z0-9-]+)/?$");
    private static final Pattern BEST_IN = Pattern.compile("^/rankings/best-schools-in-([a-z0-9-]+)/?$");
    /** A view of the premier school directory, e.g. /rankings/girls-boarding-schools; fixed /rankings pages match first. */
    private static final Pattern DIRECTORY = Pattern.compile("^/rankings/([a-z-]+-schools)/?$");
    private static final String[] ROMAN = {"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"};
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    /** The Disallow lines of robots.txt (SitemapController), plus the update form, which is not content to index. */
    private static final Set<String> PRIVATE = Set.of("/admin", "/saved", "/suggest", "/account", "/signin", "/register",
            "/verify-email", "/forgot-password", "/reset-password",
            // A student's own progress and results, and randomly drawn practice sittings, are not content to index.
            "/exams/practice/progress", "/exams/practice/attempts", "/exams/practice/session",
            // Leaderboards list students' nicknames, which should not be searchable; achievements are a student's own.
            "/exams/leaderboard", "/exams/achievements", "/exams/challenges");
    /** Static pages with their own title; any other address not matched by a pattern below is noindex. */
    private static final Map<String, String[]> PAGES = Map.ofEntries(
            page("/find", "Find the right school for your child", "Choose your area, your child's class, "
                    + "budget, board and must-have facilities. See schools whose official sources confirm each one, and why."),
            page("/compare", "Compare schools side by side", "Compare up to four schools: board, classes, "
                    + "official fees, admissions, facilities and distance from home, and share the comparison."),
            page("/schools", "Find Schools in India: CBSE & ICSE School Directory", "Search and filter schools across India by state, "
                    + "board, type, classes, fees and location. Every fact is linked to its source."),
            page("/states", "Schools by state and union territory", "Browse schools in every Indian state and "
                    + "union territory, with district-wise lists and source-linked profiles."),
            // "best schools in india" is searched about 14,800 times a month in India at difficulty 10 (Ubersuggest, 19 Nov
            // 2026), so the title starts with it. The old description was cut short ("…") at 160 characters.
            page("/rankings", "Best Schools in India: Published School Rankings", "Best schools in India in published rankings: "
                    + "browse by publisher, state, city, board and category, with every rank exactly as its publisher printed it."),
            page("/rankings/schools-by-state", "Premier and boarding schools by state", "India's premier and boarding schools grouped by "
                    + "state, with board, boarding, gender and an approximate fee for each school."),
            page("/rankings/schools-by-city", "Premier and boarding schools by city", "India's premier and boarding schools grouped by "
                    + "city, from Dehradun and Mussoorie to Bengaluru, Mumbai and Delhi."),
            page("/rankings/states", "State and city school rankings", "School rankings by state, city and district, for places with verified "
                    + "published entries. State, city and national ranks are shown separately."),
            page("/rankings/boards", "Board-wise school rankings", "Schools in published rankings by board. Where a publisher made no separate "
                    + "board ranking, we say so and show each school's national rank."),
            page("/rankings/government-boarding", "Government and boarding school rankings", "Government and boarding schools in published "
                    + "rankings, with the rank each holds in the publisher's own list."),
            page("/rankings/score", "SchoolDhundo evidence score", "Our own score from source-linked evidence, kept apart from published "
                    + "rankings. Not an official government ranking."),
            page("/admissions", "School admissions calendar", "Upcoming and open school admission cycles, "
                    + "each linked to the school's official notice."),
            page("/fees", "School fee calculator", "Estimate first-year and annual school costs from "
                    + "official fee schedules, with every component shown."),
            // "schools near me": 673,000 searches a month in India (Ubersuggest, 2026-11-16).
            page("/nearby", "Schools near me: find schools on a map", "Find schools near you, or near any location in India, on a map."),
            page("/boarding", "Boarding and residential schools", "Residential schools across India — "
                    + "Navodaya, Sainik, military and private boarding schools — with entry classes and exams."),
            page("/boarding/india", "Boarding schools in India", "Every boarding and residential school we list in "
                    + "India, by state, with sourced profiles, fees where published, admissions and entrance exams."),
            page("/boarding/government", "Government boarding schools in India", "Jawahar Navodaya Vidyalayas, Sainik "
                    + "Schools, Rashtriya Military Schools, RIMC and state residential schools, with entry classes and exams."),
            page("/boarding/private", "Private boarding schools in India", "Privately managed boarding schools across "
                    + "India with sourced profiles, published fees and admission details."),
            page("/boarding/boys", "Boys' boarding schools in India", "Boarding schools whose official sources say "
                    + "they admit boys only, with sourced profiles, fees and admissions."),
            page("/boarding/girls", "Girls' boarding schools in India", "Boarding schools whose official sources say "
                    + "they admit girls only, with sourced profiles, fees and admissions."),
            page("/boarding/co-ed", "Co-educational boarding schools in India", "Boarding schools that admit boys and "
                    + "girls, with sourced profiles, fees and admissions."),
            page("/boarding/affordable", "Affordable boarding schools in India", "Boarding schools whose official "
                    + "published annual fee is up to ₹1.5 lakh, and government residential schools with low or no fees."),
            page("/exams", "School entrance exams in India", "JNVST, AISSEE, RIMC, RMS CET and state entrance "
                    + "exams: eligibility, dates, pattern, syllabus and official papers. Each links to the conducting body's notice."),
            page("/exams/finder", "Which entrance exams can my child take?", "Answer up to four questions (class, "
                    + "state, school type, boarding) to see which school entrance exams may fit and why. Confirm each rule in the official notice."),
            page("/exams/practice", "Free practice tests: entrance, Olympiad and school exams", "Original "
                    + "quizzes and timed mock tests for JNVST, AISSEE, Netarhat, Olympiads and school subjects, many in English and "
                    + "Hindi. Our own questions, not official."),
            page("/blog", "Education insights for parents and students", "Original guides on school admissions, boarding and "
                    + "government schools, entrance exams, boards and parenting in India, with official sources linked."),
            page("/rankings/methodology", "Ranking methodology", "Who publishes the school rankings shown on SchoolDhundo, their years, "
                    + "how entries are verified, and how third-party rankings are presented."),
            page("/cities", "Schools by city", "Cities across India where SchoolDhundo lists schools, with "
                    + "the number listed in each."),
            page("/admissions/guide", "School admission guide: process, eligibility and documents", "How school "
                    + "admission works in India: the steps, Class I age rules, RTE reserved seats and the documents commonly asked "
                    + "for. Also what to check about hostels."),
            page("/updates", "Latest school & exam updates", "Latest official notices for AISSEE, JNVST, Netarhat and other "
                    + "entrance exams, open admissions with last dates, and new practice sets. Each links to its source."),
            page("/admissions/notifications", "Latest school admission notifications", "School admission cycles "
                    + "recently added or updated from official notices, by state, class, category and status."),
            // "teacher vacancy" and "school teacher jobs" are the searches; the page lists official notices only.
            // Short enough to stay whole with the count in front of it ("12 current school job notices. ").
            page("/jobs", "School teacher jobs: government and private", "School teacher and staff vacancies from official "
                    + "sources: KVS, Navodaya, DSSSB, BPSC, Sainik and boarding schools."),
            page("/reviews", "Parent reviews of schools", "Moderated reviews of schools across India from parents, "
                    + "students and alumni."),
            page("/about", "About SchoolDhundo", "How SchoolDhundo lists schools, fees, admissions and "
                    + "entrance exams from official sources, and how it writes its own practice questions."),
            page("/contact", "Contact SchoolDhundo", "Get in touch about a school listing, a correction or "
                    + "the practice questions."),
            page("/privacy", "Privacy policy: what we store and why", "What SchoolDhundo stores about visitors and members, and why."),
            page("/terms", "Terms of use for listings and practice tests", "The terms for using SchoolDhundo, its listings and its practice tests."),
            page("/disclaimer", "Disclaimer: confirm school facts at the source", "School facts are taken from official sources and may change; always "
                    + "confirm fees, dates and eligibility in the school's or conducting body's official notice."),
            page("/editorial-policy", "Editorial policy", "How SchoolDhundo chooses sources, checks school information, "
                    + "presents published rankings and writes its own practice questions. Paid content is kept apart."),
            page("/corrections-policy", "Corrections policy", "How to report a mistake in a school listing, ranking or "
                    + "practice question on SchoolDhundo, and how corrections are checked and shown."),
            page("/advertise", "Advertise with SchoolDhundo", "Featured school listings, admission enquiries, managed "
                    + "profiles and sponsored placements for schools and education brands, always clearly labelled. Rankings are never for sale."),
            page("/claim-school", "Claim your school profile", "School staff can claim their SchoolDhundo profile to "
                    + "publish official fees, admission notices, photos and contact details, checked by our editors. Free."),
            page("/data-deletion", "Account and data deletion", "How to delete your SchoolDhundo account, leaderboard "
                    + "entry or other information, what is removed and what is kept."),
            // Network titles name the searches people make ("sainik schools", "kvs admission"); the page lists the schools
            // and says how admission works, with the official site linked. The description starts with the count (head()).
            page("/network/kendriya-vidyalaya", "Kendriya Vidyalaya list and KVS admission", "Central government schools run by "
                    + "Kendriya Vidyalaya Sangathan, affiliated to CBSE, with locations and admission links."),
            page("/network/jawahar-navodaya-vidyalaya", "Jawahar Navodaya Vidyalaya list and admission", "Residential central "
                    + "government schools run by Navodaya Vidyalaya Samiti; Class VI admission is through the JNVST."),
            page("/network/sainik-school", "Sainik Schools in India: list and admission", "Residential schools run by the Sainik Schools Society "
                    + "under the Ministry of Defence; Class VI and IX admission is through AISSEE."),
            page("/network/eklavya-model-residential-school", "Eklavya Model Residential Schools (EMRS)", "Residential schools "
                    + "for Scheduled Tribe students under the Ministry of Tribal Affairs, with state-wise admission information."),
            page("/network/rashtriya-military-school", "Rashtriya Military Schools and RMS CET", "Residential schools under the Ministry "
                    + "of Defence; Class VI and IX admission is through the RMS CET."),
            page("/type/government", "Government schools in India", "Schools run by central and state governments and "
                    + "local bodies, with board, classes and admission information from official sources."),
            page("/type/private-aided", "Private and aided schools in India", "Private unaided, government-aided and "
                    + "international schools, with official fees where published."),
            page("/type/private-aided/private", "Private schools in India", "Private unaided schools across India, "
                    + "with official fees where published."),
            page("/type/private-aided/aided", "Government-aided schools in India", "Schools that receive government "
                    + "grants, across Indian states and union territories."),
            page("/type/private-aided/international", "International schools in India", "International schools "
                    + "across India, with boards, classes and official fees where published."),
            page("/stages/nursery", "Pre-primary and nursery schools", "Schools that list pre-primary classes."),
            page("/stages/primary", "Primary schools", "Schools that list at least one primary class."),
            page("/stages/middle", "Middle schools", "Schools that list at least one middle-stage class."),
            page("/stages/secondary", "Secondary schools", "Schools that list Class IX or X."),
            page("/stages/senior-secondary", "Senior secondary schools", "Schools that list Class XI or XII."),
            page("/exams/syllabus", "Exam pattern and syllabus of school entrance exams", "Subjects, questions, marks, "
                    + "duration, format and language of JNVST, AISSEE, RIMC, JNV lateral entry and state entrance exams, from "
                    + "each official notice."),
            page("/exams/calendar", "School entrance exam calendar", "Application deadlines, admit cards and exam dates "
                    + "for JNVST, AISSEE, RIMC and other school entrance exams, month by month, from official notices."),
            page("/exams/resources", "Learning resources for school entrance exams", "Syllabus, exam pattern, study "
                    + "plans, document checklists and FAQs for JNVST, AISSEE, RIMC, RMS CET and more. Links to official papers and "
                    + "answer keys."));

    /** Paths under /exams that are pages, not exam slugs; the exam import rejects them as slugs. */
    public static final Set<String> RESERVED_EXAM_SLUGS = Set.of("finder", "calendar", "practice", "syllabus", "resources", "class", "state",
            "leaderboard", "achievements", "challenges", "olympiad");

    private static Map.Entry<String, String[]> page(String path, String title, String description) {
        return Map.entry(path, new String[]{title, description});
    }

    /** A government school network's directory page (frontend content/networks.ts); its slug is the enum name in kebab case. */
    static final Pattern NETWORK = Pattern.compile("^/network/([a-z-]+)$");

    static com.indiaschoolfinder.enums.SchoolNetwork network(String slug) {
        try {
            return com.indiaschoolfinder.enums.SchoolNetwork.valueOf(slug.toUpperCase(Locale.ROOT).replace('-', '_'));
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Network", slug);
        }
    }

    /** The network's schools as its page lists them: the best-documented first (the directory's "recommended" order). */
    static com.indiaschoolfinder.dto.school.SchoolSearchCriteria networkCriteria(com.indiaschoolfinder.enums.SchoolNetwork network, int size) {
        return new com.indiaschoolfinder.dto.school.SchoolSearchCriteria(null, null, null, null, null, null, null, null, null, null,
                network, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, "recommended", null, 0, size);
    }

    /**
     * The Olympiad page lives at {@link OlympiadPages#PATH}, with a page for each class. It used to be the practice
     * centre filtered to Olympiads (/exams/practice?category=OLYMPIAD, with class=5 for a class); that old address is
     * still served, described as the page it stands for (whose canonical link it then carries), and the app moves
     * visitors on to the new address.
     */
    static final String OLYMPIAD_TITLE = "Olympiad Preparation & Practice: Classes 1 to 10";
    static final String OLYMPIAD_DESCRIPTION = "Free class-wise Olympiad practice for Classes 1 to 10: original Maths, Science, English, "
            + "reasoning and IOQM-style questions, mock tests and explained answers.";
    private static final Pattern OLYMPIAD_CLASS = Pattern.compile("^" + OlympiadPages.PATH + "/class-(\\d{1,2})$");

    /** True for the Olympiad page's old address: /exams/practice with category=OLYMPIAD. */
    public static boolean isOlympiadPractice(String path, String category) {
        return ("/exams/practice".equals(path) || "/exams/practice/".equals(path)) && "OLYMPIAD".equals(category);
    }

    private String olympiadHub(String baseUrl) {
        String url = baseUrl + OlympiadPages.PATH;
        return tags(OLYMPIAD_TITLE + " | " + SITE, OLYMPIAD_DESCRIPTION, url, null, false,
                crumbs(listItem(1, "Home", baseUrl + "/"), listItem(2, "Exams", baseUrl + "/exams"),
                        listItem(3, "Olympiad preparation", url)));
    }

    private String olympiadClass(OlympiadPages.ClassPage page, String baseUrl) {
        String url = baseUrl + page.path();
        return tags(page.title() + " | " + SITE, page.description(), url, null, false,
                crumbs(listItem(1, "Home", baseUrl + "/"), listItem(2, "Exams", baseUrl + "/exams"),
                        listItem(3, "Olympiad preparation", baseUrl + OlympiadPages.PATH), listItem(4, "Class " + page.number(), url)));
    }

    /**
     * The description as sent, at most {@link #DESCRIPTION_MAX} characters: whole sentences are left off the end first,
     * so the facts that open it stay; only a single sentence that is still too long is cut at a word, with "…".
     */
    static String fitDescription(String description) {
        if (description == null) return null;
        String d = description.trim();
        while (d.length() > DESCRIPTION_MAX) {
            int end = d.lastIndexOf(". ", d.length() - 2);
            // Not into the opening words: "R. K. Puram" has full stops that do not end a sentence.
            if (end + 1 < 70) break;
            d = d.substring(0, end + 1);
        }
        if (d.length() <= DESCRIPTION_MAX) return d;
        int space = d.lastIndexOf(' ', DESCRIPTION_MAX - 1);
        return d.substring(0, space > 0 ? space : DESCRIPTION_MAX - 1).replaceAll("[\\s,;:–-]+$", "") + "…";
    }

    /** The title as sent: without the site-name suffix when that would make it longer than {@link #TITLE_MAX}. */
    static String fitTitle(String title) {
        String suffix = " | " + SITE;
        return title.length() > TITLE_MAX && title.endsWith(suffix) ? title.substring(0, title.length() - suffix.length()) : title;
    }

    private final NoticeService notices;
    private final SchoolService schoolService;
    private final LocationService locationService;
    private final EducationBoardRepository boardRepository;
    private final SchoolRepository schoolRepository;
    private final ExamService examService;
    private final com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository;
    private final ObjectMapper objectMapper;
    private final BlogService blogService;
    private final BestPlacesService bestPlacesService;
    private final PremierDirectoryService premierDirectory;
    private final SchoolFaqService faqService;
    private final FeeService feeService;
    private final AdmissionService admissionService;
    private final com.indiaschoolfinder.repository.SchoolFacilityRepository facilityRepository;
    private final OlympiadPages olympiadPages;

    public SeoHeadService(SchoolService schoolService, LocationService locationService,
                          EducationBoardRepository boardRepository, SchoolRepository schoolRepository,
                          ExamService examService, ObjectMapper objectMapper,
                          com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository, BlogService blogService,
                          BestPlacesService bestPlacesService, PremierDirectoryService premierDirectory,
                          SchoolFaqService faqService, FeeService feeService, AdmissionService admissionService,
                          com.indiaschoolfinder.repository.SchoolFacilityRepository facilityRepository,
                          OlympiadPages olympiadPages, NoticeService notices) {
        this.notices = notices;
        this.olympiadPages = olympiadPages;
        this.faqService = faqService;
        this.feeService = feeService;
        this.admissionService = admissionService;
        this.facilityRepository = facilityRepository;
        this.premierDirectory = premierDirectory;
        this.blogService = blogService;
        this.bestPlacesService = bestPlacesService;
        this.examService = examService;
        this.practiceSetRepository = practiceSetRepository;
        this.schoolService = schoolService;
        this.locationService = locationService;
        this.boardRepository = boardRepository;
        this.schoolRepository = schoolRepository;
        this.objectMapper = objectMapper;
    }

    /** @param path the page path as requested, e.g. "/schools/sherwood-college" (any query string is ignored) */
    public String head(String path, String baseUrl) {
        String p = path == null ? "/" : path.split("[?#]", 2)[0];
        if (p.length() > 1 && p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        for (String prefix : PRIVATE) {
            if (p.equals(prefix) || p.startsWith(prefix + "/")) {
                return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
            }
        }
        // Static pages first: some (/exams/finder) share a prefix with a pattern below.
        String[] page = PAGES.get(p);
        if (page != null) {
            String description = page[1];
            Matcher networkPage = NETWORK.matcher(p);
            if (p.equals("/schools")) {
                description = "%,d schools across India. ".formatted(schoolRepository.countByActiveTrue()) + description;
            } else if (p.equals("/admissions")) {
                long cycles = admissionService.upcoming(0, 1).totalElements();
                if (cycles > 0) description = "%,d upcoming and open admission cycles. ".formatted(cycles) + description;
            } else if (p.equals("/jobs")) {
                long current = notices.list(SiteUpdate.Category.JOB, NoticeService.Filter.NONE, false, 0, 1).current();
                if (current > 0) description = "%,d current school job notices. ".formatted(current) + description;
            } else if (networkPage.matches()) {
                long count = schoolService.search(networkCriteria(network(networkPage.group(1)), 1)).totalElements();
                if (count > 0) description = "%,d schools listed. ".formatted(count) + description;
                // Schools › the network, named as the page's heading names it ("Kendriya Vidyalayas", NetworkPage).
                String heading = com.indiaschoolfinder.util.SchoolAboutText.networkName(network(networkPage.group(1))) + "s";
                return tags(page[0] + " | " + SITE, description, baseUrl + p, null, false,
                        crumbs(listItem(1, "Schools", baseUrl + "/schools"), listItem(2, heading, baseUrl + p)));
            }
            return tags(page[0] + " | " + SITE, description, baseUrl + p, null, false, null);
        }
        if (NETWORK.matcher(p).matches()) {
            // Every network page is listed above; any other /network address is the app's "page not found".
            return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
        }
        try {
            Matcher m;
            if ((m = SCHOOL.matcher(p)).matches()) {
                return school(schoolService.getActiveBySlug(m.group(1)), baseUrl);
            }
            if (PLACE_SHORTCUT.matcher(p).matches()) {
                return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
            }
            if ((m = STATE.matcher(p)).matches()) {
                return state(m.group(1), m.group(2), baseUrl);
            }
            if ((m = CITY.matcher(p)).matches()) {
                return city(m.group(1), m.group(2), baseUrl);
            }
            if ((m = BOARD.matcher(p)).matches()) {
                return board(m.group(1), baseUrl);
            }
            // Before the exam patterns: "olympiad" is a page, not an exam's slug.
            if (p.equals(OlympiadPages.PATH)) {
                return olympiadHub(baseUrl);
            }
            if ((m = OLYMPIAD_CLASS.matcher(p)).matches()) {
                return olympiadClass(olympiadPages.forClass(Integer.parseInt(m.group(1))), baseUrl);
            }
            if (p.startsWith(OlympiadPages.PATH + "/")) {
                throw new ResourceNotFoundException("Olympiad page", p); // the app shows "page not found" here
            }
            if ((m = EXAM.matcher(p)).matches()) {
                return PREP_PAGES.contains(m.group(1)) ? prepPage(examService.get(m.group(1)), baseUrl) : exam(examService.get(m.group(1)), baseUrl);
            }
            if ((m = EXAM_GUIDE.matcher(p)).matches()) {
                return exam(examService.get(m.group(1)), baseUrl);
            }
            if ((m = EXAM_CLASS.matcher(p)).matches()) {
                return examClass(Integer.parseInt(m.group(1)), baseUrl);
            }
            if ((m = EXAM_STATE.matcher(p)).matches()) {
                return examState(m.group(1), baseUrl);
            }
            if ((m = BEST_IN.matcher(p)).matches()) {
                return bestPlace(m.group(1), baseUrl);
            }
            if ((m = DIRECTORY.matcher(p)).matches()) {
                return directoryCategory(premierDirectory.category(m.group(1)), baseUrl);
            }
            if ((m = BLOG_CATEGORY.matcher(p)).matches()) {
                return blogCategory(m.group(1), baseUrl);
            }
            if ((m = BLOG_POST.matcher(p)).matches()) {
                return blogPost(blogService.published(m.group(1)), baseUrl);
            }
            if ((m = PRACTICE_SET.matcher(p)).matches()) {
                String slug = m.group(1);
                return practiceSet(practiceSetRepository.findBySlugAndPublishedTrue(slug)
                        .orElseThrow(() -> new ResourceNotFoundException("Practice set", slug)), baseUrl);
            }
            // After the static pages: /admissions/guide and /admissions/notifications are pages, not notices.
            if ((m = JOB_NOTICE.matcher(p)).matches()) {
                return notice(m.group(1), SiteUpdate.Category.JOB, baseUrl);
            }
            if ((m = ADMISSION_NOTICE.matcher(p)).matches()) {
                return notice(m.group(1), SiteUpdate.Category.ADMISSION, baseUrl);
            }
        } catch (ResourceNotFoundException e) {
            return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
        }
        Matcher featured = BOARDING_FEATURE.matcher(p);
        if (featured.matches() && BOARDING_FEATURES.containsKey(featured.group(1))) {
            String[] f = BOARDING_FEATURES.get(featured.group(1));
            return tags(f[0] + " | " + SITE, f[1], baseUrl + (f[2] == null ? p : f[2]), null, false, null);
        }
        if (p.equals("/")) {
            return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, baseUrl + "/", baseUrl + HOME_HERO_PREVIEW, false,
                    List.of(website(baseUrl), organization(baseUrl))) + HOME_HERO_PRELOAD;
        }
        // Every page of the app with something to index is matched above (its own title, or a pattern). What is left is
        // the app's "page not found" (/boarding/{unknown}, /type/{unknown}, /rankings/{unknown}, an address outside the
        // app) or a client-side redirect, so it is never offered as a copy of the home page.
        return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
    }

    /** An admission or job notice's own page (NoticeService). */
    static final Pattern JOB_NOTICE = Pattern.compile("^/jobs/([a-z0-9-]+)$");
    static final Pattern ADMISSION_NOTICE = Pattern.compile("^/admissions/([a-z0-9-]+)$");

    /**
     * A notice's page: its title and summary, and BreadcrumbList and WebPage data with its real publication and change
     * dates and the official notice it is based on. A current job opening also gets JobPosting data, with only the
     * fields its page shows (no salary unless one is published, no direct-apply claim). Results, admit cards, closed
     * and title-only notices are noindex (NoticeService.indexable), with no canonical link and no JobPosting.
     */
    private String notice(String slug, SiteUpdate.Category category, String baseUrl) {
        SiteUpdate u = notices.visibleNotice(slug, category).orElseThrow(() -> new ResourceNotFoundException("Notice", slug));
        com.indiaschoolfinder.dto.notice.NoticeDtos.NoticeDetail d = notices.detail(u, notices.today(), false);
        boolean job = category == SiteUpdate.Category.JOB;
        String url = baseUrl + d.path();
        List<Object> data = new java.util.ArrayList<>();
        data.add(crumbs(listItem(1, "Home", baseUrl + "/"), job ? listItem(2, "School jobs", baseUrl + "/jobs")
                : listItem(2, "Admissions", baseUrl + "/admissions"), listItem(3, d.title(), url)));
        Map<String, Object> page = new LinkedHashMap<>();
        page.put("@context", "https://schema.org");
        page.put("@type", "WebPage");
        page.put("name", d.title());
        page.put("url", url);
        page.put("datePublished", d.publishedOn().toString());
        page.put("dateModified", (d.lastChangedAt() != null ? d.lastChangedAt().atZone(java.time.ZoneId.of("Asia/Kolkata")).toLocalDate()
                : d.publishedOn()).toString());
        if (d.sourceUrl() != null) page.put("isBasedOn", d.sourceUrl());
        if (d.school() != null) {
            page.put("about", Map.of("@type", "School", "name", d.school().name(), "url", baseUrl + "/schools/" + d.school().slug()));
        }
        page.put("publisher", publisher(baseUrl));
        data.add(page);
        boolean opening = d.noticeType() == null || d.noticeType() == SiteUpdate.NoticeType.OPENING
                || d.noticeType() == SiteUpdate.NoticeType.EXTENSION;
        // Job markup only while the official last date says applications are open: a notice without a last date may be an
        // old recruitment the source re-listed, and must not be offered to job search as a live vacancy.
        if (job && d.indexable() && opening && d.closesOn() != null && !d.closesOn().isBefore(notices.today())) {
            data.add(jobPosting(d, url));
        }
        return tags(noticeTitle(d.title()) + " | " + SITE, noticeDescription(d.title(), d.summary()), d.indexable() ? url : null,
                null, !d.indexable(), data);
    }

    private static final Pattern UNNAMED_RECRUITMENT = Pattern.compile(": recruitment\\.(\\s|$)");

    /**
     * A notice's summary, after the post its title names when the summary names none ("…: recruitment."). The vacancies
     * one careers page lists were all summed up that way, so 14 Doon International School, Bhubaneswar notices shared one
     * description (Nov 2026 crawl): "Art Teacher. Doon International School, Bhubaneswar published this notice on …".
     */
    static String noticeDescription(String title, String summary) {
        if (summary == null || title == null || !UNNAMED_RECRUITMENT.matcher(summary).find()) return summary;
        int colon = title.indexOf(": ");
        String post = colon < 0 ? "" : title.substring(colon + 2).replaceAll("\\s+", " ").trim();
        return post.isEmpty() ? summary : post + (post.endsWith(".") ? " " : ". ") + summary;
    }

    /**
     * At most 60 characters, cut after a whole word (the full title is the page's heading). A notice titled
     * "institution: post (subject)" keeps its post up to the subject: the cut once gave six Doon International School
     * vacancies the same title, "…, Bhubaneswar: Higher Secondary" (Nov 2026 crawl). The institution is shortened
     * instead: without "PM SHRI", with network initials, without its place, and at last after a whole word. A cut that
     * already keeps the subject is left alone, so Kendriya Vidyalaya notices keep the place that tells them apart.
     */
    static String noticeTitle(String title) {
        String t = title.replaceAll("\\s+", " ").trim();
        if (t.length() <= TITLE_MAX) {
            return t;
        }
        String cut = tidyCut(t.substring(0, t.lastIndexOf(' ', TITLE_MAX) > 30 ? t.lastIndexOf(' ', TITLE_MAX) : TITLE_MAX));
        int colon = t.indexOf(": ");
        int close = colon > 0 ? t.indexOf(')', colon) : -1;
        if (close < 0 || cut.length() > close) {
            return cut;
        }
        String post = t.substring(colon + 2);
        String subject = t.substring(colon + 2, close + 1);
        String plain = withoutSchemePrefix(t.substring(0, colon));
        String unplaced = plain.contains(", ") ? plain.substring(0, plain.indexOf(", ")) : plain;
        for (String name : List.of(networkInitials(plain), unplaced, networkInitials(unplaced))) {
            if (name.length() + 2 + post.length() <= TITLE_MAX) return name + ": " + post;
            if (name.length() + 2 + subject.length() <= TITLE_MAX) return name + ": " + subject;
        }
        String shortest = networkInitials(unplaced);
        int room = TITLE_MAX - 2 - subject.length();
        int space = room > 0 ? shortest.lastIndexOf(' ', room) : -1;
        return space >= 3 ? tidyCut(shortest.substring(0, space)) + ": " + subject : cut;
    }

    /** A cut title without a dangling separator or short word at its end. */
    private static String tidyCut(String cut) {
        return cut.replaceAll("[\\s,;:–—(-]+$", "").replaceAll("\\s+(of|for|the|and|to|in|on|a|an|by|at|with)$", "");
    }

    /** schema.org JobPosting from the facts the page shows. */
    static Map<String, Object> jobPosting(com.indiaschoolfinder.dto.notice.NoticeDtos.NoticeDetail d, String url) {
        Map<String, Object> j = new LinkedHashMap<>();
        j.put("@context", "https://schema.org");
        j.put("@type", "JobPosting");
        List<String> posts = d.positions().isEmpty() ? d.postTypes().stream().map(f -> f.label()).toList()
                : d.positions().stream().map(p -> p.postName()).toList();
        // The job's title, not the notice's: the posts it names, else the official wording (without our institution prefix).
        String title = posts.isEmpty() ? (d.officialTitle() != null ? d.officialTitle() : d.title())
                : String.join(", ", posts.subList(0, Math.min(3, posts.size()))) + (posts.size() > 3 ? " and other posts" : "");
        j.put("title", title.length() > 110 ? noticeTitle(title) : title);
        StringBuilder description = new StringBuilder("<p>").append(html(d.summary())).append("</p><ul>");
        String org = d.institutionName() != null ? d.institutionName() : d.sourceName();
        if (org != null) description.append("<li>Hiring: ").append(html(org)).append("</li>");
        if (!posts.isEmpty()) description.append("<li>Posts: ").append(html(String.join(", ", posts))).append("</li>");
        if (!d.subjects().isEmpty()) description.append("<li>Subjects: ").append(html(String.join(", ", d.subjects()))).append("</li>");
        if (d.vacancies() != null) description.append("<li>Number of posts: ").append(d.vacancies()).append("</li>");
        if (d.eligibility() != null) description.append("<li>Eligibility: ").append(html(d.eligibility())).append("</li>");
        if (d.closesOn() != null) description.append("<li>Last date: ").append(d.closesOn().format(DAY)).append("</li>");
        description.append("</ul><p>Read the official notice before applying.</p>");
        j.put("description", description.toString());
        j.put("datePosted", d.publishedOn().toString());
        if (d.closesOn() != null) {
            j.put("validThrough", d.closesOn() + "T23:59:59+05:30");
        }
        if (d.employmentType() != null) {
            j.put("employmentType", switch (d.employmentType()) {
                case REGULAR -> "FULL_TIME";
                case CONTRACT -> "CONTRACTOR";
                case PART_TIME -> "PART_TIME";
                case TEMPORARY -> "TEMPORARY";
            });
        }
        Map<String, Object> hiring = new LinkedHashMap<>();
        hiring.put("@type", "Organization");
        hiring.put("name", org != null ? org : "the hiring institution");
        if (d.sourceUrl() != null) {
            try {
                java.net.URI source = java.net.URI.create(d.sourceUrl());
                hiring.put("sameAs", source.getScheme() + "://" + source.getHost() + "/");
            } catch (IllegalArgumentException ignored) {
                // no sameAs
            }
        }
        j.put("hiringOrganization", hiring);
        Map<String, Object> address = new LinkedHashMap<>();
        address.put("@type", "PostalAddress");
        if (d.city() != null) address.put("addressLocality", d.city());
        if (d.stateName() != null) address.put("addressRegion", d.stateName());
        address.put("addressCountry", "IN");
        j.put("jobLocation", Map.of("@type", "Place", "address", address));
        if (d.eligibility() != null) j.put("qualifications", d.eligibility());
        if (d.experience() != null) j.put("experienceRequirements", d.experience());
        if (d.vacancies() != null) j.put("totalJobOpenings", d.vacancies());
        j.put("url", url);
        return j;
    }

    /** A featured boarding school page of the app, /boarding/{slug} (frontend content/boarding.ts). */
    private static final Pattern BOARDING_FEATURE = Pattern.compile("^/boarding/([a-z0-9-]+)$");
    /**
     * The app's featured boarding school pages (frontend content/boarding.ts, keep in step): heading, description, and
     * the address search engines should index instead, where the same school or group already has its own page in the
     * sitemap (its directory profile or network page). Facts are those the app page states, from its official sources.
     */
    static final Map<String, String[]> BOARDING_FEATURES = Map.of(
            "jnv-mungeshpur", new String[]{"JNV North West Delhi (Mungeshpur)", "Jawahar Navodaya Vidyalaya Mungeshpur, Bawana, "
                    + "Delhi: a free, co-educational residential CBSE school, Classes VI to XII. Admission to Class VI through JNVST.",
                    "/schools/jawahar-navodaya-vidyalaya-north-west-delhi-mungeshpur"},
            "jnv-jaffarpur-kalan", new String[]{"JNV South West Delhi (Jaffarpur Kalan)", "Jawahar Navodaya Vidyalaya Jaffarpur "
                    + "Kalan, Delhi: a free, co-educational residential CBSE school. Admission to Class VI is through JNVST.",
                    "/schools/jawahar-navodaya-vidyalaya-south-west-delhi-jaffarpur-kalan"},
            "netarhat", new String[]{"Netarhat Awasiya Vidyalaya, Jharkhand", "Netarhat Awasiya Vidyalaya (1954), Latehar, Jharkhand: "
                    + "a free residential school for boys, with 100 Class 6 seats a year filled through its entrance exam.",
                    "/schools/netarhat-awasiya-vidyalaya"},
            "rimc", new String[]{"Rashtriya Indian Military College (RIMC), Dehradun", "RIMC, Garhi Cantt, Dehradun: admission "
                    + "to Class VIII only, in January and July terms, through the RIMC entrance exam, with state-wise vacancies.",
                    "/schools/rashtriya-indian-military-college"},
            "sainik-school-kunjpura", new String[]{"Sainik School Kunjpura, Karnal", "Sainik School Kunjpura, Karnal, Haryana: an "
                    + "English-medium CBSE residential school preparing cadets for NDA. Entry to Classes VI and IX through AISSEE.",
                    "/schools/sainik-school-kunjpura"},
            "sainik-school-rewari", new String[]{"Sainik School Rewari, Haryana", "Sainik School Rewari, Haryana: an English-medium "
                    + "CBSE residential school preparing cadets for NDA. Entry to Classes VI and IX through AISSEE.",
                    "/schools/sainik-school-rewari"},
            "sainik-school-ghorakhal", new String[]{"Sainik School Ghorakhal, Nainital", "Sainik School Ghorakhal (1966), Nainital, "
                    + "Uttarakhand: an English-medium CBSE residential school. Entry to Classes VI and IX through AISSEE.",
                    "/schools/sainik-school-ghorakhal"},
            "sainik-school-tilaiya", new String[]{"Sainik School Tilaiya, Koderma", "Sainik School Tilaiya, Koderma, Jharkhand: an "
                    + "English-medium CBSE residential school for boy and girl cadets. Entry to Classes VI and IX through AISSEE.", null},
            "rashtriya-military-schools", new String[]{"Rashtriya Military Schools: five campuses", "Rashtriya Military Schools at "
                    + "Chail, Ajmer, Belgaum, Bengaluru and Dholpur: CBSE boarding schools of the Ministry of Defence. Classes VI and IX via CET.", "/network/rashtriya-military-school"},
            "sainik-schools", new String[]{"Sainik Schools in India: admission through AISSEE", "The 33 Sainik Schools and approved "
                    + "New Sainik Schools: English-medium CBSE boarding schools preparing cadets for NDA. Classes VI and IX via AISSEE.", "/network/sainik-school"});

    /**
     * The home page hero photograph (frontend/public/images/home; licensed, credited on the page). On wide screens it is
     * the largest thing above the fold, so it is requested with the page instead of after the app starts. The srcset
     * and sizes must stay the same as the hero's &lt;img&gt; (HomeHero.tsx), or the browser downloads it twice.
     */
    static final String HOME_HERO_PREVIEW = "/images/home/hero-students-1200.webp";
    static final String HOME_HERO_PRELOAD = "<link rel=\"preload\" as=\"image\" media=\"(min-width: 1024px)\" fetchpriority=\"high\""
            + " href=\"/images/home/hero-students-960.webp\""
            + " imagesrcset=\"/images/home/hero-students-480.webp 480w, /images/home/hero-students-720.webp 720w,"
            + " /images/home/hero-students-960.webp 960w, /images/home/hero-students-1200.webp 1200w, /images/home/hero-students-1600.webp 1600w\""
            + " imagesizes=\"(min-width: 1024px) 48vw, calc(100vw - 32px)\" data-seo=\"server\" />\n";

    /**
     * An article: Article and BreadcrumbList structured data, og:type article with its dates, and a Twitter/X card. Only
     * blog pages get these extra tags; every other page keeps the shared ones.
     */
    private String blogPost(com.indiaschoolfinder.entity.BlogPost post, String baseUrl) {
        String url = baseUrl + "/blog/" + post.getSlug();
        String title = post.getMetaTitle() != null ? post.getMetaTitle() : post.getTitle();
        String description = post.getMetaDescription() != null ? post.getMetaDescription() : post.getExcerpt();
        String image = post.getCoverImageUrl() == null ? null : post.getCoverImageUrl().startsWith("/") ? baseUrl + post.getCoverImageUrl() : post.getCoverImageUrl();
        var category = post.getCategory();
        Map<String, Object> article = new LinkedHashMap<>();
        article.put("@type", "BlogPosting");
        article.put("headline", post.getTitle());
        article.put("description", description);
        article.put("url", url);
        article.put("mainEntityOfPage", url);
        article.put("datePublished", post.getPublishedAt().toString());
        article.put("dateModified", post.getUpdatedAt().toString());
        article.put("articleSection", category.label());
        if (post.getTags() != null) article.put("keywords", post.getTags());
        article.put("author", author(post.getAuthorName(), baseUrl));
        article.put("publisher", publisher(baseUrl));
        if (image != null) article.put("image", image);
        Map<String, Object> crumbs = new LinkedHashMap<>();
        crumbs.put("@type", "BreadcrumbList");
        crumbs.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Blog", "item", baseUrl + "/blog"),
                Map.of("@type", "ListItem", "position", 3, "name", category.label(), "item", baseUrl + "/blog/category/" + category.slug()),
                Map.of("@type", "ListItem", "position", 4, "name", post.getTitle(), "item", url)));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@graph", java.util.List.of(article, crumbs));
        String head = tags(title + " | " + SITE, description, url, image, false, data)
                .replace(meta("property", "og:type", "website"), meta("property", "og:type", "article"));
        StringBuilder extra = new StringBuilder();
        extra.append(meta("property", "article:published_time", post.getPublishedAt().toString()));
        extra.append(meta("property", "article:modified_time", post.getUpdatedAt().toString()));
        extra.append(meta("property", "article:section", category.label()));
        extra.append(meta("name", "twitter:card", image != null ? "summary_large_image" : "summary"));
        extra.append(meta("name", "twitter:title", title));
        extra.append(meta("name", "twitter:description", description));
        if (image != null) extra.append(meta("name", "twitter:image", image));
        return head + extra;
    }

    /**
     * An article's author as a Person: "Rakesh Kumar, Editor" (the byline as written) is the name "Rakesh Kumar" with the
     * job title "Editor". The About page introduces the site's creator.
     */
    static Map<String, Object> author(String byline, String baseUrl) {
        Map<String, Object> person = new LinkedHashMap<>();
        person.put("@type", "Person");
        int comma = byline.indexOf(", ");
        person.put("name", comma > 0 ? byline.substring(0, comma).trim() : byline.trim());
        if (comma > 0 && !byline.substring(comma + 2).isBlank()) person.put("jobTitle", byline.substring(comma + 2).trim());
        person.put("url", baseUrl + "/about");
        person.put("worksFor", Map.of("@id", baseUrl + "/#organization"));
        return person;
    }

    /** A blog category page exists only once the category has a published article; until then it is noindex. */
    private String blogCategory(String slug, String baseUrl) {
        var category = com.indiaschoolfinder.entity.BlogPost.Category.bySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Blog category", slug));
        long articles = blogService.categoryCounts().getOrDefault(category, 0L);
        String url = baseUrl + "/blog/category/" + category.slug();
        return tags(category.label() + ": articles for parents and students | " + SITE,
                category.label() + " on the SchoolDhundo blog: original guides for Indian parents and students, with official sources linked.",
                url, null, articles == 0, null);
    }

    /** Says the questions are our own; short, so the description still has room for what the set covers. */
    static final String PRACTICE_NOTE = "Original questions, not official papers.";

    /** Practice sets are original SchoolDhundo questions; the description says so, and the data is a free Quiz. */
    /**
     * A practice set's description: "Practice set N: " (or "Mock test N: ") when its address ends in a number (sets of one
     * topic share their first sentence, so without it five sets had one description), then what it covers, then the note
     * that the questions are our own, which always stays. What it covers is the first sentence when it fits; else that
     * sentence up to a clause break (" — ", ": ", "; "), which still reads as a whole thought; else the set's own facts, the
     * most detailed wording that fits ("20 JNVST Arithmetic questions for Class V with explained answers, 30 minutes, in
     * English and Hindi."). Until 25 Nov 2026 the first sentence was cut at a word, with "…", on all 115 published sets: the
     * longer note left it about 70 characters.
     */
    static String practiceDescription(String slug, String setDescription, List<String> facts) {
        java.util.regex.Matcher number = Pattern.compile("-(\\d{1,3})$").matcher(slug);
        String kind = slug.contains("-mock-") ? "Mock test " : "Practice set ";
        String lead = number.find() ? kind + number.group(1) + ": " : "";
        int room = DESCRIPTION_MAX - PRACTICE_NOTE.length() - 1 - lead.length();
        String first = setDescription == null ? "" : setDescription.trim().split("(?<=\\.)\\s", 2)[0];
        return lead + covers(first, facts == null ? List.of() : facts, room) + " " + PRACTICE_NOTE;
    }

    private static String covers(String first, List<String> facts, int room) {
        if (!first.isEmpty() && first.length() <= room) return first;
        String head = first.substring(0, Math.min(first.length(), room - 1));
        int clause = Math.max(head.lastIndexOf(" — "), Math.max(head.lastIndexOf(": "), head.lastIndexOf("; ")));
        if (clause >= 40) return first.substring(0, clause).replaceAll("[\\s,;:–—-]+$", "") + ".";
        for (String f : facts) {
            if (f.length() <= room) return f;
        }
        int space = first.lastIndexOf(' ', room - 1);
        return first.substring(0, space > 0 ? space : Math.min(first.length(), room - 1)).replaceAll("[\\s,;:–-]+$", "") + "…";
    }

    /**
     * The set's own facts, most detailed first: "20 JNVST Arithmetic questions for Class V with explained answers, 30 minutes,
     * in English and Hindi.", then without the languages, the time, the answers. The exam and the class keep sets apart:
     * without them, 32 of the 115 live sets (Olympiad classes with equal counts) would have shared 14 descriptions.
     */
    static List<String> practiceFacts(int questions, String exam, List<String> sections, String level, Integer minutes, boolean hindi) {
        String who = exam == null || exam.isBlank() ? "" : exam + " ";
        String what = sections.size() == 1 ? questions + " " + who + sections.get(0) + " questions"
                : questions + " " + who + "questions in " + sections.size() + " sections";
        String forLevel = level == null || level.isBlank() ? "" : " for " + level;
        String time = minutes == null ? "" : ", " + minutes + " minutes";
        return List.of(what + forLevel + " with explained answers" + time + (hindi ? ", in English and Hindi" : "") + ".",
                what + forLevel + " with explained answers" + time + ".",
                what + forLevel + " with explained answers.",
                what + forLevel + ".");
    }

    /** The name a set's exam is searched by ("JNVST", "Netarhat"), "Olympiad" for Olympiad sets, else nothing. */
    private String practiceExam(com.indiaschoolfinder.entity.PracticeSet set) {
        if (set.getCategory() == com.indiaschoolfinder.entity.PracticeSet.Category.OLYMPIAD) return "Olympiad";
        if (set.getExamSlug() == null) return null;
        try {
            return examService.get(set.getExamSlug()).exam().shortName();
        } catch (ResourceNotFoundException e) {
            return null;
        }
    }

    private String practiceSet(com.indiaschoolfinder.entity.PracticeSet set, String baseUrl) {
        String url = baseUrl + "/exams/practice/" + set.getSlug();
        boolean hindi = set.getContent().questions().stream().anyMatch(q -> q.hi() != null);
        List<String> sections = set.getContent().questions().stream().map(q -> q.section()).distinct().toList();
        String description = practiceDescription(set.getSlug(), set.getDescription(), practiceFacts(set.getContent().questions().size(),
                practiceExam(set), sections, set.getLevel(), set.getDurationMinutes(), hindi));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "Quiz");
        data.put("name", set.getTitle());
        data.put("description", description);
        data.put("url", url);
        data.put("educationalLevel", set.getLevel());
        data.put("inLanguage", hindi ? java.util.List.of("en", "hi") : java.util.List.of("en"));
        data.put("isAccessibleForFree", true);
        data.put("provider", publisher(baseUrl));
        return tags(set.getTitle() + " | " + SITE, description, url, null, false, data);
    }

    private String school(SchoolDetailDto s, String baseUrl) {
        String place = schoolPlace(s.locality(), s.city(), s.district() == null ? null : s.district().name(), s.stateName());
        String town = s.city() != null ? s.city() : s.district() != null ? s.district().name() : s.stateName();
        String board = s.board() == null ? null : "CISCE".equals(s.board().code()) ? "ICSE/ISC" : s.board().code();
        boolean fees = !feeService.feeHistory(s.id()).isEmpty();
        boolean admissions = !admissionService.bySchool(s.id()).isEmpty();
        boolean facilities = !facilityRepository.findBySchoolIdOrderByCategoryAscNameAsc(s.id()).isEmpty();
        // Two branches with one name in one town would share a title; the PIN code tells them apart.
        String pin = s.pinCode() != null && schoolRepository.hasNamesake(s.id(), s.name(), s.stateCode(), s.city())
                ? " (" + s.pinCode() + ")" : "";
        String title = schoolTitle(s.name(), town, pin, schoolTitleTopic(fees, admissions, board));
        String classes = s.classesOffered().isEmpty() ? null : s.classesOffered().size() == 1
                ? s.classesOffered().get(0).name()
                : s.classesOffered().get(0).name() + " to " + s.classesOffered().get(s.classesOffered().size() - 1).name();
        StringBuilder description = new StringBuilder(s.name());
        if (!place.isEmpty()) {
            description.append(", ").append(place);
        }
        description.append('.');
        if (board != null) {
            description.append(' ').append(board).append(" school");
            description.append(classes != null ? ", " + classes + "." : ".");
        } else if (classes != null) {
            description.append(" Classes ").append(classes).append('.');
        }
        description.append(' ').append(schoolDescriptionTail(s, fees, admissions, facilities));

        String url = baseUrl + "/schools/" + s.slug();
        String image = schoolService.images(s.id()).stream()
                .filter(i -> i.imageType() != ImageType.LOGO && !i.illustrative())
                .map(ImageDto::url).findFirst().orElse(null);

        Map<String, Object> address = new LinkedHashMap<>();
        address.put("@type", "PostalAddress");
        putIfPresent(address, "streetAddress", s.addressLine());
        putIfPresent(address, "addressLocality", town);
        putIfPresent(address, "addressRegion", s.stateName());
        putIfPresent(address, "postalCode", s.pinCode());
        address.put("addressCountry", "IN");
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "School");
        data.put("@id", url + "#school");
        data.put("name", s.name());
        // The profile's own first sentence (the same words the page shows), so the entity is described as the page does.
        data.put("description", com.indiaschoolfinder.util.SchoolAboutText.about(s));
        data.put("url", url);
        data.put("address", address);
        // The board's affiliation number, shown on the profile, identifies the school unambiguously.
        if (s.affiliationNumber() != null && !s.affiliationNumber().isBlank() && s.board() != null) {
            data.put("identifier", Map.of("@type", "PropertyValue",
                    "propertyID", ("CISCE".equals(s.board().code()) ? "CISCE" : s.board().code()) + " affiliation number",
                    "value", s.affiliationNumber().trim()));
        }
        putIfPresent(data, "sameAs", s.websiteUrl());
        putIfPresent(data, "telephone", s.phone() == null ? null : s.phone().split(",")[0].trim());
        putIfPresent(data, "email", s.email());
        putIfPresent(data, "foundingDate", s.establishedYear() == null ? null : String.valueOf(s.establishedYear()));
        putIfPresent(data, "image", image);
        if (s.latitude() != null && s.longitude() != null) {
            data.put("geo", Map.of("@type", "GeoCoordinates", "latitude", s.latitude(), "longitude", s.longitude()));
        }
        List<Map<String, Object>> graph = new java.util.ArrayList<>(List.of(data, schoolBreadcrumbs(s, url, baseUrl)));
        Map<String, Object> faq = faqPage(faqService.faqs(s));
        if (faq != null) {
            graph.add(faq);
        }
        // A bare board listing stays reachable but is noindex until it holds more (SchoolRepository.INDEXABLE).
        return tags(title, description.toString(), url, image, !schoolRepository.isIndexable(s.id()), graph)
                + heroPreload(schoolService.images(s.id()));
    }

    /**
     * The profile's hero photo, requested with the page instead of after the app has loaded the school and its photos
     * (it is the largest thing on the page; Lighthouse measured LCP 5.5 s on a phone without this). The app shows the
     * first photo that is not a logo, its thumbnail with the full size as the 2x choice (SchoolDetailPage HeroFigure);
     * the same choice is made here, so the browser downloads it once.
     */
    static String heroPreload(List<ImageDto> images) {
        ImageDto hero = images.stream().filter(i -> i.imageType() != ImageType.LOGO).findFirst().orElse(null);
        if (hero == null || hero.url() == null) return "";
        String small = hero.thumbnailUrl() != null ? hero.thumbnailUrl() : hero.url();
        StringBuilder link = new StringBuilder("<link rel=\"preload\" as=\"image\" fetchpriority=\"high\" href=\"")
                .append(org.springframework.web.util.HtmlUtils.htmlEscape(small)).append('"');
        if (hero.thumbnailUrl() != null && !hero.thumbnailUrl().equals(hero.url())) {
            link.append(" imagesrcset=\"").append(org.springframework.web.util.HtmlUtils.htmlEscape(hero.thumbnailUrl())).append(" 1x, ")
                    .append(org.springframework.web.util.HtmlUtils.htmlEscape(hero.url())).append(" 2x\"");
        }
        return link.append(" data-seo=\"server\" />\n").toString();
    }

    /**
     * A profile's title for search results: its name, town, PIN code (only when a namesake exists) and topic, kept
     * within {@link #TITLE_MAX} characters where the name allows. The heading and the School data keep the full
     * official name; the title first leaves out the "PM SHRI" scheme prefix, which people do not search for, then the
     * topic, and only then shortens the two big government networks to the initials people search by (JNV, KV). No
     * other word of the name is changed, so the title never calls a school anything its own record does not.
     * (Navodaya names are not replaced by their district: 45 districts have more than one JNV in the directory.)
     */
    static String schoolTitle(String name, String town, String pin, String topic) {
        String plain = withoutSchemePrefix(name);
        String shortName = networkInitials(plain);
        String[] candidates = {
                plain + place(plain, town) + pin + topic,
                plain + place(plain, town) + pin,
                shortName + place(shortName, town) + pin + topic,
                shortName + place(shortName, town) + pin};
        for (String candidate : candidates) {
            if (candidate.length() <= TITLE_MAX) {
                return candidate + " | " + SITE;
            }
        }
        return candidates[candidates.length - 1] + " | " + SITE;
    }

    /**
     * "Hisar, Haryana" from locality, town, district and state, each named once. Two spellings of one place count as one
     * ("Hisar" and the district's "Hissar", "BHUJ" and "Bhuj"): Search Console showed the Moga Devi Minda Memorial School
     * profile in results with "Hisar, Hissar, Haryana" (29 impressions, 9-21 Nov 2026).
     */
    static String schoolPlace(String... parts) {
        Map<String, String> seen = new LinkedHashMap<>();
        for (String part : parts) {
            if (part == null || part.isBlank()) continue;
            String key = part.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "").replaceAll("(.)\\1+", "$1");
            seen.putIfAbsent(key.isEmpty() ? part.trim() : key, part.trim());
        }
        return String.join(", ", seen.values());
    }

    /** ", Dehradun" after the name, unless the name already says the town. */
    private static String place(String name, String town) {
        return town != null && !town.isBlank() && !name.contains(town) ? ", " + town : "";
    }

    /** "PM SHRI School Jawahar Navodaya Vidyalaya, X" → "Jawahar Navodaya Vidyalaya, X"; a bare "PM SHRI School" is kept. */
    static String withoutSchemePrefix(String name) {
        String plain = name.replaceFirst("(?i)^PM\\s+SHRI\\s+(School\\s+)?", "").trim();
        return plain.length() < 3 || plain.equalsIgnoreCase("School") ? name : plain;
    }

    /** "Jawahar Navodaya Vidyalaya, Chendayad" → "JNV Chendayad"; "Kendriya Vidyalaya No. 1 Jammu" → "KV No. 1 Jammu". */
    static String networkInitials(String name) {
        String shortName = name.replaceFirst("(?i)\\bJa+w?a?har\\s+Navodaya\\s+Vid[a-z]*laya\\b\\s*,?\\s*", "JNV ")
                .replaceFirst("(?i)\\bKen[a-z]*riya\\s+Vidyal?aya\\b\\s*,?\\s*", "KV ")
                .replaceAll("\\s{2,}", " ").trim();
        return shortName.isEmpty() ? name : shortName;
    }

    /**
     * What the title promises, from what the profile holds: fees and admissions only when they are recorded, else the
     * board. Nothing is promised that the page does not show.
     */
    static String schoolTitleTopic(boolean fees, boolean admissions, String board) {
        if (fees && admissions) return ": Fees, Admissions & Details";
        if (fees) return ": Fees & Details";
        if (admissions) return ": Admissions & Details";
        return board != null ? ": " + board + " School Details" : "";
    }

    /** The description's last sentence: the kinds of facts this profile actually has, never "fees" when there are none. */
    static String schoolDescriptionTail(SchoolDetailDto s, boolean fees, boolean admissions, boolean facilities) {
        List<String> parts = new java.util.ArrayList<>();
        if (fees) parts.add("fees");
        if (admissions) parts.add("admission dates");
        if (facilities) parts.add("facilities");
        if (s.affiliationNumber() != null && !s.affiliationNumber().isBlank()) parts.add("affiliation number");
        if (s.websiteUrl() != null || s.phone() != null || s.email() != null) parts.add("contact details");
        if (parts.isEmpty()) {
            return "School details with official sources on " + SITE + ".";
        }
        String list = parts.size() == 1 ? parts.get(0)
                : String.join(", ", parts.subList(0, parts.size() - 1)) + " and " + parts.get(parts.size() - 1);
        return "See " + list + ", with official sources, on " + SITE + ".";
    }

    /** Schools › state › district › school: the profile page's breadcrumb (its locality link is a filter, not a page). */
    private static Map<String, Object> schoolBreadcrumbs(SchoolDetailDto s, String url, String baseUrl) {
        List<Map<String, Object>> items = new java.util.ArrayList<>();
        items.add(listItem(1, "Schools", baseUrl + "/schools"));
        if (s.stateSlug() != null) {
            String stateUrl = baseUrl + "/states/" + s.stateSlug();
            items.add(listItem(2, s.stateName(), stateUrl));
            if (s.district() != null) {
                items.add(listItem(3, s.district().name(), stateUrl + "/" + s.district().slug()));
            }
        }
        items.add(listItem(items.size() + 1, s.name(), url));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", items);
        return data;
    }

    /** FAQPage data for the questions the profile page shows under "Quick answers"; null when there are none. */
    static Map<String, Object> faqPage(List<SchoolFaqService.Faq> faqs) {
        if (faqs.isEmpty()) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "FAQPage");
        data.put("mainEntity", faqs.stream().map(f -> Map.of(
                "@type", "Question",
                "name", f.question(),
                "acceptedAnswer", Map.of("@type", "Answer", "text", f.answer()))).toList());
        return data;
    }

    /** A BreadcrumbList from its items, in order. */
    @SafeVarargs
    private static Map<String, Object> crumbs(Map<String, Object>... items) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", List.of(items));
        return data;
    }

    private static Map<String, Object> listItem(int position, String name, String url) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("@type", "ListItem");
        item.put("position", position);
        item.put("name", name);
        item.put("item", url);
        return item;
    }

    private String state(String stateSlug, String districtSlug, String baseUrl) {
        StateDto state = locationService.state(stateSlug);
        if (!state.slug().equals(stateSlug)) {
            throw new ResourceNotFoundException("State", stateSlug); // codes ("UP") are not the canonical address
        }
        if (districtSlug == null) {
            String title = placeTitle(state.schoolCount(), state.name(), null);
            String description = placeDescription("%,d schools in %s, by district".formatted(state.schoolCount(), state.name()));
            String url = baseUrl + "/states/" + state.slug();
            return tags(title, description, url, null, state.schoolCount() == 0,
                    crumbs(listItem(1, "Schools", baseUrl + "/schools"), listItem(2, state.name(), url)));
        }
        DistrictDto district = locationService.districts(state.code()).stream()
                .filter(d -> d.slug().equals(districtSlug)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("District", districtSlug));
        // "District" tells this page apart from the town of the same name (/states/bihar/patna vs /states/bihar/city/patna),
        // which would otherwise have the same title and heading; the town page keeps the plain "Schools in Patna, Bihar".
        String title = placeTitle(district.schoolCount(), districtName(district.name()), state.name());
        String description = placeDescription("%,d schools in %s district, %s".formatted(district.schoolCount(), district.name(), state.name()));
        String url = baseUrl + "/states/" + state.slug() + "/" + district.slug();
        return tags(title, description, url, null, district.schoolCount() < MIN_SCHOOLS_TO_INDEX,
                crumbs(listItem(1, "Schools", baseUrl + "/schools"), listItem(2, state.name(), baseUrl + "/states/" + state.slug()),
                        listItem(3, district.name(), url)));
    }

    /**
     * "List of 65 Schools in Kolkata, West Bengal | SchoolDhundo". The count is the number of schools the page lists (its
     * description and heading say the same), and "list" is how people search for these pages: "naharlagun school list",
     * "daman school list", "list of schools in dombivli" (Search Console, Nov 2026, when place pages had about 780
     * impressions in two weeks and 4 clicks under the plain "Schools in Naharlagun, Arunachal Pradesh").
     * When the title would pass {@link #TITLE_MAX} even without the site name, the state is left out first, then the
     * count ("Schools in Diu District"); the description still names both. A state page passes no state name.
     */
    static String placeTitle(long count, String place, String stateName) {
        String listed = count > 1 ? String.format(Locale.ENGLISH, "List of %,d Schools in ", count) : "Schools in ";
        String where = stateName == null ? place : place + ", " + stateName;
        for (String title : List.of(listed + where, listed + place, "Schools in " + where)) {
            if (title.length() <= TITLE_MAX) return title + " | " + SITE;
        }
        return "Schools in " + place + " | " + SITE;
    }

    static final String PLACE_DETAILS = "Fees and admission dates are shown where published, each linked to its official source.";

    /**
     * "65 schools in Kolkata, West Bengal, with board and classes. Fees and admission dates ...". Two sentences, so that
     * for a long place name ("Dadra and Nagar Haveli and Daman and Diu") {@link #fitDescription} drops the second one
     * whole instead of cutting a sentence short with "…".
     */
    static String placeDescription(String lead) {
        return lead + ", with board and classes. " + PLACE_DETAILS;
    }

    /** "Patna" → "Patna District"; a name that already ends in "district" is kept as it is. */
    public static String districtName(String name) {
        return name.trim().toLowerCase(Locale.ROOT).endsWith("district") ? name.trim() : name.trim() + " District";
    }

    private String city(String stateSlug, String citySlug, String baseUrl) {
        StateDto state = locationService.state(stateSlug);
        if (!state.slug().equals(stateSlug)) {
            throw new ResourceNotFoundException("State", stateSlug);
        }
        CityDto city = locationService.cities(state.code()).stream()
                .filter(c -> c.slug().equals(citySlug))
                // Two spellings of one town ("Bhuj", "BHUJ") share a slug; the page is the one with more schools, as in the sitemap.
                .max(java.util.Comparator.comparingLong(CityDto::schoolCount))
                .orElseThrow(() -> new ResourceNotFoundException("City", citySlug));
        String title = placeTitle(city.schoolCount(), city.name(), state.name());
        String description = placeDescription("%,d schools in %s, %s".formatted(city.schoolCount(), city.name(), state.name()));
        String url = baseUrl + "/states/" + state.slug() + "/city/" + city.slug();
        return tags(title, description, url, null, city.schoolCount() < MIN_SCHOOLS_TO_INDEX,
                crumbs(listItem(1, "Schools", baseUrl + "/schools"), listItem(2, state.name(), baseUrl + "/states/" + state.slug()),
                        listItem(3, city.name(), url)));
    }

    private String board(String code, String baseUrl) {
        var board = boardRepository.findByCodeIgnoreCase(code).orElseThrow(() -> new ResourceNotFoundException("Board", code));
        String title = boardLabel(board.getCode()) + " schools in India | " + SITE;
        String description = "Schools affiliated to " + board.getName() + ", with their classes. " + PLACE_DETAILS;
        // A board with no school listed (State, Other) is an empty page: kept out of the index, as it is out of the sitemap.
        boolean empty = "OTHER".equals(board.getCode()) || !schoolRepository.boardCodesWithSchools().contains(board.getCode());
        // The site links board pages by their upper-case code (/boards/CBSE), so that is the canonical address.
        return tags(title, description, baseUrl + "/boards/" + board.getCode(), null, empty, null);
    }

    /**
     * A board's name in titles and headings. The code was used as it is until November 2026, which titled pages
     * "CAMBRIDGE schools in India" and "STATE schools in India". The app's BoardPage uses the same names.
     */
    public static String boardLabel(String code) {
        return switch (code == null ? "" : code) {
            case "CISCE" -> "ICSE/ISC (CISCE)";
            case "CAMBRIDGE" -> "Cambridge (CAIE)";
            case "STATE" -> "State board";
            case "OTHER" -> "Other curriculum";
            default -> code;
        };
    }

    /** Exam guide: the description states only confirmed dates; otherwise that the notice is awaited. */
    private String exam(ExamDetailDto detail, String baseUrl) {
        ExamSummaryDto e = detail.exam();
        String title = examGuideTitle(e) + " | " + SITE;
        String url = baseUrl + "/exams/" + e.slug() + (PREP_PAGES.contains(e.slug()) ? "/guide" : "");
        String description = examGuideDescription(e, detail.content() == null ? List.of() : detail.content().eligibility());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Entrance exams", "item", baseUrl + "/exams"),
                Map.of("@type", "ListItem", "position", 3, "name", e.shortName(), "item", url)));
        List<Map<String, Object>> graph = new java.util.ArrayList<>(List.of(examArticle(e, title, description, url, baseUrl), data));
        // The guide's questions as the page shows them (its "Frequently asked questions"); none are added here.
        if (detail.content() != null && detail.content().faq() != null && !detail.content().faq().isEmpty()) {
            Map<String, Object> faq = faqPage(detail.content().faq().stream()
                    .map(f -> new SchoolFaqService.Faq(f.question(), f.answer())).toList());
            if (faq != null) graph.add(faq);
        }
        return tags(title, description, url, null, false, graph);
    }

    /**
     * What the guide answers first, then its date, then who conducts the exam: {@link #fitDescription} leaves sentences off
     * the end, so the most useful facts must open it. Until November 2026 it opened with the exam's full official name and
     * conducting body, which alone filled the 160 characters, so search results never showed the date or what the page
     * covers ("Jawahar Navodaya Vidyalaya Selection Test (JNVST) – Class VI, conducted by …").
     */
    /**
     * "JNV Class XI 2027: eligibility, dates, pattern and syllabus". The cycle's year is in the title because exam
     * searches carry it ("jnv mock test class 6 2027", "navodaya vidyalaya age limit for class 6 2027"; Search Console,
     * Nov 2026, when the guide without it had 31 impressions at position 8 and no click); it is left out when the title
     * would pass {@link #TITLE_MAX} ("EMRSST Odisha 2027-28: …"). An admission procedure without a test (the Kendriya
     * Vidyalaya lottery) promises dates and admission steps, as its description does, not a pattern and syllabus.
     */
    static String examGuideTitle(ExamSummaryDto e) {
        String covers = e.kind() == ExamKind.SELECTION_PROCESS ? ": eligibility, dates and admission steps"
                : ": eligibility, dates, pattern and syllabus";
        String dated = examName(e) + covers;
        return dated.length() <= TITLE_MAX ? dated : e.shortName() + covers;
    }

    private static final Pattern CYCLE_YEAR = Pattern.compile("\\b\\d{4}(-\\d{2})?\\b");

    /**
     * The name people search by, with the cycle's year: "JNVST 2027", "JNV Class IX 2027", "Netarhat 2026-27". The
     * cycle's own label is not used as it is: some do not name the exam ("Class IX LEST 2027").
     */
    static String examName(ExamSummaryDto e) {
        String lead = e.shortName();
        Matcher year = CYCLE_YEAR.matcher(e.currentCycle() == null ? "" : e.currentCycle());
        return year.find() && !lead.matches(".*\\b\\d{4}\\b.*") ? lead + " " + year.group() : lead;
    }

    static String examGuideDescription(ExamSummaryDto e, List<String> eligibility) {
        String lead = examName(e);
        // "– Class VI" in the official name says which class the exam admits to, unless the short name already does.
        String name = e.name() == null ? "" : e.name();
        int dash = name.lastIndexOf(" – ");
        String classes = dash > 0 && name.substring(dash + 3).startsWith("Class") && !lead.contains("Class")
                ? " (" + name.substring(dash + 3) + ")" : "";
        // "age limit" only where the eligibility rules set one (a birth-date window or an age).
        boolean ageRule = eligibility != null && eligibility.stream().anyMatch(l -> l != null
                && l.toLowerCase(Locale.ROOT).matches(".*\\b(born|age|aged|years)\\b.*"));
        // An admission procedure without a test (Kendriya Vidyalaya lottery) has no pattern or syllabus to promise.
        String covers = e.kind() == ExamKind.SELECTION_PROCESS ? ", dates and admission steps" : ", exam pattern and syllabus";
        StringBuilder d = new StringBuilder(lead).append(classes).append(": eligibility")
                .append(ageRule ? ", age limit" : "").append(covers).append(" from the official notice.");
        String date = examDateSentence(e, "Exam");
        if (date != null) d.append(' ').append(date);
        else if (e.status() == ExamStatus.AWAITING_NOTIFICATION) d.append(" Dates not announced yet.");
        if (e.conductingAuthority() != null && !e.conductingAuthority().isBlank()) {
            d.append(" Conducted by ").append(e.conductingAuthority()).append('.');
        }
        return d.toString();
    }

    /**
     * "Exam date: 28 Nov 2026." while it is ahead; "Exam held on 28 Nov 2026." once it has passed (the status says so:
     * only these four states have the exam still to come), so a snippet never offers a past date as the next one.
     */
    static String examDateSentence(ExamSummaryDto e, String label) {
        if (e.examDate() == null) return null;
        return label + (examAhead(e) ? " date: " : " held on ") + DAY.format(e.examDate()) + ".";
    }

    /** True while the exam date is still to come: only these four states have it ahead (the app's ExamComparison agrees). */
    static boolean examAhead(ExamSummaryDto e) {
        return e.status() == ExamStatus.EXAM_DATE_ANNOUNCED || e.status() == ExamStatus.APPLICATIONS_OPEN
                || e.status() == ExamStatus.DEADLINE_APPROACHING || e.status() == ExamStatus.APPLICATIONS_OPENING_SOON;
    }

    /**
     * An exam guide as an Article written by the site: what it is about, and when its facts were last checked against
     * the official sources (the date the page shows). No publication date is claimed, because none is recorded.
     */
    static Map<String, Object> examArticle(ExamSummaryDto e, String title, String description, String url, String baseUrl) {
        Map<String, Object> article = new LinkedHashMap<>();
        article.put("@context", "https://schema.org");
        article.put("@type", "Article");
        article.put("headline", title.replace(" | " + SITE, ""));
        article.put("description", description);
        article.put("url", url);
        article.put("mainEntityOfPage", url);
        article.put("inLanguage", "en-IN");
        article.put("about", Map.of("@type", "Thing", "name", e.name()));
        if (e.lastVerifiedOn() != null) article.put("dateModified", e.lastVerifiedOn().toString());
        if (e.officialUrl() != null && !e.officialUrl().isBlank()) article.put("citation", e.officialUrl());
        article.put("author", publisher(baseUrl));
        article.put("publisher", publisher(baseUrl));
        return article;
    }

    /** A Class VI preparation dashboard (JNVST, AISSEE, Netarhat): practice, mock tests and the study plan. */
    private String prepPage(ExamDetailDto detail, String baseUrl) {
        ExamSummaryDto e = detail.exam();
        String title, offer, dateLabel;
        switch (e.slug()) {
            case "aissee" -> {
                // Searched as "aissee 2027", "aissee class 6", "aissee mock test" (Ubersuggest, India, 2026-11-16).
                title = "AISSEE 2027 Class 6 Preparation: Free Mock Tests";
                offer = "Free AISSEE (Sainik School) Class 6 mock tests in the 125-question pattern, in English and Hindi.";
                dateLabel = "Entrance exam";
            }
            case "netarhat" -> {
                // Searched as "netarhat vidyalaya class 6 admission", "netarhat vidyalaya exam" (Ubersuggest, 2026-11-16).
                title = "Netarhat Vidyalaya Entrance Exam 2026-27: Free Mock Tests";
                offer = "Free Netarhat Vidyalaya Class 6 mock tests (full Paper 1) and practice in Hindi and English.";
                dateLabel = "Entrance exam";
            }
            default -> {
                // "jnvst class 6": 5,400 searches a month in India, difficulty 11 (Ubersuggest, 2026-11-16). Search Console,
                // 9-21 Nov 2026: the page's visible queries were "jnv mock test class 6 2027" (21 impressions, position 8.5)
                // and "navodaya mock test for class 6 free 2027", so the title names the mock test and Navodaya (JNV).
                title = "JNVST Class 6 Mock Test 2027: Free Navodaya (JNV) Practice";
                // Short enough that "…held on 28 Nov 2026; result expected by end of March 2027." still fits after the test.
                offer = "Free JNVST Class 6 mock tests in the 80-question pattern, in English and Hindi.";
                dateLabel = "Selection test";
            }
        }
        String description = prepDescription(e, offer, dateLabel, java.time.LocalDate.now(IST));
        String url = baseUrl + "/exams/" + e.slug();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Entrance exams", "item", baseUrl + "/exams"),
                Map.of("@type", "ListItem", "position", 3, "name", e.shortName() + " preparation", "item", url)));
        return tags(title, description, url, null, false, data);
    }

    private static final java.time.ZoneId IST = java.time.ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    /**
     * A preparation page's description: what it offers, and the one date a searcher needs at this point of the cycle. While
     * applications are open that is the last date (and the exam date) first, as "AISSEE 2027: apply by 2 Dec 2026; exam on
     * 31 Jan 2027."; then the exam date; once the exam is over, when the result is expected. Until 25 Nov 2026 the offer and
     * the date sentence came to 161-164 characters, so {@link #fitDescription} dropped the date from all three pages.
     */
    static String prepDescription(ExamSummaryDto e, String offer, String dateLabel, java.time.LocalDate today) {
        // The most useful wording that fits, then shorter ones: fitDescription would drop the whole date sentence instead.
        List<String> candidates = new java.util.ArrayList<>();
        boolean applying = (e.status() == ExamStatus.APPLICATIONS_OPEN || e.status() == ExamStatus.DEADLINE_APPROACHING)
                && e.applicationDeadline() != null && !e.applicationDeadline().isBefore(today);
        String date = examDateSentence(e, dateLabel);
        if (applying) {
            String apply = examName(e) + ": apply by " + DAY.format(e.applicationDeadline());
            if (e.examDate() != null) candidates.add(apply + "; exam on " + DAY.format(e.examDate()) + ". " + offer);
            candidates.add(apply + ". " + offer);
        } else if (date != null) {
            String result = examAhead(e) ? null : resultPhrase(e, today);
            if (result != null) candidates.add(offer + " " + date.substring(0, date.length() - 1) + "; " + result + ".");
            candidates.add(offer + " " + date);
        }
        candidates.add(offer);
        return candidates.stream().filter(c -> c.length() <= DESCRIPTION_MAX).findFirst().orElse(offer);
    }

    /**
     * "result expected by end of March 2027" (a month-precise date, as the JNVST prospectus gives it), "result on
     * 27 Feb 2027" or "result declared on 27 Feb 2027": the cycle's result date after the exam, while it is still useful.
     * Nothing once an expected date has gone by without the result, so a snippet never promises a date already past.
     */
    static String resultPhrase(ExamSummaryDto e, java.time.LocalDate today) {
        if (e.examDate() == null || e.currentDates() == null) return null;
        for (var d : e.currentDates()) {
            if (d.kind() != com.indiaschoolfinder.enums.ExamDateKind.RESULT || d.startsOn() == null || !d.startsOn().isAfter(e.examDate())) {
                continue;
            }
            boolean month = d.precision() == com.indiaschoolfinder.enums.DatePrecision.MONTH;
            java.time.LocalDate by = month ? d.startsOn().withDayOfMonth(d.startsOn().lengthOfMonth()) : d.startsOn();
            if (e.status() == ExamStatus.RESULT_ANNOUNCED && d.confirmed() && !month) return "result declared on " + DAY.format(by);
            if (by.isBefore(today)) return null;
            if (month) return "result expected by end of " + MONTH_YEAR.format(d.startsOn());
            return (d.confirmed() ? "result on " : "result expected on ") + DAY.format(by);
        }
        return null;
    }

    /**
     * "Best schools in {state or city}": the title carries the ranking year only when a published ranking covers the
     * place; the description states the counts; places with too little behind them are noindex.
     */
    /** Official place names whose older name is still what most people search for. */
    static final Map<String, String> PLACE_ALIASES = Map.of("bengaluru", "Bangalore", "gurugram", "Gurgaon",
            "prayagraj", "Allahabad", "mysuru", "Mysore", "vadodara", "Baroda", "puducherry", "Pondicherry",
            "thiruvananthapuram", "Trivandrum", "kochi", "Cochin", "ooty", "Udhagamandalam");

    private String bestPlace(String slug, String baseUrl) {
        BestPlacesService.Place p = bestPlacesService.place(slug);
        String year = p.rankingSource() == null ? "" : " " + p.rankingSource().substring(p.rankingSource().lastIndexOf(' ') + 1);
        // The name people still search by ("best schools in bangalore": 12,100 a month in India, Ubersuggest 2026-11-17).
        String alias = PLACE_ALIASES.get(p.slug());
        String name = alias == null ? p.name() : p.name() + " (" + alias + ")";
        String where = p.kind() == BestPlacesService.Kind.CITY ? name + ", " + p.stateName() : name;
        String title = "Best Schools in " + name + year + (alias == null ? ": Rankings & School Lists" : ": Rankings") + " | " + SITE;
        StringBuilder description = new StringBuilder("Best schools in ").append(where).append(": ");
        if (p.ranked() > 0) {
            description.append(p.ranked()).append(p.ranked() == 1 ? " school" : " schools").append(" ranked in ").append(p.rankingSource());
            if (p.listed() > 0) description.append(" and ");
        }
        if (p.listed() > 0) description.append(p.listed()).append(" in SchoolDhundo's A-to-Z school lists");
        if (p.ranked() == 0 && p.listed() == 0) description.append("no published ranking yet");
        description.append(". Each rank is the publisher's own; compare schools and visit their official websites.");
        String url = baseUrl + "/rankings/best-schools-in-" + p.slug();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Rankings", "item", baseUrl + "/rankings"),
                Map.of("@type", "ListItem", "position", 3, "name", "Best schools in " + p.name(), "item", url)));
        return tags(title, description.toString(), url, null, !p.indexable(), data);
    }

    /** A directory view: its own title and the number of schools in it; a view without schools is not a page. */
    private String directoryCategory(PremierDirectoryDtos.Category c, String baseUrl) {
        String url = baseUrl + "/rankings/" + c.slug();
        String name = c.title().replace('’', '\'');
        String title = name + (name.contains("India") ? ": " : " in India: ") + c.schools() + (c.schools() == 1 ? " School" : " Schools") + " | " + SITE;
        String description = directoryDescription(c);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Rankings", "item", baseUrl + "/rankings"),
                Map.of("@type", "ListItem", "position", 3, "name", c.title().replace('’', '\''), "item", url)));
        // A view with an explainer (IB, Cambridge) shows its questions on the page; they are described as they appear.
        var guide = DirectoryGuides.forView(c.slug());
        if (guide.isPresent()) {
            Map<String, Object> faq = faqPage(guide.get().faqs().stream().map(f -> new SchoolFaqService.Faq(f.question(), f.answer())).toList());
            if (faq != null) return tags(title, description, url, null, false, List.of(data, faq));
        }
        return tags(title, description, url, null, false, data);
    }

    /**
     * The view's own sentence, then its count and what each card shows, in words that fit {@link #DESCRIPTION_MAX}. The
     * second sentence used to be about 110 characters, so {@link #fitDescription} dropped it and IB and Cambridge
     * schools went out with one 80-character line ("Schools offering International Baccalaureate programmes …").
     */
    static String directoryDescription(PremierDirectoryDtos.Category c) {
        String own = c.description().replace('’', '\'');
        String count = c.schools() + (c.schools() == 1 ? " school" : " schools");
        return own + " " + count + (DirectoryGuides.forView(c.slug()).isPresent()
                ? " with board, boarding, approximate fees and how to verify each."
                : " with board, boarding, gender and approximate fees. Links go to official websites.");
    }

    /** Exams admitting to one class; classes without a published exam are not pages (noindex via not-found). */
    private String examClass(int n, String baseUrl) {
        if (n < 1 || n > 12) {
            throw new ResourceNotFoundException("Class", n);
        }
        List<ExamSummaryDto> exams = examService.list(new ExamService.Filter(null, n, null, null, null, null, null, null,
                null, null, null, null), ExamService.Sort.RELEVANCE, 0, 100).content();
        if (exams.isEmpty()) {
            throw new ResourceNotFoundException("Class", n);
        }
        // A class reached only through admission processes (no entrance test) would just repeat those guides.
        boolean hasTest = exams.stream().anyMatch(e -> e.kind() == ExamKind.ENTRANCE_TEST);
        return tags(examClassTitle(n) + " | " + SITE, examClassDescription(n, exams.stream().map(ExamSummaryDto::shortName).toList()),
                baseUrl + "/exams/class/" + n, null, !hasTest, null);
    }

    /**
     * "Class 6 (VI) entrance exams: dates, fees and who can apply". Parents search "class 6", the notices say "Class VI",
     * and the page now compares the exams side by side (the app's ExamComparison table, SeoBodyService.examTable).
     */
    static String examClassTitle(int n) {
        return "Class " + n + " (" + ROMAN[n] + ") entrance exams: dates, fees and who can apply";
    }

    /** The exams by name (four at most, so the sentence fits), then what the comparison shows. */
    static String examClassDescription(int n, List<String> shortNames) {
        String label = "Class " + ROMAN[n];
        if (shortNames.size() == 1) {
            return shortNames.get(0) + " for " + label + ": exam date, application fee, mode and who can apply, from the official notice.";
        }
        String names = shortNames.size() > 4
                ? String.join(", ", shortNames.subList(0, 4)) + " and more"
                : String.join(", ", shortNames.subList(0, shortNames.size() - 1)) + " and " + shortNames.get(shortNames.size() - 1);
        return names + " compared for " + label + ": exam dates, application fees, mode and who can apply, from each official notice.";
    }

    /** National exams plus the state's own; only states with a state-level exam are indexed (others repeat /exams). */
    private String examState(String slug, String baseUrl) {
        StateDto state = locationService.state(slug);
        if (!state.slug().equals(slug)) {
            throw new ResourceNotFoundException("State", slug);
        }
        List<ExamSummaryDto> exams = examService.list(new ExamService.Filter(null, null, state.code(), null, null, null,
                null, null, null, null, null, null), ExamService.Sort.RELEVANCE, 0, 100).content();
        List<String> own = exams.stream().filter(e -> e.scope() == ExamScope.STATE).map(ExamSummaryDto::shortName).toList();
        String description = (own.isEmpty() ? "" : String.join(", ", own) + " for " + state.name() + " candidates, plus ")
                + "national school entrance exams open to students from " + state.name()
                + ": eligibility, dates and syllabus from official notices.";
        return tags("School entrance exams in " + state.name() + " | " + SITE, description,
                baseUrl + "/exams/state/" + state.slug(), null, own.isEmpty(), null);
    }

    /** The home page's structured data: the site and its school search. */
    /** Who runs the site: name, address, logo and how to reach it (the contact page; no personal address is published). */
    /**
     * The site's other spellings: people write "School Dhundo", and the name is close to other school portals', so
     * search and answer engines are told these all mean this site (Google uses WebSite alternateName for site names).
     */
    static final List<String> ALTERNATE_NAMES = List.of("School Dhundo", "schooldhundo.in");

    private static Map<String, Object> organization(String baseUrl) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "Organization");
        data.put("@id", baseUrl + "/#organization");
        data.put("name", SITE);
        data.put("alternateName", ALTERNATE_NAMES);
        data.put("url", baseUrl + "/");
        data.put("logo", baseUrl + "/favicon.svg");
        data.put("description", "Independent school discovery and entrance exam preparation platform for India.");
        // How information is chosen, checked and corrected (the editorial policy page links the corrections policy).
        data.put("publishingPrinciples", baseUrl + "/editorial-policy");
        data.put("contactPoint", Map.of("@type", "ContactPoint", "contactType", "customer support", "url", baseUrl + "/contact"));
        return data;
    }

    /** The site as the publisher of a page: the same @id as the home page's Organization, with its name, address and logo. */
    static Map<String, Object> publisher(String baseUrl) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@type", "Organization");
        data.put("@id", baseUrl + "/#organization");
        data.put("name", SITE);
        data.put("url", baseUrl + "/");
        data.put("logo", baseUrl + "/favicon.svg");
        return data;
    }

    private static Map<String, Object> website(String baseUrl) {
        Map<String, Object> search = new LinkedHashMap<>();
        search.put("@type", "SearchAction");
        search.put("target", baseUrl + "/schools?q={search_term_string}");
        search.put("query-input", "required name=search_term_string");
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "WebSite");
        data.put("@id", baseUrl + "/#website");
        data.put("name", SITE);
        data.put("alternateName", ALTERNATE_NAMES);
        data.put("url", baseUrl + "/");
        data.put("inLanguage", "en-IN");
        data.put("publisher", Map.of("@id", baseUrl + "/#organization"));
        data.put("potentialAction", search);
        return data;
    }

    private String tags(String title, String description, String canonical, String image, boolean noindex,
                        Object jsonLd) {
        title = fitTitle(title);
        description = fitDescription(description);
        StringBuilder h = new StringBuilder();
        h.append("<title>").append(html(title)).append("</title>\n");
        h.append(meta("name", "description", description));
        if (noindex) {
            h.append(meta("name", "robots", "noindex"));
        }
        if (canonical != null) {
            h.append("<link rel=\"canonical\" href=\"").append(html(canonical)).append("\" />\n");
            h.append(meta("property", "og:url", canonical));
        }
        h.append(meta("property", "og:site_name", SITE));
        h.append(meta("property", "og:title", title.replace(" | " + SITE, "")));
        h.append(meta("property", "og:description", description));
        h.append(meta("property", "og:type", "website"));
        if (image != null) {
            h.append(meta("property", "og:image", image));
        }
        if (jsonLd != null) {
            try {
                // "<" is escaped so a value can never close the script element.
                String json = objectMapper.writeValueAsString(jsonLd).replace("<", "\\u003c");
                h.append("<script type=\"application/ld+json\" data-seo=\"server\">").append(json).append("</script>\n");
            } catch (JsonProcessingException e) {
                throw new IllegalStateException(e);
            }
        }
        return h.toString();
    }

    private static String meta(String attribute, String key, String content) {
        return "<meta " + attribute + "=\"" + key + "\" content=\"" + html(content) + "\" data-seo=\"server\" />\n";
    }

    private static void putIfPresent(Map<String, Object> map, String key, Object value) {
        if (value != null && !(value instanceof String str && str.isBlank())) {
            map.put(key, value);
        }
    }

    static String html(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
