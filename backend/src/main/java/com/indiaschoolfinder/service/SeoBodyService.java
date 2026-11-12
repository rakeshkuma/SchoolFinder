package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
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
    private static final Pattern TITLE = Pattern.compile("<title>(.*?)</title>", Pattern.DOTALL);
    private static final Pattern DESCRIPTION = Pattern.compile("<meta name=\"description\" content=\"(.*?)\"", Pattern.DOTALL);
    private static final int LIST_SIZE = 40;

    /** The five sections of the site, as in the app's main navigation. */
    private static final String[][] PILLARS = {
            {"/schools", "Find Schools"}, {"/boarding", "Boarding Schools"}, {"/compare", "Compare"},
            {"/admissions", "Admissions &amp; Fees"}, {"/exams", "Exam Prep"},
    };

    private final SeoHeadService seoHeadService;
    private final SchoolService schoolService;
    private final LocationService locationService;
    private final SchoolFaqService faqService;

    public SeoBodyService(SeoHeadService seoHeadService, SchoolService schoolService, LocationService locationService,
                          SchoolFaqService faqService) {
        this.seoHeadService = seoHeadService;
        this.schoolService = schoolService;
        this.locationService = locationService;
        this.faqService = faqService;
    }

    /** @param path the page path as requested (any query string is ignored) */
    public String body(String path, String baseUrl) {
        String p = path == null ? "/" : path.split("[?#]", 2)[0];
        if (p.length() > 1 && p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        String head = seoHeadService.head(p, baseUrl);
        if (head.contains("name=\"robots\" content=\"noindex\"")) {
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
            } else if ((m = SCHOOL.matcher(p)).matches()) {
                main = school(schoolService.getActiveBySlug(m.group(1)), description);
            } else if ((m = CITY.matcher(p)).matches()) {
                main = city(m.group(1), m.group(2), heading, description);
            } else if ((m = STATE.matcher(p)).matches()) {
                main = state(m.group(1), m.group(2), heading, description);
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
                .append("<img src=\"/favicon.svg\" alt=\"\" width=\"36\" height=\"36\" />SchoolDhundo</a><nav class=\"pr-nav\" aria-label=\"Main\">");
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
        h.append("<h1>Find the Right School. Build a Brighter Future.</h1>");
        h.append("<p class=\"pr-lead\">Discover, compare and explore thousands of schools across India. Get school rankings, ")
                .append("admission information, boarding school details and exam preparation resources in one place.</p>");
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
                .append(link("/fees", "School fee calculator"))
                .append(link("/exams/jnvst", "JNVST Class 6 preparation"))
                .append(link("/exams/aissee", "AISSEE Sainik School preparation"))
                .append(link("/exams/practice", "Mock tests and daily quiz"))
                .append(link("/blog", "Guides for parents"))
                .append("</ul>");
        return h.toString();
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
        return h.toString();
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
        schools(h, criteria(state.code(), null, city.name()), "Schools in " + city.name());
        return h.toString();
    }

    private void schools(StringBuilder h, SchoolSearchCriteria criteria, String heading) {
        PageResponse<SchoolSummaryDto> page = schoolService.search(criteria);
        if (page.content().isEmpty()) {
            return;
        }
        h.append("<h2>").append(esc(heading)).append("</h2><ul class=\"pr-list\">");
        for (SchoolSummaryDto s : page.content()) {
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
        return new SchoolSearchCriteria(null, null, null, state, district, city, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                null, "recommended", null, 0, LIST_SIZE);
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
