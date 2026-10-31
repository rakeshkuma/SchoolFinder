package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.AttemptDtos;
import com.indiaschoolfinder.dto.practice.AttemptRequest;
import com.indiaschoolfinder.dto.practice.BookmarksRequest;
import com.indiaschoolfinder.dto.practice.SavedExamsRequest;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.service.MemberPracticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The signed-in member's practice history and saved exams. Under /api/v1/account, so every call needs a member
 * session and every change the CSRF token; each one only ever touches the caller's own rows.
 */
@Tag(name = "Account", description = "Member sign-up, sign-in, sign-out, verification, password recovery and profile")
@Validated
@RestController
@RequestMapping("/api/v1/account")
public class MemberPracticeController {

    private final MemberPracticeService service;

    public MemberPracticeController(MemberPracticeService service) {
        this.service = service;
    }

    @Operation(summary = "Score and save a practice attempt; the same clientId again returns the saved result")
    @PostMapping("/practice-attempts")
    public ResponseEntity<AttemptDtos.Saved> record(@AuthenticationPrincipal MemberPrincipal member,
                                                    @Valid @RequestBody AttemptRequest request) {
        AttemptDtos.Saved saved = service.record(member.accountId(), request);
        return ResponseEntity.status(saved.duplicate() ? HttpStatus.OK : HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/practice-attempts")
    public PageResponse<AttemptDtos.Summary> attempts(@AuthenticationPrincipal MemberPrincipal member,
                                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                                      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(member.accountId(), page, size);
    }

    @Operation(summary = "Question ids the member last answered wrongly (revision mode)")
    @GetMapping("/practice-attempts/revision")
    public AttemptDtos.Revision revision(@AuthenticationPrincipal MemberPrincipal member) {
        return service.revision(member.accountId());
    }

    @GetMapping("/practice-attempts/{id}")
    public AttemptDtos.Detail attempt(@AuthenticationPrincipal MemberPrincipal member, @PathVariable long id) {
        return service.get(member.accountId(), id);
    }

    @Operation(summary = "The member's latest attempts with topic scores and per-question outcomes, for the progress dashboard")
    @GetMapping("/practice-history")
    public List<AttemptDtos.HistoryItem> history(@AuthenticationPrincipal MemberPrincipal member,
                                                 @RequestParam(defaultValue = "200") @Min(1) @Max(200) int limit) {
        return service.history(member.accountId(), limit);
    }

    @GetMapping("/bookmarks")
    public List<String> bookmarks(@AuthenticationPrincipal MemberPrincipal member) {
        return service.bookmarks(member.accountId());
    }

    @PutMapping("/bookmarks/{setSlug}/{questionId}")
    public List<String> addBookmark(@AuthenticationPrincipal MemberPrincipal member,
                                    @PathVariable @Pattern(regexp = "[a-z0-9-]{1,80}") String setSlug,
                                    @PathVariable @Pattern(regexp = "[a-z0-9-]{1,80}") String questionId) {
        return service.addBookmark(member.accountId(), setSlug + "/" + questionId);
    }

    @DeleteMapping("/bookmarks/{setSlug}/{questionId}")
    public List<String> removeBookmark(@AuthenticationPrincipal MemberPrincipal member,
                                       @PathVariable String setSlug, @PathVariable String questionId) {
        return service.removeBookmark(member.accountId(), setSlug + "/" + questionId);
    }

    @Operation(summary = "Add questions bookmarked in the browser before signing in; returns the merged list")
    @PostMapping("/bookmarks/merge")
    public List<String> mergeBookmarks(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody BookmarksRequest request) {
        return service.mergeBookmarks(member.accountId(), request.questionIds());
    }

    @GetMapping("/saved-exams")
    public List<String> savedExams(@AuthenticationPrincipal MemberPrincipal member) {
        return service.savedExams(member.accountId());
    }

    @PutMapping("/saved-exams/{slug}")
    public List<String> saveExam(@AuthenticationPrincipal MemberPrincipal member,
                                 @PathVariable @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") String slug) {
        return service.saveExam(member.accountId(), slug);
    }

    @DeleteMapping("/saved-exams/{slug}")
    public List<String> removeExam(@AuthenticationPrincipal MemberPrincipal member, @PathVariable String slug) {
        return service.removeExam(member.accountId(), slug);
    }

    @Operation(summary = "Add exams saved in the browser before signing in; returns the merged list")
    @PostMapping("/saved-exams/merge")
    public List<String> merge(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody SavedExamsRequest request) {
        return service.merge(member.accountId(), request.slugs());
    }
}
