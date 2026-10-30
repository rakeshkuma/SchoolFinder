package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.BankScoreRequest;
import com.indiaschoolfinder.dto.practice.PracticeBankDto;
import com.indiaschoolfinder.dto.practice.PracticeMode;
import com.indiaschoolfinder.dto.practice.PracticeSessionDto;
import com.indiaschoolfinder.dto.practice.PracticeSetDto;
import com.indiaschoolfinder.dto.practice.PracticeSetSummaryDto;
import com.indiaschoolfinder.dto.practice.ScoreRequest;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.entity.PracticeSet;
import com.indiaschoolfinder.service.PracticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Practice", description = "India School Finder practice quizzes, mock tests and question bank (original questions, not official)")
@Validated
@RestController
public class PracticeController {

    private final PracticeService practiceService;

    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @GetMapping("/api/v1/practice-sets")
    public List<PracticeSetSummaryDto> list(@RequestParam(required = false) @Size(max = 80) String exam,
                                            @RequestParam(required = false) PracticeSet.Category category) {
        return practiceService.list(exam, category);
    }

    @Operation(summary = "A set to attempt: questions and options without answers")
    @GetMapping("/api/v1/practice-sets/{slug}")
    public PracticeSetDto get(@PathVariable String slug) {
        return practiceService.get(slug);
    }

    @Operation(summary = "Score an attempt (nothing is stored); returns answers and explanations")
    @PostMapping("/api/v1/practice-sets/{slug}/score")
    public ScoreResultDto score(@PathVariable String slug, @Valid @RequestBody ScoreRequest request) {
        return practiceService.score(slug, request);
    }

    @Operation(summary = "What the question bank holds (exam, class, subject, topic, difficulty per question; no text or answers)")
    @GetMapping("/api/v1/practice-bank")
    public PracticeBankDto bank() {
        return practiceService.bank();
    }

    @Operation(summary = "Questions for one practice session, drawn from the bank, without answers",
            description = "mode: QUICK (5), TOPIC, MINI_MOCK (10), FULL, DAILY (same 10 for everyone today), REVISION or RETRY "
                    + "(with ids). Filters may be combined; ids, when given, replace the draw.")
    @GetMapping("/api/v1/practice-sessions")
    public PracticeSessionDto session(@RequestParam(defaultValue = "QUICK") PracticeMode mode,
                                      @RequestParam(required = false) @Size(max = 80) String exam,
                                      @RequestParam(required = false) @Size(max = 100) String level,
                                      @RequestParam(required = false) @Size(max = 60) String section,
                                      @RequestParam(required = false) @Size(max = 80) String topic,
                                      @RequestParam(required = false) @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty,
                                      @RequestParam(required = false) PracticeSet.Category category,
                                      @RequestParam(required = false) @Size(max = 80) String chapter,
                                      @RequestParam(defaultValue = "false") boolean hindi,
                                      @RequestParam(required = false) @Min(1) @Max(100) Integer count,
                                      @RequestParam(required = false) @Size(max = 100) List<@Pattern(regexp = "[a-z0-9-]+/[a-z0-9-]+") String> ids,
                                      @RequestParam(required = false) Long seed) {
        return practiceService.session(mode, new PracticeService.BankFilter(exam, level, section, topic, difficulty,
                category, chapter, hindi), count, ids, seed);
    }

    @Operation(summary = "Score a bank session (nothing is stored); returns answers, explanations and section/topic scores")
    @PostMapping("/api/v1/practice-sessions/score")
    public ScoreResultDto scoreSession(@Valid @RequestBody BankScoreRequest request) {
        return practiceService.scoreBank(request.questionIds(), request.answers());
    }
}
