package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.exam.ExamDateDto;
import com.indiaschoolfinder.dto.exam.ExamDetailDto;
import com.indiaschoolfinder.dto.exam.ExamImportRequest;
import com.indiaschoolfinder.dto.exam.ExamImportResult;
import com.indiaschoolfinder.dto.exam.ExamNoticeDto;
import com.indiaschoolfinder.dto.exam.ExamReviewDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.dto.exam.ExamVerifyRequest;
import com.indiaschoolfinder.entity.Exam;
import com.indiaschoolfinder.entity.ExamDate;
import com.indiaschoolfinder.entity.ExamNotice;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamBoarding;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamMode;
import com.indiaschoolfinder.enums.ExamSchoolType;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.enums.ExamVerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.ExamDateRepository;
import com.indiaschoolfinder.repository.ExamNoticeRepository;
import com.indiaschoolfinder.repository.ExamRepository;
import com.indiaschoolfinder.repository.StateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * School entrance exams. The catalogue is small (tens of records), so filters and sorting run in memory over the
 * published exams; statuses are derived on every read from the confirmed dates of each exam's current cycle.
 */
@Service
@Transactional(readOnly = true)
public class ExamService {

    public enum Sort { RELEVANCE, DEADLINE, EXAM_DATE, UPDATED, NAME }

    /** Every filter is optional; filters combine with AND. */
    public record Filter(String q, Integer entryClass, String state, ExamSchoolType schoolType, ExamKind kind,
                         Set<ExamStatus> statuses, ExamBoarding boarding, Boolean free, ExamMode mode, String session,
                         String authority, YearMonth examMonth) {
    }

    private final ExamRepository examRepository;
    private final ExamDateRepository dateRepository;
    private final ExamNoticeRepository noticeRepository;
    private final StateRepository stateRepository;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;

    public ExamService(ExamRepository examRepository, ExamDateRepository dateRepository, ExamNoticeRepository noticeRepository,
                       StateRepository stateRepository, AuditService auditService, AppProperties properties, Clock clock) {
        this.examRepository = examRepository;
        this.dateRepository = dateRepository;
        this.noticeRepository = noticeRepository;
        this.stateRepository = stateRepository;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    public PageResponse<ExamSummaryDto> list(Filter filter, Sort sort, int page, int size) {
        LocalDate today = LocalDate.now(clock);
        List<Exam> exams = examRepository.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc();
        Map<Long, List<ExamDate>> dates = datesByExam(exams);
        Map<String, String> stateNames = stateRepository.findAll().stream()
                .collect(Collectors.toMap(State::getCode, State::getName, (a, b) -> a));

        List<ExamSummaryDto> matches = exams.stream()
                .map(e -> toSummary(e, dates.getOrDefault(e.getId(), List.of()), today))
                .filter(s -> matches(s, filter, stateNames))
                .sorted(comparator(sort, filter.q(), today))
                .toList();
        int from = Math.min(page * size, matches.size());
        int to = Math.min(from + size, matches.size());
        int totalPages = (matches.size() + size - 1) / size;
        return new PageResponse<>(matches.subList(from, to), page, size, matches.size(), totalPages, page == 0,
                page >= totalPages - 1);
    }

    public ExamDetailDto get(String slug) {
        Exam exam = examRepository.findBySlugAndPublishedTrue(slug).orElseThrow(() -> new ResourceNotFoundException("Exam", slug));
        return detail(exam);
    }

    /** Official notices of published exams, newest first. */
    public List<ExamNoticeDto> notices(int limit) {
        List<Exam> exams = examRepository.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc();
        Map<Long, Exam> byId = exams.stream().collect(Collectors.toMap(Exam::getId, Function.identity()));
        return noticeRepository.findByExamIdInOrderByPublishedOnDescIdDesc(byId.keySet()).stream()
                .limit(limit)
                .map(n -> toDto(n, byId.get(n.getExamId())))
                .toList();
    }

    // --- administration -------------------------------------------------------------------------------------------

    /** Every exam, published or not, with what an editor should check. */
    public List<ExamReviewDto> review() {
        LocalDate today = LocalDate.now(clock);
        List<Exam> exams = examRepository.findAllByOrderByDisplayOrderAscShortNameAsc();
        Map<Long, List<ExamDate>> dates = datesByExam(exams);
        return exams.stream().map(e -> {
            List<ExamDate> all = dates.getOrDefault(e.getId(), List.of());
            List<ExamDate> current = currentCycle(e, all);
            ExamStatus status = ExamStatusCalculator.status(current, today);
            return new ExamReviewDto(e.getSlug(), e.getShortName(), e.isPublished(), e.getVerificationStatus(),
                    e.getLastVerifiedOn(), e.getCurrentCycle(), status, flags(e, current, status, today));
        }).toList();
    }

    /** An exam as an editor sees it, published or not. */
    public ExamDetailDto adminGet(String slug) {
        return detail(examRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Exam", slug)));
    }

    @Transactional
    public ExamImportResult importExams(ExamImportRequest request) {
        Set<String> seen = new HashSet<>();
        for (ExamImportRequest.ExamRecord r : request.exams()) {
            if (!seen.add(r.slug())) {
                throw new BusinessValidationException("exams", "slug '" + r.slug() + "' appears more than once");
            }
            validate(r);
        }
        int created = 0;
        int updated = 0;
        List<String> slugs = new ArrayList<>();
        for (ExamImportRequest.ExamRecord r : request.exams()) {
            Exam exam = examRepository.findBySlug(r.slug()).orElse(null);
            if (exam == null) {
                exam = new Exam();
                exam.setSlug(r.slug());
                created++;
            } else {
                updated++;
            }
            apply(exam, r);
            exam = examRepository.saveAndFlush(exam);
            replaceDatesAndNotices(exam.getId(), r);
            slugs.add(r.slug());
            auditService.record("EXAM_IMPORT", "EXAM", exam.getId(), "slug=" + r.slug() + ", cycle=" + r.currentCycle()
                    + ", status=" + r.verificationStatus() + ", published=" + r.published());
        }
        return new ExamImportResult(created, updated, slugs);
    }

    @Transactional
    public ExamReviewDto verify(String slug, ExamVerifyRequest request) {
        Exam exam = examRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Exam", slug));
        if (request.status() == ExamVerificationStatus.DRAFT && exam.isPublished()) {
            throw new BusinessValidationException("status", "unpublish the exam before marking it as a draft");
        }
        exam.setVerificationStatus(request.status());
        exam.setLastVerifiedOn(request.checkedOn());
        examRepository.saveAndFlush(exam);
        auditService.record("EXAM_VERIFY", "EXAM", exam.getId(), "status=" + request.status() + ", checkedOn="
                + request.checkedOn() + (request.note() == null || request.note().isBlank() ? "" : ", note=" + request.note().trim()));
        return review().stream().filter(r -> r.slug().equals(slug)).findFirst().orElseThrow();
    }

    @Transactional
    public ExamReviewDto setPublished(String slug, boolean published) {
        Exam exam = examRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Exam", slug));
        if (published) {
            requirePublishable(exam.getVerificationStatus(), exam.getLastVerifiedOn());
        }
        exam.setPublished(published);
        examRepository.saveAndFlush(exam);
        auditService.record(published ? "EXAM_PUBLISH" : "EXAM_UNPUBLISH", "EXAM", exam.getId(), "slug=" + slug);
        return review().stream().filter(r -> r.slug().equals(slug)).findFirst().orElseThrow();
    }

    // --- internals --------------------------------------------------------------------------------------------------

    private ExamDetailDto detail(Exam exam) {
        LocalDate today = LocalDate.now(clock);
        List<ExamDate> dates = dateRepository.findByExamIdInOrderByStartsOnAscSortOrderAsc(List.of(exam.getId()));
        List<ExamNoticeDto> notices = noticeRepository.findByExamIdInOrderByPublishedOnDescIdDesc(List.of(exam.getId()))
                .stream().map(n -> toDto(n, exam)).toList();
        return new ExamDetailDto(toSummary(exam, dates, today), exam.getContent(),
                dates.stream().map(ExamService::toDto).toList(), notices);
    }

    private Map<Long, List<ExamDate>> datesByExam(List<Exam> exams) {
        if (exams.isEmpty()) {
            return Map.of();
        }
        return dateRepository.findByExamIdInOrderByStartsOnAscSortOrderAsc(exams.stream().map(Exam::getId).toList())
                .stream().collect(Collectors.groupingBy(ExamDate::getExamId));
    }

    private static List<ExamDate> currentCycle(Exam exam, List<ExamDate> all) {
        return all.stream().filter(d -> d.getCycle().equals(exam.getCurrentCycle())).toList();
    }

    private static ExamSummaryDto toSummary(Exam e, List<ExamDate> all, LocalDate today) {
        List<ExamDate> current = currentCycle(e, all);
        ExamStatusCalculator.Timeline t = ExamStatusCalculator.timeline(current);
        ExamDateDto next = ExamStatusCalculator.nextFirm(current, today).map(ExamService::toDto).orElse(null);
        return new ExamSummaryDto(e.getSlug(), e.getShortName(), e.getName(), e.getKind(), e.getConductingAuthority(),
                e.getScope(), e.getStateCodes(), e.getSchoolTypes(), e.getEntryClasses(), e.getContent().entryClassText(),
                e.getBoarding(), e.getApplicationFree(), e.getExamMode(), e.getCurrentCycle(), e.getAcademicSession(),
                e.getSummary(), ExamStatusCalculator.status(current, today), t.applicationEnd(), t.exam(), next,
                current.stream().map(ExamService::toDto).toList(), e.getContent().papers().size(), e.getLastVerifiedOn(),
                e.getVerificationStatus());
    }

    private static ExamDateDto toDto(ExamDate d) {
        return new ExamDateDto(d.getCycle(), d.getKind(), d.getLabel(), d.getStartsOn(), d.getEndsOn(), d.getPrecision(),
                d.isConfirmed(), d.getNote(), d.getSourceUrl());
    }

    private static ExamNoticeDto toDto(ExamNotice n, Exam exam) {
        return new ExamNoticeDto(exam.getSlug(), exam.getShortName(), n.getCycle(), n.getKind(), n.getTitle(),
                n.getPublishedOn(), n.getUrl());
    }

    private static boolean matches(ExamSummaryDto s, Filter f, Map<String, String> stateNames) {
        if (f.entryClass() != null && !s.entryClasses().contains(f.entryClass())) return false;
        if (f.state() != null && !f.state().isBlank() && s.scope() == ExamScope.STATE
                && !s.stateCodes().contains(f.state().trim().toUpperCase(Locale.ROOT))) return false;
        if (f.schoolType() != null && !s.schoolTypes().contains(f.schoolType())) return false;
        if (f.kind() != null && s.kind() != f.kind()) return false;
        if (f.statuses() != null && !f.statuses().isEmpty() && !f.statuses().contains(s.status())) return false;
        if (f.boarding() != null && f.boarding() != ExamBoarding.BOTH
                && s.boarding() != f.boarding() && s.boarding() != ExamBoarding.BOTH) return false;
        if (f.free() != null && !f.free().equals(s.applicationFree())) return false;
        if (f.mode() != null && s.examMode() != f.mode()) return false;
        if (f.session() != null && !f.session().isBlank() && !f.session().trim().equals(s.academicSession())) return false;
        if (f.authority() != null && !f.authority().isBlank()
                && !fold(s.conductingAuthority()).contains(fold(f.authority()))) return false;
        if (f.examMonth() != null && (s.examDate() == null || !YearMonth.from(s.examDate()).equals(f.examMonth()))) return false;
        if (f.q() != null && !f.q().isBlank()) {
            String haystack = fold(String.join(" ", s.shortName(), s.name(), s.conductingAuthority(), s.summary(),
                    s.entryClassText(), s.stateCodes().stream().map(c -> stateNames.getOrDefault(c, c)).collect(Collectors.joining(" ")),
                    s.entryClasses().stream().map(c -> "class " + c).collect(Collectors.joining(" "))));
            for (String word : fold(f.q()).split("\\s+")) {
                if (!word.isEmpty() && !haystack.contains(word)) return false;
            }
        }
        return true;
    }

    private static Comparator<ExamSummaryDto> comparator(Sort sort, String q, LocalDate today) {
        Comparator<ExamSummaryDto> keepOrder = (a, b) -> 0; // the list arrives in display order
        return switch (sort == null ? Sort.RELEVANCE : sort) {
            case DEADLINE -> Comparator.comparing((ExamSummaryDto s) -> upcoming(s.applicationDeadline(), today),
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case EXAM_DATE -> Comparator.comparing((ExamSummaryDto s) -> upcoming(s.examDate(), today),
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case UPDATED -> Comparator.comparing(ExamSummaryDto::lastVerifiedOn, Comparator.nullsLast(Comparator.reverseOrder()));
            case NAME -> Comparator.comparing(ExamSummaryDto::shortName, String.CASE_INSENSITIVE_ORDER);
            case RELEVANCE -> q == null || q.isBlank() ? keepOrder
                    : Comparator.comparingInt((ExamSummaryDto s) -> relevance(s, fold(q)));
        };
    }

    /** Lower is better: an exact abbreviation match, then a name match, then anything else. */
    private static int relevance(ExamSummaryDto s, String q) {
        if (fold(s.shortName()).equals(q)) return 0;
        if (fold(s.shortName()).contains(q) || fold(s.name()).contains(q)) return 1;
        return 2;
    }

    private static LocalDate upcoming(LocalDate date, LocalDate today) {
        return date == null || date.isBefore(today) ? null : date;
    }

    private static String fold(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private List<ExamReviewDto.Flag> flags(Exam e, List<ExamDate> current, ExamStatus status, LocalDate today) {
        List<ExamReviewDto.Flag> flags = new ArrayList<>();
        int staleDays = properties.getExams().getStaleAfterDays();
        if (e.getLastVerifiedOn() == null) {
            flags.add(new ExamReviewDto.Flag("NEVER_VERIFIED", "No verification date recorded."));
        } else if (ChronoUnit.DAYS.between(e.getLastVerifiedOn(), today) > staleDays) {
            flags.add(new ExamReviewDto.Flag("VERIFICATION_STALE",
                    "Last checked " + e.getLastVerifiedOn() + " — more than " + staleDays + " days ago."));
        }
        if (e.getVerificationStatus() == ExamVerificationStatus.NEEDS_REVIEW) {
            flags.add(new ExamReviewDto.Flag("NEEDS_REVIEW", "Marked as needing review."));
        }
        if (status == ExamStatus.AWAITING_NOTIFICATION) {
            flags.add(new ExamReviewDto.Flag("AWAITING_NOTIFICATION",
                    "No confirmed dates for " + e.getCurrentCycle() + " — watch the official site for the notice."));
        }
        boolean anyFirm = current.stream().anyMatch(ExamDate::isFirm);
        boolean allFirmPast = anyFirm && current.stream().filter(ExamDate::isFirm).allMatch(d -> d.lastDay().isBefore(today));
        if (status == ExamStatus.RESULT_ANNOUNCED || allFirmPast) {
            flags.add(new ExamReviewDto.Flag("CYCLE_COMPLETE",
                    "Every confirmed date of " + e.getCurrentCycle() + " has passed — check for the next cycle's notice."));
        }
        current.stream().filter(d -> !d.isConfirmed() && d.lastDay().isBefore(today)).forEach(d ->
                flags.add(new ExamReviewDto.Flag("TENTATIVE_DATE_PASSED",
                        "Tentative date '" + d.getLabel() + "' (" + d.getStartsOn() + ") has passed without confirmation.")));
        if (e.getContent().syllabus().isEmpty()) {
            flags.add(new ExamReviewDto.Flag("NO_SYLLABUS", "No syllabus recorded."));
        }
        return flags;
    }

    private void validate(ExamImportRequest.ExamRecord r) {
        String at = "exams[" + r.slug() + "]";
        if (SeoHeadService.RESERVED_EXAM_SLUGS.contains(r.slug())) {
            throw new BusinessValidationException(at + ".slug", "'" + r.slug() + "' is the address of a site page");
        }
        if (r.scope() == ExamScope.STATE && r.stateCodes().isEmpty()) {
            throw new BusinessValidationException(at + ".stateCodes", "a state exam must list its states");
        }
        if (r.scope() == ExamScope.NATIONAL && !r.stateCodes().isEmpty()) {
            throw new BusinessValidationException(at + ".stateCodes", "a national exam must not list states");
        }
        if (r.published()) {
            requirePublishable(r.verificationStatus(), r.lastVerifiedOn());
        }
        if (r.lastVerifiedOn() != null && r.lastVerifiedOn().isAfter(LocalDate.now(clock))) {
            throw new BusinessValidationException(at + ".lastVerifiedOn", "cannot be in the future");
        }
        for (ExamImportRequest.DateRecord d : r.dates()) {
            if (d.endsOn() != null && d.endsOn().isBefore(d.startsOn())) {
                throw new BusinessValidationException(at + ".dates", "'" + d.label() + "' ends before it starts");
            }
            if (d.precision() == DatePrecision.MONTH && d.startsOn().getDayOfMonth() != 1) {
                throw new BusinessValidationException(at + ".dates", "'" + d.label() + "' has month precision; use the 1st");
            }
        }
    }

    private static void requirePublishable(ExamVerificationStatus status, LocalDate lastVerifiedOn) {
        if (status == ExamVerificationStatus.DRAFT || lastVerifiedOn == null) {
            throw new BusinessValidationException("published",
                    "only records checked against their official sources (with a verification date) can be published");
        }
    }

    private void apply(Exam exam, ExamImportRequest.ExamRecord r) {
        exam.setShortName(r.shortName().trim());
        exam.setName(r.name().trim());
        exam.setKind(r.kind());
        exam.setConductingAuthority(r.conductingAuthority().trim());
        exam.setScope(r.scope());
        exam.setStateCodes(new ArrayList<>(r.stateCodes()));
        exam.setSchoolTypes(new ArrayList<>(r.schoolTypes()));
        exam.setEntryClasses(r.entryClasses().stream().distinct().sorted().toList());
        exam.setBoarding(r.boarding());
        exam.setApplicationFree(r.applicationFree());
        exam.setExamMode(r.examMode());
        exam.setCurrentCycle(r.currentCycle().trim());
        exam.setAcademicSession(r.academicSession());
        exam.setSummary(r.summary().trim());
        exam.setContent(r.content());
        exam.setDisplayOrder(Objects.requireNonNullElse(r.displayOrder(), 100));
        exam.setLastVerifiedOn(r.lastVerifiedOn());
        exam.setVerificationStatus(r.verificationStatus());
        exam.setPublished(r.published());
    }

    private void replaceDatesAndNotices(Long examId, ExamImportRequest.ExamRecord r) {
        dateRepository.deleteByExamId(examId);
        noticeRepository.deleteByExamId(examId);
        int order = 0;
        for (ExamImportRequest.DateRecord d : r.dates()) {
            ExamDate date = new ExamDate();
            date.setExamId(examId);
            date.setCycle(d.cycle().trim());
            date.setKind(d.kind());
            date.setLabel(d.label().trim());
            date.setStartsOn(d.startsOn());
            date.setEndsOn(d.endsOn());
            date.setPrecision(Objects.requireNonNullElse(d.precision(), DatePrecision.DAY));
            date.setConfirmed(d.confirmed());
            date.setNote(d.note());
            date.setSourceUrl(d.sourceUrl().trim());
            date.setSortOrder(order++);
            dateRepository.save(date);
        }
        for (ExamImportRequest.NoticeRecord n : r.notices()) {
            ExamNotice notice = new ExamNotice();
            notice.setExamId(examId);
            notice.setCycle(n.cycle());
            notice.setKind(n.kind());
            notice.setTitle(n.title().trim());
            notice.setPublishedOn(n.publishedOn());
            notice.setUrl(n.url().trim());
            noticeRepository.save(notice);
        }
    }
}
