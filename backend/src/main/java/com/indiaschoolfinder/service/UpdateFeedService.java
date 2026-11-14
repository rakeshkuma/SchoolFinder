package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.exam.ExamDateDto;
import com.indiaschoolfinder.dto.exam.ExamNoticeDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.dto.update.UpdateDtos.Badge;
import com.indiaschoolfinder.dto.update.UpdateDtos.Origin;
import com.indiaschoolfinder.dto.update.UpdateDtos.UpdateItem;
import com.indiaschoolfinder.entity.PracticeSet;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.ExamDateKind;
import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.enums.ExamVerificationStatus;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.repository.PracticeSetRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The "Latest School & Exam Updates" feed. Nothing in it is written for the feed: exam items come from the official
 * notices and important dates in the exam catalogue, admission items from the open and upcoming admission cycles
 * (grouped by the notice they come from), practice items from newly added practice sets, and editorial items (such as
 * teaching job alerts) from what an editor has published, each citing its source. Badges are worked out from dates on
 * every request, so an update never shows "closing soon" after its deadline or "new" a week after it appeared.
 */
@Service
@Transactional(readOnly = true)
public class UpdateFeedService {

    /** Days before a deadline when an item is "closing soon". */
    static final int CLOSING_SOON_DAYS = 14;
    /** Days after publication (or an update) when an item is "new" (or "updated"). */
    static final int FRESH_DAYS = 7;
    /** Practice sets added or changed within this many days count as an update. */
    static final int PRACTICE_WINDOW_DAYS = 30;
    /** Exams with their own preparation page on this site. */
    private static final Set<String> PREP_EXAMS = Set.of("jnvst", "aissee", "netarhat");
    private static final Set<String> DASHBOARD_EXAMS = Set.of("jnvst", "aissee");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    private final SiteUpdateRepository updates;
    private final ExamService exams;
    private final AdmissionService admissions;
    private final PracticeSetRepository practiceSets;
    private final Clock clock;

    public UpdateFeedService(SiteUpdateRepository updates, ExamService exams, AdmissionService admissions,
                             PracticeSetRepository practiceSets, Clock clock) {
        this.updates = updates;
        this.exams = exams;
        this.admissions = admissions;
        this.practiceSets = practiceSets;
        this.clock = clock;
    }

    /** An item and how far up an editor pinned it (derived items are 0). */
    private record Ranked(UpdateItem item, int priority) {
    }

    /** Current updates, most relevant first; {@code category} null means all. */
    public PageResponse<UpdateItem> feed(SiteUpdate.Category category, int page, int size) {
        LocalDate today = LocalDate.now(clock.withZone(INDIA));
        List<Ranked> all = new ArrayList<>(editorial(today));
        Map<String, ExamSummaryDto> examsBySlug = exams.list(
                        new ExamService.Filter(null, null, null, null, null, null, null, null, null, null, null, null),
                        ExamService.Sort.RELEVANCE, 0, 200).content().stream()
                .collect(Collectors.toMap(ExamSummaryDto::slug, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        List<UpdateItem> examItems = examItems(examsBySlug, today);
        examItems.forEach(u -> all.add(new Ranked(u, 0)));
        // In the combined list, an admission group announced by the same notice as an exam item (AISSEE schools and the
        // AISSEE notice) is the same news twice: the exam item stands for it. Its own tab still lists it.
        Set<String> examSources = examItems.stream().map(UpdateItem::sourceUrl).filter(Objects::nonNull).collect(Collectors.toSet());
        for (UpdateItem a : admissionItems(today)) {
            if (category == null && a.sourceUrl() != null && examSources.contains(a.sourceUrl())) {
                continue;
            }
            all.add(new Ranked(a, 0));
        }
        practiceItems(examsBySlug, today).forEach(u -> all.add(new Ranked(u, 0)));

        List<UpdateItem> matching = all.stream()
                .filter(r -> category == null || r.item().category() == category)
                .sorted(ORDER)
                .map(Ranked::item)
                .toList();
        int from = Math.min(page * size, matching.size());
        int to = Math.min(from + size, matching.size());
        int totalPages = (matching.size() + size - 1) / size;
        return new PageResponse<>(matching.subList(from, to), page, size, matching.size(), totalPages, page == 0,
                page >= totalPages - 1);
    }

    /** Editorial items pinned above the rest first, then the most urgent badge, then the newest. */
    private static final Comparator<Ranked> ORDER = Comparator
            .comparingInt((Ranked r) -> -Math.max(r.priority(), 0))
            .thenComparingInt(r -> r.item().badge() == null ? Badge.values().length : r.item().badge().ordinal())
            .thenComparing((Ranked r) -> r.item().publishedOn(), Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparingInt(Ranked::priority)
            .thenComparing(r -> r.item().title());

    /**
     * The badge for an update: a deadline within {@value #CLOSING_SOON_DAYS} days, then a notice published within
     * {@value #FRESH_DAYS} days, then applications open now, then a recent change, then a date still to come.
     */
    static Badge badge(LocalDate today, LocalDate publishedOn, LocalDate updatedOn, LocalDate eventDate, boolean deadline,
                       boolean open) {
        if (deadline && eventDate != null && !eventDate.isBefore(today) && !eventDate.isAfter(today.plusDays(CLOSING_SOON_DAYS))) {
            return Badge.CLOSING_SOON;
        }
        if (publishedOn != null && !publishedOn.isAfter(today) && !publishedOn.isBefore(today.minusDays(FRESH_DAYS))) {
            return Badge.NEW;
        }
        if (open) {
            return Badge.OPEN;
        }
        if (updatedOn != null && !updatedOn.isBefore(today.minusDays(FRESH_DAYS)) && (publishedOn == null || updatedOn.isAfter(publishedOn))) {
            return Badge.UPDATED;
        }
        if (eventDate != null && eventDate.isAfter(today)) {
            return Badge.UPCOMING;
        }
        return null;
    }

    // --- editorial ----------------------------------------------------------------------------------------------------

    /** Published editorial updates, until their expiry date; one dated in the future waits for that day. */
    private List<Ranked> editorial(LocalDate today) {
        return updates.findByStatus(SiteUpdate.Status.PUBLISHED).stream()
                .filter(u -> u.getExpiresOn() == null || !u.getExpiresOn().isBefore(today))
                .filter(u -> !u.getPublishedOn().isAfter(today))
                .map(u -> {
                    LocalDate updatedOn = u.getUpdatedAt() == null ? null : u.getUpdatedAt().atZone(INDIA).toLocalDate();
                    return new Ranked(new UpdateItem("editorial:" + u.getId(), u.getCategory(), u.getTitle(), u.getSummary(), u.getImageUrl(),
                            u.getPublishedOn(), u.getUpdatedAt(), u.getEventDate(), u.getEventLabel(), u.isDeadline(),
                            badge(today, u.getPublishedOn(), updatedOn, u.getEventDate(), u.isDeadline(), false),
                            u.getSourceUrl(), u.getSourceName(), u.getLinkPath(),
                            u.getActionLabel() != null ? u.getActionLabel() : defaultAction(u.getCategory()),
                            u.getVerificationStatus() == VerificationStatus.VERIFIED, Origin.EDITORIAL,
                            u.getCategory().name().toLowerCase(Locale.ROOT)), u.getPriority());
                })
                .toList();
    }

    private static String defaultAction(SiteUpdate.Category category) {
        return switch (category) {
            case ADMISSION -> "View Admissions";
            case EXAM -> "View Notification";
            case PREP -> "Start Practice";
            case JOB -> "View Jobs";
        };
    }

    // --- exams ----------------------------------------------------------------------------------------------------------

    /** One item per exam with a date still to come in its current cycle, from its newest official notice. */
    private List<UpdateItem> examItems(Map<String, ExamSummaryDto> examsBySlug, LocalDate today) {
        Map<String, ExamNoticeDto> latestNotice = new LinkedHashMap<>();
        for (ExamNoticeDto n : exams.notices(500)) {
            latestNotice.putIfAbsent(n.examSlug(), n); // newest first
        }
        List<UpdateItem> items = new ArrayList<>();
        for (ExamSummaryDto e : examsBySlug.values()) {
            ExamDateDto next = e.nextDate();
            if (next == null || next.startsOn() == null || next.startsOn().isBefore(today)
                    || e.status() == ExamStatus.AWAITING_NOTIFICATION || e.status() == ExamStatus.RESULT_ANNOUNCED) {
                continue;
            }
            ExamNoticeDto notice = latestNotice.get(e.slug());
            // A notice from an earlier cycle does not describe this one.
            if (notice != null && notice.cycle() != null && e.currentCycle() != null && !notice.cycle().equals(e.currentCycle())) {
                notice = null;
            }
            boolean open = e.status() == ExamStatus.APPLICATIONS_OPEN || e.status() == ExamStatus.DEADLINE_APPROACHING;
            boolean deadline = next.kind() == ExamDateKind.APPLICATION_END || next.kind() == ExamDateKind.LATE_APPLICATION_END;
            LocalDate publishedOn = notice != null ? notice.publishedOn() : e.lastVerifiedOn();
            String cycle = e.currentCycle() != null ? e.currentCycle() : e.shortName();
            String summary = notice != null ? notice.title() : e.summary();
            boolean prep = PREP_EXAMS.contains(e.slug());
            String action = open ? (prep ? "Apply / Prepare" : "View Notification") : prep ? "Prepare Now" : "View Details";
            items.add(new UpdateItem("exam:" + e.slug(), SiteUpdate.Category.EXAM, cycle + ": " + headline(next),
                    shorten(summary, 240), null, publishedOn,
                    e.lastVerifiedOn() == null ? null : e.lastVerifiedOn().atStartOfDay(INDIA).toInstant(),
                    next.startsOn(), eventLabel(next.kind()), deadline,
                    badge(today, publishedOn, e.lastVerifiedOn(), next.startsOn(), deadline, open),
                    notice != null ? notice.url() : e.officialUrl(), e.conductingAuthority(), "/exams/" + e.slug(), action,
                    e.verificationStatus() == ExamVerificationStatus.VERIFIED, Origin.EXAM_NOTICE, e.slug()));
        }
        return items;
    }

    private static String headline(ExamDateDto next) {
        String date = next.startsOn().format(DAY);
        return switch (next.kind()) {
            case APPLICATION_START -> "applications open " + date;
            case APPLICATION_END -> "last date to apply " + date;
            case LATE_APPLICATION_END -> "late applications until " + date;
            case ADMIT_CARD -> "admit cards from " + date;
            case EXAM -> "exam on " + date;
            case RESULT -> "result expected " + date;
            case COUNSELLING -> "counselling from " + date;
            case SESSION_START -> "session starts " + date;
            case OTHER -> shorten(next.label(), 60) + ", " + date;
        };
    }

    private static String eventLabel(ExamDateKind kind) {
        return switch (kind) {
            case APPLICATION_START -> "Applications open";
            case APPLICATION_END -> "Last date";
            case LATE_APPLICATION_END -> "Late fee until";
            case ADMIT_CARD -> "Admit cards";
            case EXAM -> "Exam date";
            case RESULT -> "Result";
            case COUNSELLING -> "Counselling";
            case SESSION_START -> "Session starts";
            case OTHER -> "Next date";
        };
    }

    // --- admissions -----------------------------------------------------------------------------------------------------

    /** Open and upcoming admission cycles, one item per official notice (40 Sainik Schools under one NTA notice = one item). */
    private List<UpdateItem> admissionItems(LocalDate today) {
        List<AdmissionDto> cycles = admissions.upcoming(0, 2000).content();
        Map<String, List<AdmissionDto>> byNotice = new LinkedHashMap<>();
        for (AdmissionDto a : cycles) {
            String key = a.officialNotificationUrl() != null ? a.officialNotificationUrl() : a.sourceUrl();
            byNotice.computeIfAbsent(key == null ? "school:" + a.schoolId() : key, k -> new ArrayList<>()).add(a);
        }
        // One school's separate notices for different classes with the same year, status and key date (say Class IX
        // and Class XI, both closing on 8 Jan) read as one update; the first notice stays its source.
        Map<String, List<AdmissionDto>> groups = new LinkedHashMap<>();
        Map<String, String> sourceKeyOf = new LinkedHashMap<>();
        for (Map.Entry<String, List<AdmissionDto>> notice : byNotice.entrySet()) {
            List<AdmissionDto> list = notice.getValue();
            boolean oneSchool = list.stream().map(AdmissionDto::schoolId).distinct().count() == 1;
            String key = oneSchool ? "same:" + list.get(0).schoolId() + "|" + years(list) + "|" + keyDate(list) : notice.getKey();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).addAll(list);
            sourceKeyOf.putIfAbsent(key, notice.getKey());
        }
        List<UpdateItem> items = new ArrayList<>();
        for (Map.Entry<String, List<AdmissionDto>> group : groups.entrySet()) {
            List<AdmissionDto> list = group.getValue();
            List<String> schools = list.stream().map(AdmissionDto::schoolName).distinct().toList();
            boolean open = list.stream().anyMatch(a -> a.status() == AdmissionStatus.OPEN);
            LocalDate eventDate = open
                    ? list.stream().filter(a -> a.status() == AdmissionStatus.OPEN).map(AdmissionDto::applicationEndDate)
                            .filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null)
                    : list.stream().map(AdmissionDto::applicationStartDate).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
            Instant updatedAt = list.stream().map(AdmissionDto::updatedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
            LocalDate publishedOn = updatedAt == null ? null : updatedAt.atZone(INDIA).toLocalDate();
            String classes = classes(list);
            String years = years(list);
            String title;
            String summary;
            String link;
            if (schools.size() == 1) {
                AdmissionDto first = list.get(0);
                title = schools.get(0) + ": " + classes + " admissions " + years;
                summary = (open ? "Applications are open" : "Applications open soon")
                        + (eventDate == null ? "." : (open ? "; last date " : " from ") + eventDate.format(DAY) + ".")
                        + " Dates are from the school's official notice.";
                link = "/schools/" + first.schoolSlug() + "?tab=admissions";
            } else {
                title = (open ? "Admissions open at " : "Admissions opening at ") + schools.size() + " schools: " + classes + " (" + years + ")";
                summary = "Including " + schools.get(0) + ", " + schools.get(1)
                        + (schools.size() > 2 ? " and " + (schools.size() - 2) + " more" : "") + "."
                        + (eventDate == null ? "" : (open ? " Last date " : " Applications from ") + eventDate.format(DAY) + ".");
                link = "/admissions";
            }
            boolean verified = list.stream().allMatch(a -> a.verificationStatus() == VerificationStatus.VERIFIED);
            String sourceKey = sourceKeyOf.get(group.getKey());
            String source = sourceKey.startsWith("school:") ? null : sourceKey;
            items.add(new UpdateItem("admissions:" + Integer.toHexString(group.getKey().hashCode()), SiteUpdate.Category.ADMISSION,
                    shorten(title, 160), shorten(summary, 300), null, publishedOn, updatedAt, eventDate,
                    open ? "Last date" : "Applications open", open,
                    badge(today, publishedOn, null, eventDate, open, open), source, null, link, "View Admissions", verified,
                    Origin.ADMISSIONS, "admissions"));
        }
        return items;
    }

    private static String years(List<AdmissionDto> list) {
        return list.stream().map(AdmissionDto::academicYear).filter(Objects::nonNull).distinct().sorted().collect(Collectors.joining(", "));
    }

    /** What decides a group's date and badge: open with its last date, or upcoming with its first date. */
    private static String keyDate(List<AdmissionDto> list) {
        boolean open = list.stream().anyMatch(a -> a.status() == AdmissionStatus.OPEN);
        LocalDate date = open
                ? list.stream().filter(a -> a.status() == AdmissionStatus.OPEN).map(AdmissionDto::applicationEndDate)
                        .filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null)
                : list.stream().map(AdmissionDto::applicationStartDate).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
        return (open ? "open:" : "soon:") + date;
    }

    /** "Class VI" or "Classes VI & IX". */
    private static String classes(List<AdmissionDto> list) {
        List<String> names = list.stream().map(AdmissionDto::className).filter(Objects::nonNull).distinct().toList();
        if (names.isEmpty()) {
            return "School";
        }
        if (names.size() == 1) {
            return names.get(0);
        }
        List<String> bare = names.stream().map(n -> n.replaceFirst("^Class\\s+", "")).toList();
        return "Classes " + String.join(", ", bare.subList(0, bare.size() - 1)) + " & " + bare.get(bare.size() - 1);
    }

    // --- practice -------------------------------------------------------------------------------------------------------

    /** Practice sets added or changed recently, one item per exam and level. */
    private List<UpdateItem> practiceItems(Map<String, ExamSummaryDto> examsBySlug, LocalDate today) {
        Instant since = today.minusDays(PRACTICE_WINDOW_DAYS).atStartOfDay(INDIA).toInstant();
        Map<String, List<PracticeSet>> groups = new LinkedHashMap<>();
        for (PracticeSet s : practiceSets.findByPublishedTrueOrderByDisplayOrderAscTitleAsc()) {
            if (s.getExamSlug() == null) {
                continue;
            }
            groups.computeIfAbsent(s.getExamSlug() + "|" + s.getLevel(), k -> new ArrayList<>()).add(s);
        }
        List<UpdateItem> items = new ArrayList<>();
        for (List<PracticeSet> sets : groups.values()) {
            Instant newestChange = sets.stream().map(PracticeSet::getUpdatedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
            Instant newestAdded = sets.stream().map(PracticeSet::getCreatedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
            if (newestChange == null || newestChange.isBefore(since)) {
                continue;
            }
            PracticeSet first = sets.get(0);
            ExamSummaryDto exam = examsBySlug.get(first.getExamSlug());
            String name = exam != null ? exam.shortName() : first.getExamSlug().toUpperCase(Locale.ROOT);
            int questions = sets.stream().mapToInt(s -> s.getContent() == null || s.getContent().questions() == null ? 0 : s.getContent().questions().size()).sum();
            long mocks = sets.stream().filter(s -> s.getKind() == PracticeSet.Kind.MOCK).count();
            LocalDate addedOn = newestAdded == null ? null : newestAdded.atZone(INDIA).toLocalDate();
            LocalDate changedOn = newestChange.atZone(INDIA).toLocalDate();
            LocalDate examDate = exam != null && exam.examDate() != null && !exam.examDate().isBefore(today) ? exam.examDate() : null;
            String summary = sets.size() + (sets.size() == 1 ? " set" : " sets")
                    + (mocks > 0 ? " (" + mocks + (mocks == 1 ? " full mock test" : " full mock tests") + ")" : "")
                    + " with " + questions + " original practice questions with explanations, " + first.getLevel() + " level."
                    + " Written by SchoolDhundo; not official questions.";
            String link = DASHBOARD_EXAMS.contains(first.getExamSlug()) ? "/exams/" + first.getExamSlug()
                    : "/exams/practice?exam=" + first.getExamSlug();
            items.add(new UpdateItem("practice:" + first.getExamSlug() + ":" + Integer.toHexString(first.getLevel().hashCode()),
                    SiteUpdate.Category.PREP, name + " practice sets: " + first.getLevel(), shorten(summary, 300), null,
                    addedOn, newestChange, examDate, examDate == null ? null : "Exam date", false,
                    badge(today, addedOn, changedOn, examDate, false, false), null, "SchoolDhundo", link, "Start Practice",
                    false, Origin.PRACTICE, first.getExamSlug()));
        }
        return items;
    }

    private static String shorten(String text, int max) {
        if (text == null) {
            return null;
        }
        String t = text.replaceAll("\\s+", " ").trim();
        if (t.length() <= max) {
            return t;
        }
        int cut = t.lastIndexOf(' ', max - 1);
        return t.substring(0, cut > max / 2 ? cut : max - 1) + "…";
    }
}
