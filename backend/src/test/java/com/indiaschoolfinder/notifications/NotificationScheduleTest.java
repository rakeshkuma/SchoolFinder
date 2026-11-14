package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.scheduler.NotificationSyncScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;

import java.io.InputStream;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** The daily check fires at 6:00 AM India time, once a day, from the property in application.properties. */
class NotificationScheduleTest {

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    @Test
    void theScheduledMethodReadsTheCronAndZoneFromProperties() throws Exception {
        Scheduled s = NotificationSyncScheduler.class.getMethod("checkOfficialSources").getAnnotation(Scheduled.class);
        assertThat(s.cron()).isEqualTo("${app.notifications.cron:0 0 6 * * *}");
        assertThat(s.zone()).isEqualTo("${app.timezone:Asia/Kolkata}");

        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("app.notifications.cron")).isEqualTo("${NOTIFICATIONS_SYNC_CRON:0 0 6 * * *}");
        assertThat(p.getProperty("app.timezone")).isEqualTo("Asia/Kolkata");
        assertThat(new NotificationSyncProperties().getCron()).isEqualTo("0 0 6 * * *");
    }

    @Test
    void sixInTheMorningIndiaTimeEveryDay() {
        CronExpression cron = CronExpression.parse("0 0 6 * * *");
        ZonedDateTime justAfter = ZonedDateTime.of(2026, 11, 14, 6, 0, 1, 0, INDIA);
        assertThat(cron.next(justAfter)).isEqualTo(ZonedDateTime.of(2026, 11, 15, 6, 0, 0, 0, INDIA));
        ZonedDateTime lateNight = ZonedDateTime.of(2026, 11, 14, 23, 59, 0, 0, INDIA);
        assertThat(cron.next(lateNight)).isEqualTo(ZonedDateTime.of(2026, 11, 15, 6, 0, 0, 0, INDIA));
        // 6:00 IST is 00:30 UTC: a server clock in UTC still fires at the right moment.
        assertThat(cron.next(justAfter).withZoneSameInstant(ZoneId.of("UTC")).toLocalTime().toString()).isEqualTo("00:30");
        // Two consecutive firings are 24 hours apart (India has no daylight saving time).
        ZonedDateTime first = cron.next(justAfter);
        assertThat(java.time.Duration.between(first, cron.next(first)).toHours()).isEqualTo(24);
    }
}
