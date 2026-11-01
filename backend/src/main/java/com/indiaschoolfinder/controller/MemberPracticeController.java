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

    private final com.indiaschoolfinder.service.ParticipantService participants;

    private final com.indiaschoolfinder.service.ChallengeService challenges;

    public MemberPracticeController(MemberPracticeService service, com.indiaschoolfinder.service.ParticipantService participants,
                                    com.indiaschoolfinder.service.ChallengeService challenges) {
        this.service = service;
        this.participants = participants;
        this.challenges = challenges;
    }

    @Operation(summary = "Score and save a practice attempt; the same clientId again returns the saved result")
    @PostMapping("/practice-attempts")
    public ResponseEntity<AttemptDtos.Saved> record(@AuthenticationPrincipal MemberPrincipal member,
                                                    @Valid @RequestBody AttemptRequest request) {
        AttemptDtos.Saved saved = service.record(member.accountId(), request);
        return ResponseEntity.status(saved.duplicate() ? HttpStatus.OK : HttpStatus.CREATED).body(saved);
    }

    @Operation(summary = "The member's leaderboard settings and totals (created privately on first use)")
    @GetMapping("/participant")
    public com.indiaschoolfinder.dto.practice.ParticipantDtos.Profile participant(@AuthenticationPrincipal MemberPrincipal member) {
        return participants.memberProfile(member.accountId());
    }

    @PutMapping("/participant")
    public com.indiaschoolfinder.dto.practice.ParticipantDtos.Profile updateParticipant(
            @AuthenticationPrincipal MemberPrincipal member,
            @Valid @RequestBody com.indiaschoolfinder.dto.practice.ParticipantDtos.ProfileRequest request) {
        return participants.updateMember(member.accountId(), request);
    }

    @Operation(summary = "Move results earned as a guest in this browser into the account")
    @PostMapping("/participant/claim")
    public com.indiaschoolfinder.dto.practice.ParticipantDtos.Profile claim(
            @AuthenticationPrincipal MemberPrincipal member,
            @Valid @RequestBody com.indiaschoolfinder.dto.practice.ParticipantDtos.ClaimRequest request) {
        return participants.claim(member.accountId(), request.token());
    }

    @Operation(summary = "Start an attempt at a challenge, or return the one in progress")
    @PostMapping("/challenges/{slug}/attempts")
    public com.indiaschoolfinder.dto.practice.ChallengeDtos.Started startChallenge(@AuthenticationPrincipal MemberPrincipal member,
                                                                                   @PathVariable String slug) {
        return challenges.start(slug, participants.member(member.accountId()).getId());
    }

    @Operation(summary = "Submit a challenge attempt; the server scores it, and a repeat returns the first result")
    @PostMapping("/challenges/{slug}/attempts/{id}/submit")
    public com.indiaschoolfinder.dto.practice.ChallengeDtos.Submitted submitChallenge(
            @AuthenticationPrincipal MemberPrincipal member, @PathVariable String slug, @PathVariable long id,
            @Valid @RequestBody com.indiaschoolfinder.dto.practice.ChallengeDtos.SubmitRequest request) {
        return challenges.submit(slug, id, participants.member(member.accountId()), request.answers());
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

    @Operation(summary = "The member's streaks, rank, weekly and monthly progress, daily quiz history and badges")
    @GetMapping("/progress")
    public com.indiaschoolfinder.dto.practice.ProgressDtos.Report progress(@AuthenticationPrincipal MemberPrincipal member) {
        return service.progress(member.accountId());
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
