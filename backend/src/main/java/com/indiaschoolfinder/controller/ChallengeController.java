package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.ChallengeDtos;
import com.indiaschoolfinder.dto.practice.LeaderboardDtos;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.service.ChallengeService;
import com.indiaschoolfinder.service.ParticipantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Published challenges. Anyone can read them; guests take part with X-Participant-Token, members under /api/v1/account. */
@Tag(name = "Challenges")
@Validated
@RestController
@RequestMapping("/api/v1/challenges")
public class ChallengeController {

    private final ChallengeService challenges;
    private final ParticipantService participants;

    public ChallengeController(ChallengeService challenges, ParticipantService participants) {
        this.challenges = challenges;
        this.participants = participants;
    }

    @GetMapping
    public List<ChallengeDtos.Summary> list() {
        return challenges.list();
    }

    @Operation(summary = "A challenge with its rules, and the requester's own standing when known")
    @GetMapping("/{slug}")
    public ChallengeDtos.Detail detail(@AuthenticationPrincipal MemberPrincipal member, @PathVariable String slug,
                                       @RequestHeader(value = ParticipantController.TOKEN_HEADER, required = false) String token) {
        return challenges.detail(slug, participants.find(member == null ? null : member.accountId(), token));
    }

    @Operation(summary = "The challenge's ranking: best valid attempt, by score, accuracy, time, then earliest submission")
    @GetMapping("/{slug}/leaderboard")
    public LeaderboardDtos.Page leaderboard(@AuthenticationPrincipal MemberPrincipal member, @PathVariable String slug,
                                            @RequestHeader(value = ParticipantController.TOKEN_HEADER, required = false) String token,
                                            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
                                            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return challenges.board(slug, page, size, participants.find(member == null ? null : member.accountId(), token));
    }

    @Operation(summary = "Start an attempt as a guest, or return the one in progress")
    @PostMapping("/{slug}/attempts")
    public ChallengeDtos.Started start(@PathVariable String slug,
                                       @RequestHeader(value = ParticipantController.TOKEN_HEADER, required = false) String token) {
        return challenges.start(slug, participants.guest(token).getId());
    }

    @Operation(summary = "Submit a guest's attempt; the server scores it, and a repeat returns the first result")
    @PostMapping("/{slug}/attempts/{id}/submit")
    public ChallengeDtos.Submitted submit(@PathVariable String slug, @PathVariable long id,
                                          @RequestHeader(value = ParticipantController.TOKEN_HEADER, required = false) String token,
                                          @Valid @RequestBody ChallengeDtos.SubmitRequest request) {
        return challenges.submit(slug, id, participants.guest(token), request.answers());
    }
}
