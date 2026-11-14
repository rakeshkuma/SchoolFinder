package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.Challenge;
import com.indiaschoolfinder.entity.PracticeSet;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ChallengeDtos {

    private ChallengeDtos() {
    }

    public enum Status { UPCOMING, ACTIVE, COMPLETED }

    /** {@code maxScore}: every question right plus any completion bonus. {@code participants}: students who submitted. */
    public record Summary(String slug, String title, String description, Challenge.Kind kind, String examSlug,
                          PracticeSet.Category category, Challenge.Difficulty difficulty, int questions, int durationMinutes,
                          Instant startsAt, Instant endsAt, int maxScore, int maxAttempts, long participants, Status status,
                          Challenge.ResultRelease resultRelease) {
    }

    /** One of the student's submitted attempts; {@code attemptId} opens its review. */
    public record MyResult(Long attemptId, int score, int correct, int total, Integer durationSeconds, Instant submittedAt,
                           String reviewFlag) {
    }

    /** The student's own standing; {@code best} is null until results are released. */
    public record Mine(int attemptsUsed, int attemptsLeft, boolean inProgress, MyResult best) {
    }

    /** {@code mine}: null for someone who has not joined. */
    public record Detail(Summary summary, String rules, int pointsPerCorrect, int completionBonus, boolean leaderboardEnabled,
                         boolean resultsReleased, Mine mine) {
    }

    /** A started (or resumed) attempt. Questions never include answers. */
    public record Started(long attemptId, Instant startedAt, Instant deadlineAt, PracticeSessionDto session) {
    }

    public record SubmitRequest(@NotNull @Size(max = 100) Map<String, Integer> answers) {
    }

    /**
     * The server's result. {@code released} false: the score is held back until {@code releaseAt}, and {@code score} and
     * {@code points} are null. {@code durationSeconds} comes from the server's clock, not the browser's.
     */
    public record Submitted(boolean released, Instant releaseAt, ScoreResultDto score, AttemptDtos.Points points, Integer durationSeconds) {
    }

    /** Creating or changing a challenge. Questions are bank ids; the service checks each one exists. */
    public record SaveRequest(
            @NotBlank @Size(max = 80) @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") String slug,
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 1000) String description,
            @Size(max = 2000) String rules,
            @NotNull Challenge.Kind kind,
            @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String examSlug,
            PracticeSet.Category category,
            @NotNull Challenge.Difficulty difficulty,
            @NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 161) String> questionIds,
            @Min(1) @Max(300) int durationMinutes,
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            @Min(1) @Max(100) int pointsPerCorrect,
            @Min(0) @Max(1000) int completionBonus,
            @Min(1) @Max(10) int maxAttempts,
            @NotNull Challenge.ResultRelease resultRelease,
            boolean leaderboardEnabled) {
    }

    /** A challenge as editors see it, answers excluded. */
    public record AdminRow(long id, Summary summary, String rules, List<String> questionIds, int pointsPerCorrect, int completionBonus,
                           boolean leaderboardEnabled, boolean published, long attempts, long flagged) {
    }

    public record PublishRequest(boolean published) {
    }

    /** An attempt waiting for review. Nicknames and public ids only: moderators do not need a student's identity. */
    public record ReviewItem(long attemptId, String publicId, String nickname, String title, String mode, String challengeSlug,
                             int total, int attempted, int correct, Integer durationSeconds, String reviewFlag, Instant createdAt) {
    }

    /** {@code note} goes to the audit log. */
    public record ReviewDecision(@NotNull Decision decision, @NotBlank @Size(max = 500) String note) {
    }

    /** CLEAR: the flag was wrong, the attempt counts. VOID: it never counts and its points and badges are removed. */
    public enum Decision { CLEAR, VOID }

    public record ParticipantRow(String publicId, String nickname, String stateCode, boolean guest, boolean listed, boolean hidden,
                                 long points, long attempts, long flagged) {
    }

    public record HideRequest(boolean hidden, @NotBlank @Size(max = 500) String note) {
    }

    /** Real counts for the moderation screen. */
    public record Overview(long participants, long listed, long attemptsLast7Days, long awaitingReview, long activeChallenges) {
    }
}
