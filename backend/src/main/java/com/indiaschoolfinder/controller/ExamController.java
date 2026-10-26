package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.exam.ExamDetailDto;
import com.indiaschoolfinder.dto.exam.ExamNoticeDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.enums.ExamBoarding;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamMode;
import com.indiaschoolfinder.enums.ExamSchoolType;
import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.service.ExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import java.util.Set;

@Tag(name = "Exams", description = "School entrance exams and admission selection processes, with official sources")
@Validated
@RestController
@RequestMapping("/api/v1/exams")
public class ExamController {

    private final ExamService examService;

    public ExamController(ExamService examService) {
        this.examService = examService;
    }

    @Operation(summary = "Published exams with filters",
            description = "Statuses and dates come from confirmed official dates of each exam's current cycle. "
                    + "state: national exams always match; sort: relevance (default), deadline, exam_date, updated, name.")
    @GetMapping
    public PageResponse<ExamSummaryDto> list(@RequestParam(required = false) @Size(max = 100) String q,
                                             @RequestParam(required = false) @Min(1) @Max(12) Integer entryClass,
                                             @RequestParam(required = false) @Pattern(regexp = "[A-Za-z]{2}") String state,
                                             @RequestParam(required = false) ExamSchoolType schoolType,
                                             @RequestParam(required = false) ExamKind kind,
                                             @RequestParam(required = false) Set<ExamStatus> status,
                                             @RequestParam(required = false) ExamBoarding boarding,
                                             @RequestParam(required = false) Boolean free,
                                             @RequestParam(required = false) ExamMode mode,
                                             @RequestParam(required = false) @Pattern(regexp = "\\d{4}-\\d{2}") String session,
                                             @RequestParam(required = false) @Size(max = 100) String authority,
                                             @RequestParam(required = false) @Pattern(regexp = "\\d{4}-\\d{2}") String examMonth,
                                             @RequestParam(defaultValue = "relevance") String sort,
                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                             @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        ExamService.Filter filter = new ExamService.Filter(q, entryClass, state, schoolType, kind, status, boarding, free,
                mode, session, authority, examMonth == null ? null : YearMonth.parse(examMonth));
        return examService.list(filter, parseSort(sort), page, size);
    }

    @Operation(summary = "Recently published official notices, newest first")
    @GetMapping("/notices")
    public List<ExamNoticeDto> notices(@RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        return examService.notices(limit);
    }

    @Operation(summary = "Full exam profile: guide content, dates of every cycle and official notices")
    @GetMapping("/{slug}")
    public ExamDetailDto get(@PathVariable String slug) {
        return examService.get(slug);
    }

    private static ExamService.Sort parseSort(String sort) {
        return switch (sort.toLowerCase(java.util.Locale.ROOT)) {
            case "deadline" -> ExamService.Sort.DEADLINE;
            case "exam_date", "examdate" -> ExamService.Sort.EXAM_DATE;
            case "updated" -> ExamService.Sort.UPDATED;
            case "name" -> ExamService.Sort.NAME;
            default -> ExamService.Sort.RELEVANCE;
        };
    }
}
