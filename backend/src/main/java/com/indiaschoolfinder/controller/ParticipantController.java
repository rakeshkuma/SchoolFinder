package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.AttemptDtos;
import com.indiaschoolfinder.dto.practice.AttemptRequest;
import com.indiaschoolfinder.dto.practice.ParticipantDtos;
import com.indiaschoolfinder.dto.practice.ProgressDtos;
import com.indiaschoolfinder.service.MemberPracticeService;
import com.indiaschoolfinder.service.ParticipantService;
import com.indiaschoolfinder.service.ProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Guest participation in practice rankings, without an account. Joining returns a secret token once; the browser
 * sends it back in X-Participant-Token. Members use /api/v1/account/participant instead.
 */
@Tag(name = "Practice participants (guests)")
@Validated
@RestController
@RequestMapping("/api/v1/participants")
public class ParticipantController {

    static final String TOKEN_HEADER = "X-Participant-Token";

    private final ParticipantService participants;
    private final MemberPracticeService practice;
    private final ProgressService progress;

    public ParticipantController(ParticipantService participants, MemberPracticeService practice, ProgressService progress) {
        this.participants = participants;
        this.practice = practice;
        this.progress = progress;
    }

    @Operation(summary = "Join as a guest with a nickname; the token in the response is shown only once")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantDtos.Joined join(@Valid @RequestBody ParticipantDtos.ProfileRequest request) {
        return participants.joinAsGuest(request);
    }

    @GetMapping("/me")
    public ParticipantDtos.Profile me(@RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        return participants.profile(participants.guest(token));
    }

    @PutMapping("/me")
    public ParticipantDtos.Profile update(@RequestHeader(value = TOKEN_HEADER, required = false) String token,
                                          @Valid @RequestBody ParticipantDtos.ProfileRequest request) {
        return participants.updateGuest(token, request);
    }

    @Operation(summary = "Delete this guest and every result and point that came with it")
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        participants.deleteGuest(token);
    }

    @Operation(summary = "Score and save a guest's attempt; the same clientId again returns the saved result")
    @PostMapping("/me/attempts")
    public ResponseEntity<AttemptDtos.Saved> record(@RequestHeader(value = TOKEN_HEADER, required = false) String token,
                                                    @Valid @RequestBody AttemptRequest request) {
        AttemptDtos.Saved saved = practice.recordGuest(participants.guest(token), request);
        return ResponseEntity.status(saved.duplicate() ? HttpStatus.OK : HttpStatus.CREATED).body(saved);
    }

    @Operation(summary = "One of this guest's attempts, reviewed question by question")
    @GetMapping("/me/attempts/{id}")
    public AttemptDtos.Detail attempt(@RequestHeader(value = TOKEN_HEADER, required = false) String token, @PathVariable long id) {
        return practice.guestAttempt(participants.guest(token), id);
    }

    @Operation(summary = "This guest's latest attempts with topic scores and per-question outcomes")
    @GetMapping("/me/history")
    public List<AttemptDtos.HistoryItem> history(@RequestHeader(value = TOKEN_HEADER, required = false) String token,
                                                 @RequestParam(defaultValue = "200") @Min(1) @Max(200) int limit) {
        return practice.guestHistory(participants.guest(token), limit);
    }

    @Operation(summary = "This guest's streaks, rank, weekly and monthly progress, daily quiz history and badges")
    @GetMapping("/me/progress")
    public ProgressDtos.Report progress(@RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        return progress.report(participants.guest(token).getId());
    }
}
