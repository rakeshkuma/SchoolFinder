package com.indiaschoolfinder.scheduler;

import com.indiaschoolfinder.service.AdmissionService;
import com.indiaschoolfinder.service.RankingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Nightly jobs (Asia/Kolkata). Only active when SchedulingConfig is enabled. */
@Slf4j
@Component
public class DataMaintenanceScheduler {

    private final AdmissionService admissionService;
    private final RankingService rankingService;

    public DataMaintenanceScheduler(AdmissionService admissionService, RankingService rankingService) {
        this.admissionService = admissionService;
        this.rankingService = rankingService;
    }

    /** Moves admission cycles between UPCOMING / OPEN / CLOSED as dates pass (overrides are kept). */
    @Scheduled(cron = "${app.scheduling.admission-status-cron:0 5 0 * * *}", zone = "${app.timezone:Asia/Kolkata}")
    public void refreshAdmissionStatuses() {
        int changed = admissionService.refreshStatuses();
        log.info("Admission status refresh: {} cycle(s) changed", changed);
    }

    @Scheduled(cron = "${app.scheduling.ranking-cron:0 30 1 * * *}", zone = "${app.timezone:Asia/Kolkata}")
    public void recalculateRankings() {
        int rows = rankingService.recalculate(null);
        log.info("Ranking recalculation: {} school(s) scored", rows);
    }
}
