package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.PracticeAdminDtos;
import com.indiaschoolfinder.dto.practice.PracticeContent;
import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.dto.practice.QuestionReportRequest;
import com.indiaschoolfinder.entity.PracticeQuestionReport;
import com.indiaschoolfinder.entity.PracticeSet;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.PracticeQuestionReportRepository;
import com.indiaschoolfinder.repository.PracticeSetRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Practice content administration for editors: an overview of every set with what needs checking, publishing,
 * review dates, JSON export (to edit and re-import) and CSV import of a set's questions; and the queue of problems
 * visitors report in questions.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class PracticeAdminService {

    /** A review older than this is flagged for a re-check. */
    static final int REVIEW_DUE_DAYS = 365;
    static final int MAX_CSV_ROWS = 200;
    private static final List<String> LETTERS = List.of("a", "b", "c", "d", "e");

    private final PracticeSetRepository sets;
    private final PracticeQuestionReportRepository reports;
    private final PracticeService practiceService;
    private final AuditService auditService;
    private final Validator validator;
    private final Clock clock;

    public PracticeAdminService(PracticeSetRepository sets, PracticeQuestionReportRepository reports,
                                PracticeService practiceService, AuditService auditService, Validator validator, Clock clock) {
        this.sets = sets;
        this.reports = reports;
        this.practiceService = practiceService;
        this.auditService = auditService;
        this.validator = validator;
        this.clock = clock;
    }

    // --- sets -------------------------------------------------------------------------------------------------------

    public List<PracticeAdminDtos.SetRow> sets() {
        Map<String, Long> open = new HashMap<>();
        reports.countOpenBySet().forEach(r -> open.put((String) r[0], ((Number) r[1]).longValue()));
        LocalDate today = LocalDate.now(clock);
        return sets.findAll(Sort.by("displayOrder", "title")).stream().map(s -> {
            List<PracticeContent.Question> qs = s.getContent().questions();
            int hindi = (int) qs.stream().filter(q -> q.hi() != null).count();
            long reported = open.getOrDefault(s.getSlug(), 0L);
            List<PracticeAdminDtos.Flag> flags = new ArrayList<>();
            if (s.getReviewedOn() == null) {
                flags.add(new PracticeAdminDtos.Flag("NOT_REVIEWED", "No review date: the set cannot be published until it is reviewed."));
            } else if (s.getReviewedOn().isBefore(today.minusDays(REVIEW_DUE_DAYS))) {
                flags.add(new PracticeAdminDtos.Flag("REVIEW_DUE", "Last reviewed more than a year ago; re-check answers and explanations."));
            }
            if (reported > 0) {
                flags.add(new PracticeAdminDtos.Flag("OPEN_REPORTS", reported + " open report" + (reported == 1 ? "" : "s") + " from visitors."));
            }
            if (hindi > 0 && hindi < qs.size()) {
                flags.add(new PracticeAdminDtos.Flag("PARTIAL_HINDI", hindi + " of " + qs.size() + " questions have a Hindi version."));
            }
            answerSkew(qs).ifPresent(flags::add);
            return new PracticeAdminDtos.SetRow(s.getSlug(), s.getExamSlug(), s.getTitle(), s.getKind(), s.getCategory(),
                    s.getLevel(), qs.size(), hindi, (int) qs.stream().filter(q -> q.chapter() != null).count(),
                    s.getMarksPerQuestion(), s.getNegativeMarks(), s.isPublished(), s.getReviewedOn(), s.getDisplayOrder(),
                    reported, s.getUpdatedAt(), flags);
        }).toList();
    }

    /** More than half the answers in one position makes guessing pay; worth reshuffling the options. */
    private static java.util.Optional<PracticeAdminDtos.Flag> answerSkew(List<PracticeContent.Question> qs) {
        if (qs.size() < 8) return java.util.Optional.empty();
        Map<Integer, Long> byPosition = qs.stream().collect(Collectors.groupingBy(PracticeContent.Question::answer, Collectors.counting()));
        return byPosition.entrySet().stream().filter(e -> e.getValue() * 2 > qs.size()).findFirst()
                .map(e -> new PracticeAdminDtos.Flag("ANSWER_SKEW", e.getValue() + " of " + qs.size() + " answers are option "
                        + (char) ('A' + e.getKey()) + "; shuffle the options so the position is not guessable."));
    }

    @Transactional
    public PracticeAdminDtos.SetRow publish(String slug, PracticeAdminDtos.PublishRequest r) {
        PracticeSet set = set(slug);
        if (r.published()) {
            LocalDate reviewed = r.reviewedOn() != null ? r.reviewedOn() : set.getReviewedOn(); // both may be null
            if (reviewed == null) {
                throw new BusinessValidationException("reviewedOn", "a set is published only after its questions are reviewed");
            }
            if (reviewed.isAfter(LocalDate.now(clock))) {
                throw new BusinessValidationException("reviewedOn", "the review date is in the future");
            }
            set.setReviewedOn(reviewed);
        }
        set.setPublished(r.published());
        sets.saveAndFlush(set);
        auditService.record(r.published() ? "PRACTICE_PUBLISHED" : "PRACTICE_UNPUBLISHED", "PRACTICE_SET", set.getId(),
                "slug=" + slug + ", reviewedOn=" + set.getReviewedOn());
        return row(slug);
    }

    @Transactional
    public PracticeAdminDtos.SetRow review(String slug, PracticeAdminDtos.ReviewRequest r) {
        PracticeSet set = set(slug);
        set.setReviewedOn(LocalDate.now(clock));
        sets.saveAndFlush(set);
        String note = r == null ? null : InputSanitizer.clean(r.note());
        auditService.record("PRACTICE_REVIEWED", "PRACTICE_SET", set.getId(),
                "slug=" + slug + (note == null || note.isBlank() ? "" : ", note=" + note));
        return row(slug);
    }

    /** The set in the import format, answers included (editors only): edit it and import it again. */
    public PracticeImportRequest export(String slug) {
        PracticeSet s = set(slug);
        return new PracticeImportRequest(List.of(new PracticeImportRequest.SetRecord(s.getSlug(), s.getExamSlug(), s.getTitle(),
                s.getKind(), s.getLevel(), s.getDescription(), s.getDurationMinutes(), s.getDisplayOrder(), s.isPublished(),
                s.getReviewedOn(), s.getContent(), s.getCategory(), s.getMarksPerQuestion(), s.getNegativeMarks())));
    }

    /**
     * Replaces the questions of an existing set from a CSV file (one row per question; columns id, section, chapter,
     * topic, difficulty, prompt, option_a … option_d (option_e optional), answer (A–E), explanation, and optionally
     * hi_prompt, hi_option_a …, hi_explanation). Changed questions have not been reviewed, so the set is unpublished
     * and its review date cleared until an editor reviews and publishes it again. Sets with reading passages or
     * figures are edited through the JSON import instead.
     */
    @Transactional
    public PracticeAdminDtos.CsvImportResult importCsv(String slug, InputStream csv) {
        PracticeSet s = set(slug);
        boolean hasFigures = s.getContent().questions().stream().anyMatch(q -> q.figure() != null || q.optionFigures() != null);
        if (!s.getContent().passages().isEmpty() || hasFigures) {
            throw new BusinessValidationException("file", "this set has reading passages or figures; edit it with the JSON export and import");
        }
        List<PracticeContent.Question> questions = parse(csv);
        PracticeImportRequest.SetRecord record = new PracticeImportRequest.SetRecord(s.getSlug(), s.getExamSlug(), s.getTitle(),
                s.getKind(), s.getLevel(), s.getDescription(), s.getDurationMinutes(), s.getDisplayOrder(), false, null,
                new PracticeContent(List.of(), questions), s.getCategory(), s.getMarksPerQuestion(), s.getNegativeMarks());
        PracticeImportRequest request = new PracticeImportRequest(List.of(record));
        Set<ConstraintViolation<PracticeImportRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            ConstraintViolation<PracticeImportRequest> v = violations.iterator().next();
            throw new BusinessValidationException("file", rowOf(v.getPropertyPath().toString()) + v.getMessage());
        }
        practiceService.importSets(request); // the same checks as the JSON import; audited there
        int hindi = (int) questions.stream().filter(q -> q.hi() != null).count();
        return new PracticeAdminDtos.CsvImportResult(slug, questions.size(), hindi, false,
                "Imported " + questions.size() + " questions. The set is unpublished until it is reviewed and published again.");
    }

    private List<PracticeContent.Question> parse(InputStream csv) {
        try (Reader reader = new InputStreamReader(csv, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true)
                     .setIgnoreEmptyLines(true).setIgnoreHeaderCase(true).build().parse(reader)) {
            Set<String> headers = parser.getHeaderNames().stream()
                    .map(h -> h.replace("﻿", "").trim().toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
            List<String> missing = List.of("id", "section", "topic", "difficulty", "prompt", "option_a", "option_b", "answer", "explanation")
                    .stream().filter(h -> !headers.contains(h)).toList();
            if (!missing.isEmpty()) {
                throw new BusinessValidationException("file", "missing required columns: " + String.join(", ", missing));
            }
            List<PracticeContent.Question> questions = new ArrayList<>();
            for (CSVRecord row : parser) {
                if (questions.size() >= MAX_CSV_ROWS) {
                    throw new BusinessValidationException("file", "at most " + MAX_CSV_ROWS + " questions per set");
                }
                questions.add(question(row, (int) row.getRecordNumber() + 1));
            }
            if (questions.isEmpty()) {
                throw new BusinessValidationException("file", "the file has no questions");
            }
            return questions;
        } catch (IOException | IllegalArgumentException | IllegalStateException e) {
            throw new BusinessValidationException("file", "the file could not be read as CSV (UTF-8, comma-separated, with a header row)");
        }
    }

    private static PracticeContent.Question question(CSVRecord row, int line) {
        String at = "row " + line + ": ";
        List<String> options = LETTERS.stream().map(l -> cell(row, "option_" + l)).filter(Objects::nonNull).toList();
        String answer = Objects.requireNonNullElse(cell(row, "answer"), "").toUpperCase(Locale.ROOT);
        int index = answer.length() == 1 ? answer.charAt(0) - 'A' : -1;
        if (index < 0 || index >= options.size()) {
            throw new BusinessValidationException("file", at + "answer must be the letter of one of its options (A–" + (char) ('A' + Math.max(0, options.size() - 1)) + ")");
        }
        PracticeContent.QuestionText hi = null;
        if (cell(row, "hi_prompt") != null) {
            List<String> hiOptions = LETTERS.subList(0, options.size()).stream().map(l -> cell(row, "hi_option_" + l)).toList();
            if (hiOptions.contains(null) || cell(row, "hi_explanation") == null) {
                throw new BusinessValidationException("file", at + "a Hindi version needs hi_explanation and one hi_option per option");
            }
            hi = new PracticeContent.QuestionText(clean(row, "hi_prompt"), hiOptions.stream().map(InputSanitizer::clean).toList(),
                    clean(row, "hi_explanation"));
        }
        String difficulty = Objects.requireNonNullElse(cell(row, "difficulty"), "").toUpperCase(Locale.ROOT);
        return new PracticeContent.Question(Objects.requireNonNullElse(cell(row, "id"), "").toLowerCase(Locale.ROOT),
                clean(row, "section"), clean(row, "topic"), null, clean(row, "prompt"),
                options.stream().map(InputSanitizer::clean).toList(), index, clean(row, "explanation"), null, false, null,
                difficulty.isEmpty() ? null : difficulty, clean(row, "chapter"), hi);
    }

    private static String cell(CSVRecord row, String column) {
        if (!row.isMapped(column) || !row.isSet(column)) return null;
        String v = row.get(column);
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static String clean(CSVRecord row, String column) {
        return InputSanitizer.clean(cell(row, column));
    }

    /** "sets[0].content.questions[4].prompt" → "row 6: prompt " (row 1 is the header). */
    private static String rowOf(String path) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("questions\\[(\\d+)]\\.?(.*)").matcher(path);
        return m.find() ? "row " + (Integer.parseInt(m.group(1)) + 2) + ": " + (m.group(2).isEmpty() ? "" : m.group(2) + " ") : "";
    }

    private PracticeAdminDtos.SetRow row(String slug) {
        return sets().stream().filter(r -> r.slug().equals(slug)).findFirst().orElseThrow();
    }

    private PracticeSet set(String slug) {
        return sets.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Practice set", slug));
    }

    // --- reports ----------------------------------------------------------------------------------------------------

    /** Stores a visitor's report about a published question. A filled honeypot is accepted silently and discarded. */
    @Transactional
    public void report(String setSlug, String questionId, QuestionReportRequest r, Long accountId) {
        String id = setSlug + "/" + questionId;
        if (!practiceService.bankIndex().containsKey(id)) {
            throw new ResourceNotFoundException("Practice question", id);
        }
        if (r.website() != null && !r.website().isBlank()) {
            log.info("Discarded a practice question report for {} (honeypot filled)", id);
            return;
        }
        String message = InputSanitizer.clean(r.message());
        if (r.reason() == PracticeQuestionReport.Reason.OTHER && (message == null || message.isBlank())) {
            throw new BusinessValidationException("message", "please describe the problem");
        }
        PracticeQuestionReport report = new PracticeQuestionReport();
        report.setQuestionId(id);
        report.setSetSlug(setSlug);
        report.setReason(r.reason());
        report.setMessage(message == null || message.isBlank() ? null : message);
        report.setAccountId(accountId);
        reports.save(report);
    }

    public PageResponse<PracticeAdminDtos.ReportRow> reports(PracticeQuestionReport.Status status, int page, int size) {
        Page<PracticeQuestionReport> p = reports.findByStatusOrderByCreatedAtDescIdDesc(status, PageRequest.of(page, size));
        Map<String, PracticeSet> bySlug = new HashMap<>();
        p.getContent().forEach(r -> bySlug.computeIfAbsent(r.getSetSlug(), k -> sets.findBySlug(k).orElse(null)));
        return new PageResponse<>(p.getContent().stream().map(r -> reportRow(r, bySlug.get(r.getSetSlug()))).toList(),
                p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages(), p.isFirst(), p.isLast());
    }

    @Transactional
    public PracticeAdminDtos.ReportRow resolve(long id, PracticeAdminDtos.ResolveRequest r) {
        if (r.status() == PracticeQuestionReport.Status.OPEN) {
            throw new BusinessValidationException("status", "a report is resolved as FIXED or DISMISSED");
        }
        PracticeQuestionReport report = reports.findById(id).orElseThrow(() -> new ResourceNotFoundException("Report", String.valueOf(id)));
        String note = InputSanitizer.clean(r.note());
        report.setStatus(r.status());
        report.setResolutionNote(note == null || note.isBlank() ? null : note);
        report.setResolvedAt(Instant.now(clock));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        report.setResolvedBy(auth == null ? "system" : auth.getName());
        reports.saveAndFlush(report);
        auditService.record("PRACTICE_REPORT_" + r.status(), "PRACTICE_REPORT", report.getId(),
                "question=" + report.getQuestionId() + (report.getResolutionNote() == null ? "" : ", note=" + report.getResolutionNote()));
        return reportRow(report, sets.findBySlug(report.getSetSlug()).orElse(null));
    }

    private static PracticeAdminDtos.ReportRow reportRow(PracticeQuestionReport r, PracticeSet set) {
        String qid = r.getQuestionId().substring(r.getQuestionId().indexOf('/') + 1);
        PracticeAdminDtos.QuestionView view = set == null ? null : set.getContent().questions().stream()
                .filter(q -> q.id().equals(qid)).findFirst()
                .map(q -> new PracticeAdminDtos.QuestionView(q.section(), q.topic(), q.prompt(), q.options(), q.answer(),
                        q.explanation(), q.hi()))
                .orElse(null);
        return new PracticeAdminDtos.ReportRow(r.getId(), r.getQuestionId(), r.getSetSlug(), set == null ? null : set.getTitle(),
                r.getReason(), r.getMessage(), r.getStatus(), r.getAccountId() != null, r.getCreatedAt(), r.getResolutionNote(),
                r.getResolvedBy(), r.getResolvedAt(), view);
    }
}
