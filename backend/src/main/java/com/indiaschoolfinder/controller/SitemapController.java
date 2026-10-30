package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.entity.Exam;
import com.indiaschoolfinder.repository.ExamRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.LocationService;
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
 * robots.txt and an XML sitemap index for search engines: public pages, states and districts with schools, published
 * exam guides, and every
 * active school profile (40,000 per file, below the 50,000-URL protocol limit).
 */
@Hidden
@RestController
@Transactional(readOnly = true)
public class SitemapController {

    static final int SCHOOLS_PER_FILE = 40_000;
    private static final List<String> PAGES = List.of("/", "/find", "/schools", "/states", "/cities", "/rankings", "/rankings/methodology",
            "/admissions", "/admissions/guide", "/admissions/notifications", "/fees", "/compare", "/nearby", "/boarding", "/boarding/india", "/boarding/government", "/boarding/private", "/boarding/boys",
            "/boarding/girls", "/boarding/co-ed", "/boarding/affordable", "/rankings/published", "/rankings/compare", "/exams", "/exams/finder", "/exams/calendar", "/exams/practice", "/exams/syllabus", "/exams/resources", "/reviews", "/about", "/contact",
            "/privacy", "/terms", "/disclaimer");
    private static final MediaType XML = MediaType.parseMediaType("application/xml;charset=UTF-8");
    private static final CacheControl CACHE = CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic();

    private final SchoolRepository schoolRepository;
    private final ExamRepository examRepository;
    private final LocationService locationService;
    private final AppProperties properties;
    private final com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository;

    public SitemapController(SchoolRepository schoolRepository, ExamRepository examRepository, LocationService locationService,
                             AppProperties properties, com.indiaschoolfinder.repository.PracticeSetRepository practiceSetRepository) {
        this.practiceSetRepository = practiceSetRepository;
        this.schoolRepository = schoolRepository;
        this.examRepository = examRepository;
        this.locationService = locationService;
        this.properties = properties;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robots(HttpServletRequest request) {
        String body = """
                User-agent: *
                Allow: /
                Disallow: /admin
                Disallow: /api/
                Disallow: /saved
                Disallow: /suggest
                Disallow: /account
                Disallow: /signin
                Disallow: /register
                Disallow: /verify-email
                Disallow: /forgot-password
                Disallow: /reset-password
                Disallow: /exams/practice/progress
                Disallow: /exams/practice/attempts
                Disallow: /exams/practice/session

                Sitemap: %s/sitemap.xml
                """.formatted(base(request));
        return ResponseEntity.ok().cacheControl(CACHE).contentType(MediaType.TEXT_PLAIN).body(body);
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> index(HttpServletRequest request) {
        String base = base(request);
        long files = Math.max(1, (schoolRepository.countByActiveTrue() + SCHOOLS_PER_FILE - 1) / SCHOOLS_PER_FILE);
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        xml.append("  <sitemap><loc>").append(escape(base + "/sitemaps/pages.xml")).append("</loc></sitemap>\n");
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
        for (StateDto state : locationService.states()) {
            if (state.schoolCount() > 0) {
                url(xml, base + "/states/" + state.slug(), null);
                for (CityDto city : locationService.cities(state.code())) {
                    url(xml, base + "/states/" + state.slug() + "/city/" + city.slug(), null);
                }
            }
        }
        for (Object[] row : schoolRepository.districtsWithSchools()) {
            url(xml, base + "/states/" + row[0] + "/" + row[1], null);
        }
        for (String board : schoolRepository.boardCodesWithSchools()) {
            if (!"OTHER".equals(board)) { // "Other / multiple curricula" is not a meaningful directory page
                url(xml, base + "/boards/" + board, null);
            }
        }
        List<Exam> exams = examRepository.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc();
        for (Exam exam : exams) {
            url(xml, base + "/exams/" + exam.getSlug(), exam.getUpdatedAt());
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
        for (var set : practiceSetRepository.findByPublishedTrueOrderByDisplayOrderAscTitleAsc()) {
            url(xml, base + "/exams/practice/" + set.getSlug(), set.getUpdatedAt());
        }
        return xml(xml.append("</urlset>\n"));
    }

    @GetMapping("/sitemaps/schools-{n}.xml")
    public ResponseEntity<String> schools(@PathVariable int n, HttpServletRequest request) {
        if (n < 1) {
            throw new ResourceNotFoundException("Sitemap", n);
        }
        List<Object[]> rows = schoolRepository.findActiveSlugs(PageRequest.of(n - 1, SCHOOLS_PER_FILE));
        if (rows.isEmpty() && n > 1) {
            throw new ResourceNotFoundException("Sitemap", n);
        }
        String base = base(request);
        StringBuilder xml = urlset();
        for (Object[] row : rows) {
            url(xml, base + "/schools/" + row[0], (Instant) row[1]);
        }
        return xml(xml.append("</urlset>\n"));
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
