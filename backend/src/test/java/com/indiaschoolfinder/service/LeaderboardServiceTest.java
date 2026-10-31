package com.indiaschoolfinder.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class LeaderboardServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 31);

    @Test
    void aStreakCountsConsecutiveDaysEndingTodayOrYesterday() {
        assertThat(LeaderboardService.streak(Set.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2)), TODAY)).isEqualTo(3);
        // Not practised yet today: yesterday's run still counts until the day is over.
        assertThat(LeaderboardService.streak(Set.of(TODAY.minusDays(1), TODAY.minusDays(2)), TODAY)).isEqualTo(2);
        assertThat(LeaderboardService.streak(Set.of(TODAY.minusDays(2)), TODAY)).isZero();
        assertThat(LeaderboardService.streak(Set.of(TODAY, TODAY.minusDays(2)), TODAY)).isEqualTo(1);
    }

    @Test
    void initialsComeFromTheFirstTwoWordsInAnyScript() {
        assertThat(LeaderboardService.initials("Star learner")).isEqualTo("SL");
        assertThat(LeaderboardService.initials("asha")).isEqualTo("A");
        assertThat(LeaderboardService.initials("तारा Star")).isEqualTo("तS");
    }
}
