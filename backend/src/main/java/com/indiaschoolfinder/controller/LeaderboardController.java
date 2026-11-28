package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.LeaderboardDtos;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.service.LeaderboardService;
import com.indiaschoolfinder.service.ParticipantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Practice leaderboard")
@Validated
@RestController
public class LeaderboardController {

    private final LeaderboardService leaderboard;
    private final ParticipantService participants;
    private final com.indiaschoolfinder.service.AchievementService achievements;

    public LeaderboardController(LeaderboardService leaderboard, ParticipantService participants,
                                 com.indiaschoolfinder.service.AchievementService achievements) {
        this.leaderboard = leaderboard;
        this.participants = participants;
        this.achievements = achievements;
    }

    @Operation(summary = "Every badge and how to earn it; a student's own badges are in their progress report")
    @GetMapping("/api/v1/leaderboard/achievements")
    public java.util.List<com.indiaschoolfinder.dto.practice.ProgressDtos.Achievement> achievements() {
        return achievements.catalogue();
    }

    @Operation(summary = "Ranked students by practice points",
            description = "Filters combine: period (TODAY, WEEK, MONTH, ALL), exam, category (ENTRANCE, SCHOOL, OLYMPIAD, "
                    + "COMPETITIVE), section (subject), daily (daily quiz only), state, city (students who show it), track "
                    + "and q (nickname search). 'me' is filled for a signed-in member or a guest sending X-Participant-Token.")
    @GetMapping("/api/v1/leaderboard")
    public LeaderboardDtos.Page leaderboard(
            @AuthenticationPrincipal MemberPrincipal member,
            @RequestHeader(value = "X-Participant-Token", required = false) String token,
            @RequestParam(defaultValue = "ALL") LeaderboardDtos.Period period,
            @RequestParam(required = false) @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String exam,
            @RequestParam(required = false) @Pattern(regexp = "ENTRANCE|SCHOOL|OLYMPIAD|COMPETITIVE") String category,
            @RequestParam(required = false) @Size(max = 60) String section,
            @RequestParam(defaultValue = "false") boolean daily,
            @RequestParam(required = false) @Pattern(regexp = "[A-Z]{2}") String state,
            @RequestParam(required = false) @Size(max = 80) String city,
            @RequestParam(required = false) @Pattern(regexp = "[A-Z0-9_]{2,40}") String track,
            @RequestParam(required = false) @Size(max = 24) String q,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        Long me = participants.find(member == null ? null : member.accountId(), token);
        return leaderboard.page(new LeaderboardDtos.Filter(period, exam, category, blankToNull(section), daily, state,
                blankToNull(city), track, blankToNull(q)), page, size, me);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
