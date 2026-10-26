package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.PracticeSetDto;
import com.indiaschoolfinder.dto.practice.PracticeSetSummaryDto;
import com.indiaschoolfinder.dto.practice.ScoreRequest;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.service.PracticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Practice", description = "India School Finder practice quizzes and mock tests (original questions, not official)")
@RestController
@RequestMapping("/api/v1/practice-sets")
public class PracticeController {

    private final PracticeService practiceService;

    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @GetMapping
    public List<PracticeSetSummaryDto> list(@RequestParam(required = false) String exam) {
        return practiceService.list(exam);
    }

    @Operation(summary = "A set to attempt: questions and options without answers")
    @GetMapping("/{slug}")
    public PracticeSetDto get(@PathVariable String slug) {
        return practiceService.get(slug);
    }

    @Operation(summary = "Score an attempt (nothing is stored); returns answers and explanations")
    @PostMapping("/{slug}/score")
    public ScoreResultDto score(@PathVariable String slug, @Valid @RequestBody ScoreRequest request) {
        return practiceService.score(slug, request);
    }
}
