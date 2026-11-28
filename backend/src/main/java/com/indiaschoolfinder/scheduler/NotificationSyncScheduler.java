package com.indiaschoolfinder.scheduler;

import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.notifications.NotificationSyncProperties;
import com.indiaschoolfinder.notifications.NotificationSyncService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The daily check of official websites, at app.notifications.cron in app.timezone (6:00 AM India time by default).
 * Active only when scheduling is enabled (SchedulingConfig); overlapping runs are refused by the service's lock.
 */
@Component
public class NotificationSyncScheduler {

    private final NotificationSyncService sync;
    private final NotificationSyncProperties props;

    public NotificationSyncScheduler(NotificationSyncService sync, NotificationSyncProperties props) {
        this.sync = sync;
        this.props = props;
    }

    @Scheduled(cron = "${app.notifications.cron:0 0 6 * * *}", zone = "${app.timezone:Asia/Kolkata}")
    public void checkOfficialSources() {
        if (props.isEnabled()) {
            sync.run(NotificationSyncRun.Trigger.SCHEDULED, "scheduler");
        }
    }
}
