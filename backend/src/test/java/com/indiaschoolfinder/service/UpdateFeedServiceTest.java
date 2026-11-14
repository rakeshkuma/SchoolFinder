package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.update.UpdateDtos.Badge;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** The badge an update shows follows only from its dates. */
class UpdateFeedServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

    @Test
    void aDeadlineWithinTwoWeeksIsClosingSoonEvenWhenTheNoticeIsNew() {
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(1), null, TODAY.plusDays(14), true, true)).isEqualTo(Badge.CLOSING_SOON);
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(30), null, TODAY, true, true)).isEqualTo(Badge.CLOSING_SOON);
        // Not a deadline (an exam date), or further away: no "closing soon".
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(30), null, TODAY.plusDays(3), false, false)).isEqualTo(Badge.UPCOMING);
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(30), null, TODAY.plusDays(15), true, true)).isEqualTo(Badge.OPEN);
    }

    @Test
    void freshNoticesAreNewForAWeekThenOpenUpdatedOrUpcoming() {
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(7), null, TODAY.plusDays(40), true, true)).isEqualTo(Badge.NEW);
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(8), null, TODAY.plusDays(40), true, true)).isEqualTo(Badge.OPEN);
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(20), TODAY.minusDays(2), TODAY.plusDays(40), false, false))
                .isEqualTo(Badge.UPDATED);
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(20), TODAY.minusDays(9), TODAY.plusDays(40), false, false))
                .isEqualTo(Badge.UPCOMING);
        // Nothing to say: old, nothing ahead.
        assertThat(UpdateFeedService.badge(TODAY, TODAY.minusDays(20), null, null, false, false)).isNull();
        // A date in the future is not "new" yet.
        assertThat(UpdateFeedService.badge(TODAY, TODAY.plusDays(1), null, null, false, false)).isNull();
    }
}
