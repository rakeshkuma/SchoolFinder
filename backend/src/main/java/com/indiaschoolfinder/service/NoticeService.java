package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.notice.NoticeDtos;
import com.indiaschoolfinder.dto.notice.NoticeDtos.Answer;
import com.indiaschoolfinder.dto.notice.NoticeDtos.Facet;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.entity.SiteUpdatePosition;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.notifications.opportunity.ApplicationStatus;
import com.indiaschoolfinder.notifications.opportunity.OpportunityClassifier;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SiteUpdatePositionRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import com.indiaschoolfinder.repository.StateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Admission and job notices for the public site: the Jobs list with its filters, and each notice's own page. Only
 * published notices are listed (and, under "past", those that expired in the last 90 days); a notice's page stays
 * reachable after it expires, marked closed and kept out of search engines. Every fact shown is one the official
 * source stated or an editor entered from it; questions are answered only from those facts.
 */
@Service
@Transactional(readOnly = true)
public class NoticeService {

    static final int PAST_DAYS = 90;
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d MMMM yyyy, h:mm a", Locale.ENGLISH);

    /** Filters of the lists; each null means "any". */
    public record Filter(String state, String sector, String staff, String post, String subject, String status, String classes,
                         String session, String q) {
        public static final Filter NONE = new Filter(null, null, null, null, null, null, null, null, null);
    }

    private final SiteUpdateRepository updates;
    private final SiteUpdatePositionRepository positions;
    private final SchoolRepository schools;
    private final StateRepository states;
    private final UpdateFeedService feed;
    private final Clock clock;

    public NoticeService(SiteUpdateRepository updates, SiteUpdatePositionRepository positions, SchoolRepository schools,
                         StateRepository states, UpdateFeedService feed, Clock clock) {
        this.updates = updates;
        this.positions = positions;
        this.schools = schools;
        this.states = states;
        this.feed = feed;
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(INDIA));
    }

    // --- lists ---------------------------------------------------------------------------------------------------

    public NoticeDtos.NoticeList list(SiteUpdate.Category category, Filter filter, boolean past, int page, int size) {
        LocalDate today = today();
        List<SiteUpdate> rows = past ? pastRows(category, today) : currentRows(category, today);
        Map<String, String> stateNames = stateNames();
        NoticeDtos.Facets facets = facets(rows, today, stateNames);
        List<SiteUpdate> matching = rows.stream().filter(u -> matches(u, filter == null ? Filter.NONE : filter, today)).toList();
        List<UpdateDtos.UpdateItem> items;
        if (past) {
            items = matching.stream().sorted(Comparator.comparing(SiteUpdate::getExpiresOn, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(SiteUpdate::getId, Comparator.reverseOrder())).map(u -> feed.stored(u, today, true)).toList();
        } else {
            items = matching.stream().map(u -> new UpdateFeedService.Ranked(feed.stored(u, today, false), u.getPriority()))
                    .sorted(UpdateFeedService.OPPORTUNITY_ORDER).map(UpdateFeedService.Ranked::item).toList();
        }
        int from = Math.min(page * size, items.size());
        int to = Math.min(from + size, items.size());
        int totalPages = (items.size() + size - 1) / size;
        PageResponse<UpdateDtos.UpdateItem> body = new PageResponse<>(items.subList(from, to), page, size, items.size(), totalPages,
                page == 0, page >= totalPages - 1);
        return new NoticeDtos.NoticeList(category, body, facets, rows.size());
    }

    private List<SiteUpdate> currentRows(SiteUpdate.Category category, LocalDate today) {
        return updates.findByCategoryAndStatusIn(category, List.of(SiteUpdate.Status.PUBLISHED)).stream()
                .filter(u -> UpdateFeedService.current(u, today)).toList();
    }

    private List<SiteUpdate> pastRows(SiteUpdate.Category category, LocalDate today) {
        LocalDate since = today.minusDays(PAST_DAYS);
        return updates.findByCategoryAndStatusIn(category, List.of(SiteUpdate.Status.EXPIRED)).stream()
                .filter(u -> u.getExpiresOn() != null && !u.getExpiresOn().isBefore(since)).toList();
    }

    static boolean matches(SiteUpdate u, Filter f, LocalDate today) {
        if (f.state() != null && !f.state().isBlank()) {
            boolean india = "IN".equalsIgnoreCase(f.state());
            if (india ? u.getStateCode() != null : !f.state().equalsIgnoreCase(u.getStateCode())) return false;
        }
        if (f.sector() != null && !f.sector().isBlank()) {
            switch (f.sector().toUpperCase(Locale.ROOT)) {
                case "BOARDING" -> { if (!Boolean.TRUE.equals(u.getBoarding())) return false; }
                case "GOVERNMENT" -> { if (u.getSector() != SiteUpdate.Sector.GOVERNMENT) return false; }
                case "PRIVATE" -> { if (u.getSector() != SiteUpdate.Sector.PRIVATE) return false; }
                default -> { return false; }
            }
        }
        if (f.staff() != null && !f.staff().isBlank()) {
            SiteUpdate.StaffKind k = u.getStaffKind();
            boolean ok = switch (f.staff().toUpperCase(Locale.ROOT)) {
                case "TEACHING" -> k == SiteUpdate.StaffKind.TEACHING || k == SiteUpdate.StaffKind.MIXED;
                case "NON_TEACHING" -> k == SiteUpdate.StaffKind.NON_TEACHING || k == SiteUpdate.StaffKind.MIXED;
                default -> false;
            };
            if (!ok) return false;
        }
        if (f.post() != null && !f.post().isBlank() && !list(u.getPostTypes()).contains(f.post().toUpperCase(Locale.ROOT))) return false;
        if (f.subject() != null && !f.subject().isBlank()
                && list(u.getSubjects()).stream().noneMatch(s -> s.equalsIgnoreCase(f.subject()))) return false;
        if (f.classes() != null && !f.classes().isBlank()
                && Arrays.stream(String.valueOf(u.getClasses()).split(",\\s*")).noneMatch(c -> c.equalsIgnoreCase(f.classes()))) return false;
        if (f.session() != null && !f.session().isBlank() && !f.session().equals(u.getAcademicSession())) return false;
        if (f.status() != null && !f.status().isBlank() && !statusMatches(f.status(), u, today)) return false;
        if (f.q() != null && !f.q().isBlank()) {
            String q = f.q().toLowerCase(Locale.ROOT).trim();
            String hay = (u.getTitle() + " " + Objects.toString(u.getInstitutionName(), "") + " " + Objects.toString(u.getCity(), "") + " "
                    + Objects.toString(u.getSubjects(), "")).toLowerCase(Locale.ROOT);
            if (!hay.contains(q)) return false;
        }
        return true;
    }

    /** OPEN (open or closing soon), CLOSING_SOON, OPENING_SOON, DATE_NOT_ANNOUNCED, or UPDATES (results, admit cards...). */
    private static boolean statusMatches(String status, SiteUpdate u, LocalDate today) {
        ApplicationStatus s = ApplicationStatus.of(u, today);
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "OPEN" -> s == ApplicationStatus.OPEN || s == ApplicationStatus.CLOSING_SOON;
            case "CLOSING_SOON" -> s == ApplicationStatus.CLOSING_SOON;
            case "OPENING_SOON" -> s == ApplicationStatus.OPENING_SOON;
            case "DATE_NOT_ANNOUNCED" -> s == ApplicationStatus.DATE_NOT_ANNOUNCED;
            case "UPDATES" -> s == null;
            default -> false;
        };
    }

    private NoticeDtos.Facets facets(List<SiteUpdate> rows, LocalDate today, Map<String, String> stateNames) {
        List<Facet> statesFacet = count(rows, u -> List.of(u.getStateCode() == null ? "IN" : u.getStateCode()),
                code -> "IN".equals(code) ? "All India" : stateNames.getOrDefault(code, code));
        statesFacet = statesFacet.stream().sorted(Comparator.comparing(Facet::label)).toList();
        List<Facet> sectors = new ArrayList<>();
        long gov = rows.stream().filter(u -> u.getSector() == SiteUpdate.Sector.GOVERNMENT).count();
        long pvt = rows.stream().filter(u -> u.getSector() == SiteUpdate.Sector.PRIVATE).count();
        long boarding = rows.stream().filter(u -> Boolean.TRUE.equals(u.getBoarding())).count();
        if (gov > 0) sectors.add(new Facet("GOVERNMENT", "Government", gov));
        if (pvt > 0) sectors.add(new Facet("PRIVATE", "Private", pvt));
        if (boarding > 0) sectors.add(new Facet("BOARDING", "Boarding / residential", boarding));
        List<Facet> staff = new ArrayList<>();
        long teaching = rows.stream().filter(u -> u.getStaffKind() == SiteUpdate.StaffKind.TEACHING || u.getStaffKind() == SiteUpdate.StaffKind.MIXED).count();
        long nonTeaching = rows.stream().filter(u -> u.getStaffKind() == SiteUpdate.StaffKind.NON_TEACHING || u.getStaffKind() == SiteUpdate.StaffKind.MIXED).count();
        if (teaching > 0) staff.add(new Facet("TEACHING", "Teaching", teaching));
        if (nonTeaching > 0) staff.add(new Facet("NON_TEACHING", "Non-teaching", nonTeaching));
        Map<String, String> postOrder = OpportunityClassifier.postLabels();
        List<Facet> posts = count(rows, u -> list(u.getPostTypes()), OpportunityClassifier::postLabel).stream()
                .sorted(Comparator.comparingInt(f -> new ArrayList<>(postOrder.keySet()).indexOf(f.value()))).toList();
        List<Facet> subjects = count(rows, u -> list(u.getSubjects()), Function.identity()).stream()
                .sorted(Comparator.comparing(Facet::label)).toList();
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (String s : List.of("OPEN", "CLOSING_SOON", "OPENING_SOON", "DATE_NOT_ANNOUNCED", "UPDATES")) {
            long n = rows.stream().filter(u -> statusMatches(s, u, today)).count();
            if (n > 0) byStatus.put(s, n);
        }
        SiteUpdate.Category category = rows.isEmpty() ? SiteUpdate.Category.JOB : rows.get(0).getCategory();
        List<Facet> statuses = byStatus.entrySet().stream().map(e -> new Facet(e.getKey(), statusLabel(e.getKey(), category), e.getValue())).toList();
        List<Facet> classes = count(rows, u -> u.getClasses() == null ? List.of() : Arrays.asList(u.getClasses().split(",\\s*")),
                c -> c.contains("/") ? c : "Class " + c);
        List<Facet> sessions = count(rows, u -> u.getAcademicSession() == null ? List.of() : List.of(u.getAcademicSession()), Function.identity());
        return new NoticeDtos.Facets(statesFacet, sectors, staff, posts, subjects, statuses, classes, sessions);
    }

    private static String statusLabel(String s, SiteUpdate.Category category) {
        return switch (s) {
            case "OPEN" -> category == SiteUpdate.Category.JOB ? "Apply now" : "Applications open";
            case "CLOSING_SOON" -> "Closing soon";
            case "OPENING_SOON" -> category == SiteUpdate.Category.JOB ? "Upcoming" : "Opening soon";
            case "DATE_NOT_ANNOUNCED" -> "Last date not announced";
            default -> "Results, admit cards and schedules";
        };
    }

    private static List<Facet> count(List<SiteUpdate> rows, Function<SiteUpdate, List<String>> values, Function<String, String> label) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (SiteUpdate u : rows) {
            for (String v : values.apply(u)) {
                if (v != null && !v.isBlank()) counts.merge(v, 1L, Long::sum);
            }
        }
        return counts.entrySet().stream().map(e -> new Facet(e.getKey(), label.apply(e.getKey()), e.getValue())).toList();
    }

    static List<String> list(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    // --- one notice ----------------------------------------------------------------------------------------------

    /** A notice's page: published, or expired (then marked closed). Anything else is "not found". */
    public NoticeDtos.NoticeDetail detail(String slug) {
        LocalDate today = today();
        SiteUpdate u = updates.findBySlug(slug).filter(x -> visible(x, today))
                .orElseThrow(() -> new ResourceNotFoundException("Notice", slug));
        return detail(u, today);
    }

    /** The notice behind a page address, if it may be shown (for the page heads; never throws). */
    public Optional<SiteUpdate> visibleNotice(String slug, SiteUpdate.Category category) {
        LocalDate today = today();
        return updates.findBySlug(slug).filter(u -> u.getCategory() == category && visible(u, today));
    }

    static boolean visible(SiteUpdate u, LocalDate today) {
        return u.isOpportunity() && !u.getPublishedOn().isAfter(today)
                && (u.getStatus() == SiteUpdate.Status.PUBLISHED || u.getStatus() == SiteUpdate.Status.EXPIRED);
    }

    /**
     * Whether search engines should index the page: a published, current opening (or extension) whose date the source
     * gave, with at least one fact beyond its title (a last date, posts, classes, the kind of staff, a number of posts
     * or eligibility). Results, admit cards and closed notices are useful to readers for a while but not as search
     * results, and pages with nothing but a title would be thin.
     */
    public static boolean indexable(SiteUpdate u, LocalDate today) {
        if (!u.isOpportunity() || u.getStatus() != SiteUpdate.Status.PUBLISHED || !u.isDateConfirmed() || !UpdateFeedService.current(u, today)) {
            return false;
        }
        SiteUpdate.NoticeType t = u.getNoticeType();
        if (t != null && t != SiteUpdate.NoticeType.OPENING && t != SiteUpdate.NoticeType.EXTENSION) {
            return false;
        }
        if (ApplicationStatus.of(u, today) == ApplicationStatus.CLOSED) {
            return false;
        }
        if (u.getCategory() == SiteUpdate.Category.JOB && !u.isStaffEdited()
                && OpportunityClassifier.nonSchoolOnly(u.getOfficialTitle() != null ? u.getOfficialTitle() : u.getTitle())) {
            return false; // a school system's notice for an engineer or a project post: readable here, not offered as a school job
        }
        return u.getClosesOn() != null || u.getPostTypes() != null || u.getClasses() != null || u.getStaffKind() != null
                || u.getVacancies() != null || u.getEligibility() != null;
    }

    public NoticeDtos.NoticeDetail detail(SiteUpdate u, LocalDate today) {
        return detail(u, today, true);
    }

    /** @param withRelated false for the page head, which does not list related notices */
    public NoticeDtos.NoticeDetail detail(SiteUpdate u, LocalDate today, boolean withRelated) {
        ApplicationStatus status = ApplicationStatus.of(u, today);
        List<UpdateDtos.PositionRow> posts = positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(u.getId()).stream()
                .map(SiteUpdateService::position).toList();
        NoticeDtos.SchoolLink school = null;
        if (u.getSchoolId() != null) {
            for (Object[] r : schools.findActiveLinks(List.of(u.getSchoolId()))) {
                school = new NoticeDtos.SchoolLink((String) r[1], (String) r[2], (String) r[3], (String) r[4]);
            }
        }
        State state = u.getStateCode() == null ? null : states.findByCode(u.getStateCode()).orElse(null);
        boolean current = u.getStatus() == SiteUpdate.Status.PUBLISHED && UpdateFeedService.current(u, today);
        NoticeDtos.Verification verification = u.getVerificationStatus() == VerificationStatus.VERIFIED ? NoticeDtos.Verification.EDITOR_VERIFIED
                : u.isOfficialSync() ? NoticeDtos.Verification.OFFICIAL_SOURCE : NoticeDtos.Verification.EDITORIAL;
        Instant verifiedAt = u.isOfficialSync() && u.getLastSeenAt() != null ? u.getLastSeenAt() : u.getUpdatedAt();
        // Posts only: kinds of staff ("Support Staff") are filters on the Jobs list, not post names.
        List<Facet> postTypes = list(u.getPostTypes()).stream().filter(OpportunityClassifier::namesAPost)
                .map(c -> new Facet(c, OpportunityClassifier.postLabel(c), 0)).toList();
        String examLabel = "Walk-in interview".equals(u.getEventLabel()) ? "Walk-in interview"
                : u.getCategory() == SiteUpdate.Category.JOB ? "Exam / interview date" : "Entrance exam date";
        String stateName = state == null ? null : state.getName();
        return new NoticeDtos.NoticeDetail(u.getId(), u.getSlug(), u.getCategory(), UpdateFeedService.noticePath(u), u.getTitle(),
                u.getOfficialTitle(), u.getSummary(), u.getInstitutionName(), u.getCampus(), school, u.getSector(), u.getBoarding(),
                u.getStateCode(), stateName, state == null ? null : state.getSlug(), u.getCity(), u.getNoticeType(),
                noticeTypeLabel(u.getCategory(), u.getNoticeType()), status, status == null ? null : status.label(u.getCategory()),
                u.getPublishedOn(), u.isDateConfirmed(), u.getOpensOn(), u.getClosesOn(), u.getExamOn(), examLabel,
                u.getAcademicSession(), u.getClasses(), postTypes, list(u.getSubjects()), u.getStaffKind(), u.getEmploymentType(),
                u.getVacancies(), u.getEligibility(), u.getExperience(), u.getTetRequirement(), u.getAgeLimit(), u.getSalaryText(),
                u.getApplicationFee(), u.getSelectionProcess(), u.getApplyUrl(), u.getSourceUrl(), u.getSourceName(), domain(u.getSourceUrl()),
                u.isOfficialSync() ? "Official source" : "Official source cited by an editor", verification, verifiedAt,
                u.isOfficialSync() ? u.getLastChangedAt() : u.getUpdatedAt(), current, indexable(u, today), posts,
                answers(u, status, stateName, school == null ? null : school.name(), posts, today, verifiedAt),
                withRelated ? related(u, today) : List.of());
    }

    static String noticeTypeLabel(SiteUpdate.Category category, SiteUpdate.NoticeType type) {
        if (type == null) {
            return category == SiteUpdate.Category.JOB ? "Job notice" : "Admission notice";
        }
        return switch (type) {
            case OPENING -> category == SiteUpdate.Category.JOB ? "Recruitment notice" : "Admission notice";
            case EXTENSION -> "Last date extended";
            case CORRIGENDUM -> "Corrigendum";
            case SCHEDULE -> category == SiteUpdate.Category.JOB ? "Test or interview schedule" : "Admission schedule";
            case ADMIT_CARD -> "Admit cards";
            case RESULT -> "Result or list";
            case OTHER -> "Notice";
        };
    }

    /** Other current notices: the same institution first, then the same state, then the most relevant. */
    private List<UpdateDtos.UpdateItem> related(SiteUpdate u, LocalDate today) {
        record Candidate(SiteUpdate row, UpdateDtos.UpdateItem item) {
        }
        Comparator<Candidate> near = Comparator
                .comparing((Candidate c) -> !(u.getInstitutionName() != null && u.getInstitutionName().equals(c.row().getInstitutionName())))
                .thenComparing(c -> !(u.getStateCode() != null && u.getStateCode().equals(c.row().getStateCode())))
                .thenComparingInt(c -> UpdateFeedService.tier(c.item()))
                .thenComparing(c -> c.row().getPublishedOn(), Comparator.reverseOrder());
        return currentRows(u.getCategory(), today).stream().filter(x -> !x.getId().equals(u.getId()))
                .map(x -> new Candidate(x, feed.stored(x, today, false))).sorted(near).limit(6).map(Candidate::item).toList();
    }

    /**
     * Questions readers ask, answered only from the notice's facts. Where the official source gives no answer (no last
     * date, say), the answer says so instead of guessing; questions about facts nobody stated are left out.
     */
    static List<Answer> answers(SiteUpdate u, ApplicationStatus status, String stateName, String schoolName,
                                List<UpdateDtos.PositionRow> posts, LocalDate today, Instant verifiedAt) {
        List<Answer> out = new ArrayList<>();
        boolean job = u.getCategory() == SiteUpdate.Category.JOB;
        String who = u.getInstitutionName() != null ? u.getInstitutionName() : u.getSourceName() != null ? u.getSourceName() : "the institution";
        if (status != null) {
            String q = "What is the last date to apply?";
            String a = switch (status) {
                case CLOSED -> "The last date in the official notice was " + DAY.format(u.getClosesOn()) + ", so applications have closed.";
                case CLOSING_SOON -> "The last date in the official notice is " + DAY.format(u.getClosesOn()) + ", "
                        + days(today, u.getClosesOn()) + ".";
                case OPEN -> "The last date in the official notice is " + DAY.format(u.getClosesOn()) + ".";
                case OPENING_SOON -> "Applications open on " + DAY.format(u.getOpensOn()) + (u.getClosesOn() == null ? "; no last date is given yet."
                        : " and close on " + DAY.format(u.getClosesOn()) + ".");
                case DATE_NOT_ANNOUNCED -> "The official listing gives no last date, so this page cannot say whether applications are still "
                        + "open. Check the official notice before you apply.";
            };
            if ("Walk-in interview".equals(u.getEventLabel()) && u.getClosesOn() != null) {
                q = "When is the walk-in interview?";
                a = "On " + DAY.format(u.getClosesOn()) + ", as the official notice states" + (status == ApplicationStatus.CLOSED ? "; that date has passed." : ".");
            }
            out.add(new Answer(q, a, null, null));
        }
        if (job) {
            List<String> named = posts.isEmpty()
                    ? list(u.getPostTypes()).stream().filter(OpportunityClassifier::namesAPost).map(OpportunityClassifier::postLabel).toList()
                    : posts.stream().map(UpdateDtos.PositionRow::postName).toList();
            if (!named.isEmpty()) {
                out.add(new Answer("Which posts does the notice cover?", String.join(", ", named)
                        + (u.getVacancies() != null ? " (" + u.getVacancies() + (u.getVacancies() == 1 ? " post" : " posts") + " in all)" : "")
                        + ". The official notice gives the number of posts and the eligibility for each.", null, null));
            }
        } else if (u.getClasses() != null) {
            out.add(new Answer("Which classes does the admission notice cover?", (u.getClasses().contains(",") ? "Classes " : "Class ")
                    + u.getClasses() + (u.getAcademicSession() == null ? "" : ", for the " + u.getAcademicSession() + " session") + ".", null, null));
        }
        if (u.getEligibility() != null) {
            out.add(new Answer(job ? "What qualifications are required?" : "Who is eligible?",
                    "As the official notice states: " + u.getEligibility()
                            + (u.getTetRequirement() != null ? " " + u.getTetRequirement() : ""), null, null));
        }
        if (u.getAgeLimit() != null) {
            out.add(new Answer(job ? "What is the age limit?" : "What is the age eligibility?", "As the official notice states: " + u.getAgeLimit(), null, null));
        }
        if (u.getApplyUrl() != null) {
            out.add(new Answer("How do I apply?", "On the official application page. SchoolDhundo does not take applications.",
                    u.getApplyUrl(), "Official application page"));
        } else if ("Walk-in interview".equals(u.getEventLabel())) {
            out.add(new Answer("How do I apply?", "By attending the walk-in interview with the documents the official notice lists. "
                    + "SchoolDhundo does not take applications.", u.getSourceUrl(), "Official notice"));
        } else {
            out.add(new Answer("How do I apply?", "As the official notice describes. SchoolDhundo does not take applications.",
                    u.getSourceUrl(), "Official notice"));
        }
        if (u.getSourceUrl() != null) {
            String domain = domain(u.getSourceUrl());
            out.add(new Answer("Where is the official notice?", "On " + (u.getSourceName() != null ? u.getSourceName() : who) + "'s website"
                    + (domain == null ? "" : " (" + domain + ")") + ".", u.getSourceUrl(), "Open the official notice"));
        }
        String kind = describeInstitution(u, stateName);
        if (kind != null) {
            out.add(new Answer("Is " + (schoolName != null ? schoolName : who) + " a government or private school, and is it residential?",
                    kind, null, null));
        }
        if (verifiedAt != null) {
            String when = WHEN.format(verifiedAt.atZone(INDIA)) + " (India time)";
            out.add(new Answer("When was this information last checked?", u.isOfficialSync()
                    ? "SchoolDhundo's daily check last found this notice on the official website on " + when + "."
                    : "An editor last updated this page on " + when + ".", null, null));
        }
        return out;
    }

    /**
     * "Sainik School Korukonda is a government residential (boarding) school in Vizianagaram, Andhra Pradesh." Only for
     * a notice of one school we list (a school system such as KVS is not one school), and only from recorded facts.
     */
    private static String describeInstitution(SiteUpdate u, String stateName) {
        if (u.getSchoolId() == null || (u.getSector() == null && u.getBoarding() == null)) {
            return null;
        }
        String name = u.getInstitutionName() != null ? u.getInstitutionName() : "The school";
        List<String> words = new ArrayList<>();
        if (u.getSector() == SiteUpdate.Sector.GOVERNMENT) words.add("government");
        if (u.getSector() == SiteUpdate.Sector.PRIVATE) words.add("private");
        if (Boolean.TRUE.equals(u.getBoarding())) words.add("residential (boarding)");
        if (Boolean.FALSE.equals(u.getBoarding())) words.add("day");
        String place = u.getCity() != null && stateName != null ? " in " + u.getCity() + ", " + stateName
                : stateName != null ? " in " + stateName : "";
        return name + " is a " + String.join(" ", words) + " school" + place + ".";
    }

    private static String days(LocalDate today, LocalDate date) {
        long n = ChronoUnit.DAYS.between(today, date);
        return n == 0 ? "today" : n == 1 ? "tomorrow" : "in " + n + " days";
    }

    static String domain(String url) {
        if (url == null) return null;
        try {
            String host = URI.create(url).getHost();
            return host == null ? null : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Map<String, String> stateNames() {
        return states.findAllByOrderByNameAsc().stream().collect(Collectors.toMap(State::getCode, State::getName, (a, b) -> a));
    }
}
