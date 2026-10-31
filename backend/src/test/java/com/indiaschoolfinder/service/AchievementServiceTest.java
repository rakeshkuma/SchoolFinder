package com.indiaschoolfinder.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class AchievementServiceTest {

    private static final Instant DAY_ONE = Instant.parse("2026-10-01T10:00:00Z");

    private static AchievementService.Attempt test(int day, String mode, int total, int attempted, int correct, String flag) {
        return new AchievementService.Attempt(DAY_ONE.plusSeconds(day * 86400L), mode, total, attempted, correct, null, null, flag, 0);
    }

    private static AchievementService.Outcome outcome(List<AchievementService.Attempt> attempts) {
        return AchievementService.fromAttempts(attempts, ZoneOffset.UTC);
    }

    @Test
    void flaggedOrBarelyAnsweredTestsDoNotCount() {
        var o = outcome(List.of(test(0, "QUICK", 10, 10, 10, "TOO_FAST"), test(0, "QUICK", 10, 10, 10, "NO_TIMING"),
                test(0, "QUICK", 10, 4, 4, null), test(0, "QUICK", 10, 0, 0, null)));
        assertThat(o.reached()).isEmpty();
        assertThat(o.current()).containsEntry("FIRST_TEST", 0);
    }

    @Test
    void aRetakenDailyQuizStillCountsAsATest() {
        assertThat(outcome(List.of(test(0, "DAILY", 10, 10, 8, "DAILY_REPEAT"))).reached()).containsKey("FIRST_TEST");
    }

    @Test
    void aBadgeIsDatedWhenItWasReached() {
        List<AchievementService.Attempt> tests = new ArrayList<>();
        IntStream.range(0, 12).forEach(i -> tests.add(test(i * 3, "QUICK", 5, 5, 3, null)));
        var o = outcome(tests);
        assertThat(o.reached().get("FIRST_TEST")).isEqualTo(tests.get(0).at());
        assertThat(o.reached().get("TESTS_10")).isEqualTo(tests.get(9).at());
        assertThat(o.reached()).doesNotContainKey("TESTS_50");
    }

    @Test
    void sevenDaysInARowEarnTheStreakAndAGapRestartsIt() {
        List<AchievementService.Attempt> broken = new ArrayList<>();
        IntStream.of(0, 1, 2, 3, 4, 5, 7, 8).forEach(d -> broken.add(test(d, "QUICK", 5, 5, 3, null)));
        var o = outcome(broken);
        assertThat(o.reached()).doesNotContainKey("STREAK_7");
        assertThat(o.current()).containsEntry("STREAK_7", 6);

        List<AchievementService.Attempt> run = new ArrayList<>();
        IntStream.range(0, 7).forEach(d -> {
            run.add(test(d, "QUICK", 5, 5, 3, null));
            run.add(test(d, "QUICK", 5, 5, 3, null)); // two tests on a day are still one day
        });
        assertThat(outcome(run).reached()).containsKey("STREAK_7");
    }

    @Test
    void accuracyNeedsEnoughQuestionsAndIgnoresRetakes() {
        assertThat(outcome(List.of(test(0, "QUICK", 99, 99, 99, null))).reached()).doesNotContainKey("ACCURACY_CHAMPION");
        assertThat(outcome(List.of(test(0, "QUICK", 100, 100, 90, null))).reached()).containsKey("ACCURACY_CHAMPION");
        assertThat(outcome(List.of(test(0, "QUICK", 100, 100, 89, null))).reached()).doesNotContainKey("ACCURACY_CHAMPION");
        assertThat(outcome(List.of(test(0, "RETRY", 100, 100, 100, null), test(0, "REVISION", 100, 100, 100, null))).reached())
                .doesNotContainKey("ACCURACY_CHAMPION");
    }

    @Test
    void theLongestStreakIsTheLongestRunOfDays() {
        LocalDate d = LocalDate.parse("2026-10-01");
        assertThat(ProgressService.longest(Set.of())).isZero();
        assertThat(ProgressService.longest(Set.of(d, d.plusDays(1), d.plusDays(5), d.plusDays(6), d.plusDays(7)))).isEqualTo(3);
    }
}
