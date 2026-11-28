package com.indiaschoolfinder.scheduler;

import com.indiaschoolfinder.seo.IndexNowProperties;
import com.indiaschoolfinder.seo.IndexNowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Submits the day's changed sitemap addresses to IndexNow at app.indexnow.cron (7:30 AM India time), after the 6:00 AM
 * check of official sources has published its notices. It never throws, so it cannot disturb other scheduled jobs.
 */
@Slf4j
@Component
public class IndexNowScheduler {

    private final IndexNowService indexNow;
    private final IndexNowProperties props;

    public IndexNowScheduler(IndexNowService indexNow, IndexNowProperties props) {
        this.indexNow = indexNow;
        this.props = props;
    }

    @Scheduled(cron = "${app.indexnow.cron:0 30 7 * * *}", zone = "${app.timezone:Asia/Kolkata}")
    public void submitChangedPages() {
        if (!props.isEnabled()) return;
        try {
            indexNow.submitChanged();
        } catch (RuntimeException e) {
            log.warn("IndexNow daily run failed: {}", e.toString());
        }
    }
}
