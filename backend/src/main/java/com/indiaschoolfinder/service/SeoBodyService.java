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
    /** Fixed pages under /exams that are not an exam. */
    private static final Set<String> EXAM_PAGES = Set.of("practice", "finder", "calendar", "syllabus", "resources",
            "leaderboard", "achievements", "challenges", "guide");
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

    public SeoBodyService(SeoHeadService seoHeadService, SchoolService schoolService, LocationService locationService,
                          SchoolFaqService faqService, UpdateFeedService updateFeed, RankingCatalogService rankings,
                          PremierDirectoryService directory, BlogService blogService, ExamService examService,
                          com.indiaschoolfinder.repository.PracticeSetRepository practiceSets, PlaceSummaryService placeSummary) {
        this.placeSummary = placeSummary;
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
                main = school(schoolService.getActiveBySlug(m.group(1)), description);
            } else if ((m = CITY.matcher(p)).matches()) {
                main = city(m.group(1), m.group(2), heading, description);
            } else if ((m = STATE.matcher(p)).matches()) {
                main = state(m.group(1), m.group(2), heading, description);
            } else if ((m = BLOG_POST.matcher(p)).matches()) {
                main = blogPost(blogService.published(m.group(1)));
            } else if ((m = EXAM_GUIDE.matcher(p)).matches()) {
                main = exam(examService.get(m.group(1)), heading, description, false);
            } else if ((m = EXAM.matcher(p)).matches() && !EXAM_PAGES.contains(m.group(1))) {
                main = exam(examService.get(m.group(1)), heading, description, SeoHeadService.PREP_PAGES.contains(m.group(1)));
            } else if (p.equals("/updates")) {
                main = updates(heading, description);
            } else if ((m = DIRECTORY_VIEW.matcher(p)).matches() && isDirectoryView(m.group(1))) {
                main = directoryView(m.group(1), heading, description);
            } else if ((m = SeoHeadService.NETWORK.matcher(p)).matches() && NETWORKS.containsKey(m.group(1))) {
                main = network(m.group(1), heading, description);
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
        h.append("</div>");
        return h.toString();
    }

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
            String href = u.linkPath() != null ? u.linkPath() : u.sourceUrl();
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

    private String school(SchoolDetailDto s, String description) {
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
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
        h.append("<dl class=\"pr-facts\">");
        if (s.board() != null) {
            fact(h, "Board", "CISCE".equals(s.board().code()) ? "ICSE/ISC (CISCE)" : s.board().name());
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
        h.append("</dl>");
        List<SchoolFaqService.Faq> faqs = faqService.faqs(s);
        if (!faqs.isEmpty()) {
            h.append("<h2>Quick answers</h2><dl class=\"pr-faq\">");
            for (SchoolFaqService.Faq f : faqs) {
                h.append("<dt>").append(esc(f.question())).append("</dt><dd>").append(esc(f.answer())).append("</dd>");
            }
            h.append("</dl>");
        }
        otherSchools(h, s);
        return h.toString();
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
        h.append("</nav><h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
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
        CityDto city = locationService.cities(state.code()).stream().filter(c -> c.slug().equals(citySlug)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("City", citySlug));
        StringBuilder h = new StringBuilder();
        h.append("<nav class=\"pr-crumbs\" aria-label=\"Breadcrumb\"><a href=\"/states\">States</a> › <a href=\"/states/")
                .append(state.slug()).append("\">").append(esc(state.name())).append("</a></nav>");
        h.append("<h1>").append(heading).append("</h1>");
        if (description != null) {
            h.append("<p class=\"pr-lead\">").append(description).append("</p>");
        }
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
        List<UpdateDtos.UpdateItem> items = updateFeed.feed(null, 0, 40).content();
        if (!items.isEmpty()) {
            h.append("<ul class=\"pr-list\">");
            for (UpdateDtos.UpdateItem u : items) {
                String href = u.linkPath() != null ? u.linkPath() : u.sourceUrl();
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
                }
                h.append("</li>");
            }
            h.append("</ul>");
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
                        .forEach(b -> about.add("CISCE".equals(b.code()) ? "ICSE/ISC" : b.code()));
                if (!about.isEmpty()) {
                    h.append(" <span>").append(esc(String.join(" · ", about))).append("</span>");
                }
                h.append("</li>");
            }
            h.append("</ul>");
        }
        return h.toString();
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
                about.add("CISCE".equals(s.boardCode()) ? "ICSE/ISC" : s.boardCode());
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

    private static String first(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static String esc(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }
}
