package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ParticipantDtos {

    private ParticipantDtos() {
    }

    /**
     * How old the student says they are. ADULT: 18 or over. MINOR_WITH_GUARDIAN: under 18, and a parent or guardian
     * agrees to the nickname being shown publicly (the student's own declaration). MINOR: under 18, never listed publicly.
     */
    public enum AgeConfirmation { ADULT, MINOR_WITH_GUARDIAN, MINOR }

    /** Joining as a guest, or a member's leaderboard settings. Nickname only: no real name, email or phone. */
    public record ProfileRequest(
            @NotBlank @Size(min = 3, max = 24) String nickname,
            @Pattern(regexp = "[A-Z]{2}") String stateCode,
            @Size(max = 80) String city,
            boolean showCity,
            @Pattern(regexp = "[A-Z0-9_]{2,40}") String track,
            @NotNull AgeConfirmation age,
            boolean publicListing) {
    }

    /** A participant's own view. {@code listed}: shown on public leaderboards now. */
    public record Profile(String publicId, String nickname, String stateCode, String city, boolean showCity, String track,
                          String ageBand, boolean publicListing, boolean listed, boolean member, long points, long attempts) {
    }

    /** Returned once, when a guest joins: the token is the guest's only key and is never shown again. */
    public record Joined(Profile profile, String token) {
    }

    /** A member claiming results a guest token earned in this browser. */
    public record ClaimRequest(@NotBlank @Size(max = 100) String token) {
    }
}
