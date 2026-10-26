package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.exam.ExamDetailDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
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
import java.util.LinkedHashSet;
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

    public static final String SITE = "India School Finder";
    static final String DEFAULT_TITLE = "India School Finder — Discover Schools. Compare Fees. Prepare for Success.";
    static final String DEFAULT_DESCRIPTION = "Discover schools across India, compare official fees and track admission "
            + "deadlines — every fact linked to its official source.";

    private static final Pattern SCHOOL = Pattern.compile("^/schools/([a-z0-9-]+)/?$");
    private static final Pattern STATE = Pattern.compile("^/states/([a-z0-9-]+)(?:/([a-z0-9-]+))?/?$");
    private static final Pattern BOARD = Pattern.compile("^/boards/([A-Za-z0-9-]+)/?$");
    private static final Pattern EXAM = Pattern.compile("^/exams/([a-z0-9-]+)/?$");
    private static final Pattern EXAM_CLASS = Pattern.compile("^/exams/class/(\\d{1,2})/?$");
    private static final Pattern EXAM_STATE = Pattern.compile("^/exams/state/([a-z0-9-]+)/?$");
    private static final String[] ROMAN = {"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"};
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    /** The Disallow lines of robots.txt (SitemapController), plus the update form, which is not content to index. */
    private static final Set<String> PRIVATE = Set.of("/admin", "/saved", "/suggest", "/account", "/signin", "/register",
            "/verify-email", "/forgot-password", "/reset-password");
    /** Static pages with their own title; the rest of the app uses the site defaults. */
    private static final Map<String, String[]> PAGES = Map.ofEntries(
            page("/find", "Find the right school for your child", "Choose your area, your child's class, "
                    + "budget, board and must-have facilities. See schools whose official sources confirm each one, and why."),
            page("/compare", "Compare schools side by side", "Compare up to four schools: board, classes, "
                    + "official fees, admissions, facilities and distance from home, and share the comparison."),
            page("/schools", "School directory", "Search and filter schools across Indian states and union "
                    + "territories by board, type, classes, fees and location — every fact linked to its source."),
            page("/states", "Schools by state and union territory", "Browse schools in every Indian state and "
                    + "union territory, with district-wise lists and source-linked profiles."),
            page("/rankings", "School rankings and methodology", "Evidence-based school scores from verified "
                    + "data only, with the full methodology. Not an official government ranking."),
            page("/admissions", "School admissions calendar", "Upcoming and open school admission cycles, "
                    + "each linked to the school's official notice."),
            page("/fees", "School fee calculator", "Estimate first-year and annual school costs from "
                    + "official fee schedules, with every component shown."),
            page("/nearby", "Schools near you", "Find schools near any location in India on a map."),
            page("/boarding", "Boarding and residential schools", "Residential schools across India — "
                    + "Navodaya, Sainik, military and private boarding schools — with entry classes and exams."),
            page("/exams", "School entrance exams in India", "JNVST, AISSEE, RIMC, RMS CET and state entrance "
                    + "exams: eligibility, confirmed dates, exam pattern, syllabus and official papers, each linked to the "
                    + "conducting body's notice."),
            page("/exams/finder", "Which entrance exams can my child take?", "Answer up to four questions — class, "
                    + "state, school type, boarding — to see which school entrance exams may fit and why, with the "
                    + "eligibility rules to confirm in each official notice."),
            page("/exams/practice", "Free practice tests for school entrance exams", "Original practice quizzes and "
                    + "timed mock tests for JNVST, AISSEE and JNV Class IX entry, with answers explained — written by India "
                    + "School Finder, not official questions."),
            page("/exams/syllabus", "Exam pattern and syllabus of school entrance exams", "Subjects, questions, marks, "
                    + "duration, format and language of JNVST, AISSEE, RIMC, JNV lateral entry and state entrance exams, from "
                    + "each conducting body's official notice."),
            page("/exams/calendar", "School entrance exam calendar", "Application deadlines, admit cards and exam dates "
                    + "for JNVST, AISSEE, RIMC and other school entrance exams, month by month, from official notices."));

    /** Paths under /exams that are pages, not exam slugs; the exam import rejects them as slugs. */
    public static final Set<String> RESERVED_EXAM_SLUGS = Set.of("finder", "calendar", "practice", "syllabus", "class", "state");

    private static Map.Entry<String, String[]> page(String path, String title, String description) {
        return Map.entry(path, new String[]{title, description});
    }

    private final SchoolService schoolService;
    private final LocationService locationService;
    private final EducationBoardRepository boardRepository;
    private final SchoolRepository schoolRepository;
    private final ExamService examService;
    private final ObjectMapper objectMapper;

    public SeoHeadService(SchoolService schoolService, LocationService locationService,
                          EducationBoardRepository boardRepository, SchoolRepository schoolRepository,
                          ExamService examService, ObjectMapper objectMapper) {
        this.examService = examService;
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
            String description = p.equals("/schools")
                    ? "%,d schools across India. ".formatted(schoolRepository.countByActiveTrue()) + page[1] : page[1];
            return tags(page[0] + " | " + SITE, description, baseUrl + p, null, false, null);
        }
        try {
            Matcher m;
            if ((m = SCHOOL.matcher(p)).matches()) {
                return school(schoolService.getActiveBySlug(m.group(1)), baseUrl);
            }
            if ((m = STATE.matcher(p)).matches()) {
                return state(m.group(1), m.group(2), baseUrl);
            }
            if ((m = BOARD.matcher(p)).matches()) {
                return board(m.group(1), baseUrl);
            }
            if ((m = EXAM.matcher(p)).matches()) {
                return exam(examService.get(m.group(1)), baseUrl);
            }
            if ((m = EXAM_CLASS.matcher(p)).matches()) {
                return examClass(Integer.parseInt(m.group(1)), baseUrl);
            }
            if ((m = EXAM_STATE.matcher(p)).matches()) {
                return examState(m.group(1), baseUrl);
            }
        } catch (ResourceNotFoundException e) {
            return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, null, null, true, null);
        }
        return tags(DEFAULT_TITLE, DEFAULT_DESCRIPTION, p.equals("/") ? baseUrl + "/" : null, null, false, null);
    }

    private String school(SchoolDetailDto s, String baseUrl) {
        Set<String> placeParts = new LinkedHashSet<>();
        for (String part : new String[]{s.locality(), s.city(), s.district() == null ? null : s.district().name(), s.stateName()}) {
            if (part != null && !part.isBlank()) {
                placeParts.add(part.trim());
            }
        }
        String place = String.join(", ", placeParts);
        String town = s.city() != null ? s.city() : s.district() != null ? s.district().name() : s.stateName();
        String title = s.name() + (town != null && !s.name().contains(town) ? ", " + town : "") + " | " + SITE;
        String board = s.board() == null ? null : "CISCE".equals(s.board().code()) ? "ICSE/ISC" : s.board().code();
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
        description.append(" Official fees, admissions, facilities and sources on ").append(SITE).append('.');

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
        data.put("name", s.name());
        data.put("url", url);
        data.put("address", address);
        putIfPresent(data, "sameAs", s.websiteUrl());
        putIfPresent(data, "telephone", s.phone() == null ? null : s.phone().split(",")[0].trim());
        putIfPresent(data, "email", s.email());
        putIfPresent(data, "foundingDate", s.establishedYear() == null ? null : String.valueOf(s.establishedYear()));
        putIfPresent(data, "image", image);
        if (s.latitude() != null && s.longitude() != null) {
            data.put("geo", Map.of("@type", "GeoCoordinates", "latitude", s.latitude(), "longitude", s.longitude()));
        }
        return tags(title, description.toString(), url, image, false, data);
    }

    private String state(String stateSlug, String districtSlug, String baseUrl) {
        StateDto state = locationService.state(stateSlug);
        if (!state.slug().equals(stateSlug)) {
            throw new ResourceNotFoundException("State", stateSlug); // codes ("UP") are not the canonical address
        }
        if (districtSlug == null) {
            String title = "Schools in " + state.name() + " | " + SITE;
            String description = "%,d schools in %s, by district, with board, classes, fees and admissions linked to "
                    .formatted(state.schoolCount(), state.name()) + "official sources.";
            return tags(title, description, baseUrl + "/states/" + state.slug(), null, state.schoolCount() == 0, null);
        }
        DistrictDto district = locationService.districts(state.code()).stream()
                .filter(d -> d.slug().equals(districtSlug)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("District", districtSlug));
        String title = "Schools in " + district.name() + ", " + state.name() + " | " + SITE;
        String description = "%,d schools in %s district, %s, with board, classes, fees and admissions linked to "
                .formatted(district.schoolCount(), district.name(), state.name()) + "official sources.";
        return tags(title, description, baseUrl + "/states/" + state.slug() + "/" + district.slug(), null,
                district.schoolCount() == 0, null);
    }

    private String board(String code, String baseUrl) {
        var board = boardRepository.findByCodeIgnoreCase(code).orElseThrow(() -> new ResourceNotFoundException("Board", code));
        String label = "CISCE".equals(board.getCode()) ? "ICSE/ISC (CISCE)" : board.getCode();
        String title = label + " schools in India | " + SITE;
        String description = "Schools affiliated to " + board.getName() + ", with classes, fees and admissions linked to "
                + "official sources.";
        // The site links board pages by their upper-case code (/boards/CBSE), so that is the canonical address.
        return tags(title, description, baseUrl + "/boards/" + board.getCode(), null, false, null);
    }

    /** Exam guide: the description states only confirmed dates; otherwise that the notice is awaited. */
    private String exam(ExamDetailDto detail, String baseUrl) {
        ExamSummaryDto e = detail.exam();
        String title = e.shortName() + ": eligibility, dates, pattern and syllabus | " + SITE;
        StringBuilder description = new StringBuilder(e.name()).append(", conducted by ").append(e.conductingAuthority())
                .append('.');
        if (e.examDate() != null) {
            description.append(' ').append(e.currentCycle()).append(" exam date: ").append(DAY.format(e.examDate()))
                    .append(" (official notice).");
        } else if (e.status() == ExamStatus.AWAITING_NOTIFICATION) {
            description.append(' ').append(e.currentCycle()).append(" dates not announced yet.");
        }
        description.append(" Eligibility, pattern, syllabus and official papers.");
        String url = baseUrl + "/exams/" + e.slug();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org");
        data.put("@type", "BreadcrumbList");
        data.put("itemListElement", java.util.List.of(
                Map.of("@type", "ListItem", "position", 1, "name", "Home", "item", baseUrl + "/"),
                Map.of("@type", "ListItem", "position", 2, "name", "Entrance exams", "item", baseUrl + "/exams"),
                Map.of("@type", "ListItem", "position", 3, "name", e.shortName(), "item", url)));
        return tags(title, description.toString(), url, null, false, data);
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
        String label = "Class " + ROMAN[n];
        String names = exams.stream().map(ExamSummaryDto::shortName).collect(Collectors.joining(", "));
        // A class reached only through admission processes (no entrance test) would just repeat those guides.
        boolean hasTest = exams.stream().anyMatch(e -> e.kind() == ExamKind.ENTRANCE_TEST);
        return tags("Entrance exams for " + label + " admission | " + SITE,
                names + " admit students to " + label + ". Eligibility, confirmed dates, pattern and syllabus from each "
                        + "official notice.", baseUrl + "/exams/class/" + n, null, !hasTest, null);
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

    private String tags(String title, String description, String canonical, String image, boolean noindex,
                        Map<String, Object> jsonLd) {
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
