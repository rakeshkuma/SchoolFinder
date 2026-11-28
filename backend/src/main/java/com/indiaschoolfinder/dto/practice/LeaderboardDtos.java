package com.indiaschoolfinder.dto.practice;

import java.time.Instant;
import java.util.List;

public final class LeaderboardDtos {

    private LeaderboardDtos() {
    }

    public enum Period { TODAY, WEEK, MONTH, ALL }

    /**
     * Which points count and who is compared. All null/false: every point, all of India. {@code daily}: only the daily
     * quiz. State, city and track narrow the participants; city matches only students who chose to show it.
     */
    public record Filter(Period period, String exam, String category, String section, boolean daily, String state,
                         String city, String track, String q) {
    }

    /**
     * One ranked participant. A student who is not publicly listed keeps their rank but shows no name or place
     * ({@code listed} false, nickname and places null). {@code accuracy}: correct ÷ attempted over the counted tests,
     * as a whole percentage; {@code streak}: consecutive days with practice up to today or yesterday.
     */
    public record Row(int rank, boolean listed, String nickname, String initials, String stateCode, String city, String track,
                      long points, int tests, Integer accuracy, int streak, boolean me) {
    }

    /** The requester's own place, with the students just above and below them. */
    public record MyRank(Row row, Row above, Row below) {
    }

    /**
     * A page of the ranking. {@code participants}: everyone ranked in this view; {@code matches}: the rows found by a
     * name search (equal to participants without one).
     */
    public record Page(Period period, Instant from, long participants, long matches, int page, int size, List<Row> rows,
                       MyRank me) {
    }
}
