package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.NotificationSource;
import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import com.indiaschoolfinder.repository.NotificationSyncRunRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Read-only views of the daily check: the small public status and the full staff view with run history. */
@Service
@Transactional(readOnly = true)
public class NotificationSyncStatusService {

    private final NotificationSyncService sync;
    private final NotificationSyncRunRepository runs;
    private final SiteUpdateRepository updates;
    private final SourceHealthService health;

    public NotificationSyncStatusService(NotificationSyncService sync, NotificationSyncRunRepository runs, SiteUpdateRepository updates,
                                         SourceHealthService health) {
        this.sync = sync;
        this.runs = runs;
        this.updates = updates;
        this.health = health;
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
        Map<String, NotificationSource> state = health.byKey();
        List<UpdateDtos.SourceInfo> sources = new java.util.ArrayList<>();
        Map<String, List<OfficialSourceAdapter>> families = new java.util.LinkedHashMap<>();
        for (OfficialSourceAdapter a : sync.sources()) {
            if (a.family() == null) {
                sources.add(info(a, sync.enabled(a), state.get(a.key())));
            } else {
                List<OfficialSourceAdapter> members = families.computeIfAbsent(a.family().key(), k -> new java.util.ArrayList<>());
                if (members.isEmpty()) sources.add(null); // the family's place in the list, filled below
                members.add(a);
            }
        }
        java.util.Iterator<List<OfficialSourceAdapter>> next = families.values().iterator();
        for (int i = 0; i < sources.size(); i++) {
            if (sources.get(i) == null) sources.set(i, familyInfo(next.next(), state));
        }
        int failing = (int) sources.stream().filter(s -> s.enabled() && s.consecutiveFailures() > 0).count();
        return new UpdateDtos.AdminSyncStatus(p.isEnabled(), sync.isRunning(), p.getCron(), sync.zone().getId(), p.getScheduleLabel(),
                sync.nextRunAt(), sync.lastCompletedRun().map(NotificationSyncRun::getFinishedAt).orElse(null),
                sync.lastRun().map(this::row).orElse(null), updates.countByStatus(SiteUpdate.Status.PENDING_REVIEW), sources,
                sync.registryProblems(), failing);
    }

    public PageResponse<UpdateDtos.SyncRunRow> history(int page, int size) {
        return PageResponse.of(runs.findAllByOrderByStartedAtDescIdDesc(PageRequest.of(page, size)), this::row);
    }

    /**
     * A family of sites as one line: how many sites, when they were last read, and which are failing (named in the error,
     * at most five). The family counts as failing only when more than a quarter of its sites fail; a few school sites
     * being down on a given day is normal.
     */
    private UpdateDtos.SourceInfo familyInfo(List<OfficialSourceAdapter> members, Map<String, NotificationSource> state) {
        OfficialSourceAdapter first = members.get(0);
        SourceProfile p = first.profile();
        int enabled = 0;
        java.time.Instant attempt = null;
        java.time.Instant success = null;
        List<String> failing = new java.util.ArrayList<>();
        for (OfficialSourceAdapter a : members) {
            if (!sync.enabled(a)) continue;
            enabled++;
            NotificationSource s = state.get(a.key());
            if (s == null) continue;
            if (s.getLastAttemptAt() != null && (attempt == null || s.getLastAttemptAt().isAfter(attempt))) attempt = s.getLastAttemptAt();
            if (s.getLastSuccessAt() != null && (success == null || s.getLastSuccessAt().isAfter(success))) success = s.getLastSuccessAt();
            if (s.getConsecutiveFailures() > 0) failing.add(a.key() + (s.getLastError() == null ? "" : " (" + s.getLastError() + ")"));
        }
        String error = failing.isEmpty() ? null : failing.size() + " of " + enabled + " sites failing: "
                + String.join("; ", failing.subList(0, Math.min(5, failing.size()))) + (failing.size() > 5 ? "; …" : "");
        boolean down = enabled > 0 && failing.size() * 4 > enabled;
        String outcome = attempt == null ? null : failing.isEmpty() ? "OK" : down ? "FAILED" : "PARTIAL";
        String name = first.family().name() + " (" + members.size() + " sites)";
        List<String> hosts = members.stream().flatMap(a -> a.hosts().stream()).sorted().limit(3).toList();
        return new UpdateDtos.SourceInfo(first.family().key(), name, first.listingUrl(), hosts, first.autoPublish(), first.reviewOnlyReason(),
                first.completeListing(), enabled > 0, first.family().name(), p.sourceCategory(), p.sector(), p.boarding(), null, null,
                p.noticeTypes().stream().map(Enum::name).sorted().toList(), p.method(), p.reliability(), first.schoolPostsOnly(),
                attempt, success, outcome, error, down ? failing.size() : 0);
    }

    private static UpdateDtos.SourceInfo info(OfficialSourceAdapter a, boolean enabled, NotificationSource s) {
        SourceProfile p = a.profile();
        return new UpdateDtos.SourceInfo(a.key(), a.name(), a.listingUrl(), a.hosts().stream().sorted().toList(), a.autoPublish(),
                a.reviewOnlyReason(), a.completeListing(), enabled, p.institution(), p.sourceCategory(), p.sector(), p.boarding(),
                p.stateCode(), p.city(), p.noticeTypes().stream().map(Enum::name).sorted().toList(), p.method(), p.reliability(),
                a.schoolPostsOnly(), s == null ? null : s.getLastAttemptAt(), s == null ? null : s.getLastSuccessAt(),
                s == null ? null : s.getLastOutcome(), s == null ? null : s.getLastError(), s == null ? 0 : s.getConsecutiveFailures());
    }

    private UpdateDtos.SyncRunRow row(NotificationSyncRun r) {
        List<SourceResult> results = sync.results(r);
        List<UpdateDtos.SourceRow> sources = results.stream()
                .map(s -> new UpdateDtos.SourceRow(s.key, s.name, s.outcome, s.error, s.durationMs, s.requests, s.listed, s.relevant,
                        s.ignored, s.created, s.updated, s.unchanged, s.published, s.pending, s.tooOld, s.duplicates, s.withdrawn,
                        s.createdJobs, s.createdAdmissions))
                .toList();
        return new UpdateDtos.SyncRunRow(r.getId(), r.getTrigger().name(), r.getStatus().name(), r.getStartedAt(), r.getFinishedAt(),
                r.getTriggeredBy(), r.getInstanceName(), r.getSourcesChecked(), r.getSourcesFailed(), r.getItemsFound(),
                r.getItemsCreated(), r.getItemsUpdated(), r.getItemsPublished(), r.getItemsPending(), r.getItemsExpired(),
                r.getItemsWithdrawn(), sources, results.stream().mapToInt(s -> s.createdJobs).sum(),
                results.stream().mapToInt(s -> s.createdAdmissions).sum(), results.stream().mapToInt(s -> s.duplicates).sum(),
                results.stream().mapToInt(s -> s.tooOld).sum());
    }

}
