package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.repository.NotificationSyncRunRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Read-only views of the daily check: the small public status and the full staff view with run history. */
@Service
@Transactional(readOnly = true)
public class NotificationSyncStatusService {

    private final NotificationSyncService sync;
    private final NotificationSyncRunRepository runs;
    private final SiteUpdateRepository updates;

    public NotificationSyncStatusService(NotificationSyncService sync, NotificationSyncRunRepository runs, SiteUpdateRepository updates) {
        this.sync = sync;
        this.runs = runs;
        this.updates = updates;
    }

    /** Public: when the official sources were last checked and when they are checked next. No errors, no sources. */
    public UpdateDtos.SyncStatus publicStatus() {
        NotificationSyncRun last = sync.lastCompletedRun().orElse(null);
        int enabled = (int) sync.sources().stream().filter(sync::enabled).count();
        return new UpdateDtos.SyncStatus(last == null ? null : last.getFinishedAt(), sync.nextRunAt(),
                sync.properties().getScheduleLabel(), enabled);
    }

    public UpdateDtos.AdminSyncStatus adminStatus() {
        NotificationSyncProperties p = sync.properties();
        List<UpdateDtos.SourceInfo> sources = sync.sources().stream().map(a -> info(a, sync.enabled(a))).toList();
        return new UpdateDtos.AdminSyncStatus(p.isEnabled(), sync.isRunning(), p.getCron(), sync.zone().getId(), p.getScheduleLabel(),
                sync.nextRunAt(), sync.lastCompletedRun().map(NotificationSyncRun::getFinishedAt).orElse(null),
                sync.lastRun().map(this::row).orElse(null), updates.countByStatus(SiteUpdate.Status.PENDING_REVIEW), sources);
    }

    public PageResponse<UpdateDtos.SyncRunRow> history(int page, int size) {
        return PageResponse.of(runs.findAllByOrderByStartedAtDescIdDesc(PageRequest.of(page, size)), this::row);
    }

    private static UpdateDtos.SourceInfo info(OfficialSourceAdapter a, boolean enabled) {
        return new UpdateDtos.SourceInfo(a.key(), a.name(), a.listingUrl(), a.hosts().stream().sorted().toList(), a.autoPublish(),
                a.reviewOnlyReason(), a.completeListing(), enabled);
    }

    private UpdateDtos.SyncRunRow row(NotificationSyncRun r) {
        List<UpdateDtos.SourceRow> sources = sync.results(r).stream()
                .map(s -> new UpdateDtos.SourceRow(s.key, s.name, s.outcome, s.error, s.durationMs, s.requests, s.listed, s.relevant,
                        s.ignored, s.created, s.updated, s.unchanged, s.published, s.pending, s.tooOld, s.duplicates, s.withdrawn))
                .toList();
        return new UpdateDtos.SyncRunRow(r.getId(), r.getTrigger().name(), r.getStatus().name(), r.getStartedAt(), r.getFinishedAt(),
                r.getTriggeredBy(), r.getInstanceName(), r.getSourcesChecked(), r.getSourcesFailed(), r.getItemsFound(),
                r.getItemsCreated(), r.getItemsUpdated(), r.getItemsPublished(), r.getItemsPending(), r.getItemsExpired(),
                r.getItemsWithdrawn(), sources);
    }

}
