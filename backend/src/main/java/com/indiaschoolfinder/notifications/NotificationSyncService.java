package com.indiaschoolfinder.notifications;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.NotificationSyncRun;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import com.indiaschoolfinder.notifications.fetch.HttpTransport;
import com.indiaschoolfinder.notifications.fetch.UrlPolicy;
import com.indiaschoolfinder.notifications.opportunity.OpportunityEnricher;
import com.indiaschoolfinder.notifications.registry.SourceRegistry;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceLayoutException;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.repository.NotificationSyncRunRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.net.InetAddress;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Runs the check of every approved official source, once a day by default (see NotificationSyncScheduler).
 *
 * <p>Only one run at a time, across all servers: a run needs this JVM's flag and a PostgreSQL advisory lock held on its
 * own connection (released if the server dies). Each source is read and applied separately, so one failing site never
 * stops the others; the run is recorded with every source's result. On start-up, runs left RUNNING by a stopped server
 * are marked ABANDONED, and if the last successful run is more than a day old, one run is started after a short delay.
 * On shutdown the current run stops between sources and is recorded as ABANDONED.
 *
 * <p>Nothing here is reachable without signing in: the public site only reads the stored results.
 */
@Slf4j
@Service
public class NotificationSyncService {

    /** pg advisory lock key ("SDNS"). */
    static final long LOCK_KEY = 0x5344_4E53L;
    private static final List<NotificationSyncRun.Status> COMPLETED =
            List.of(NotificationSyncRun.Status.SUCCEEDED, NotificationSyncRun.Status.PARTIAL);

    public enum ManualStart { STARTED, ALREADY_RUNNING, COOLDOWN, DISABLED }

    /** Run records older than this are deleted (operational data; the notices themselves are never deleted). */
    static final Duration RUN_RETENTION = Duration.ofDays(180);

    private final NotificationSyncProperties props;
    private final List<OfficialSourceAdapter> adapters;
    private final SourceRegistry registry;
    private final SourceHealthService health;
    private final OpportunityEnricher enricher;
    private final NotificationIngestService ingest;
    private final NotificationSyncRunRepository runs;
    private final SiteUpdateRepository updates;
    private final DataSource dataSource;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    private final Clock clock;
    private final ZoneId zone;
    private final boolean schedulingEnabled;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile boolean stopping;
    private volatile HttpTransport transport;
    private volatile FetchSession.Sleeper sleeper = d -> Thread.sleep(d.toMillis());
    private final ScheduledExecutorService background = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "notification-sync");
        t.setDaemon(true);
        return t;
    });

    public NotificationSyncService(NotificationSyncProperties props, List<OfficialSourceAdapter> adapters,
                                   NotificationIngestService ingest, NotificationSyncRunRepository runs,
                                   SiteUpdateRepository updates, DataSource dataSource, TransactionTemplate tx,
                                   ObjectMapper json, Clock clock,
                                   @Value("${app.timezone:Asia/Kolkata}") String timezone,
                                   @Value("${app.scheduling.enabled:true}") boolean schedulingEnabled,
                                   SourceRegistry registry, SourceHealthService health, OpportunityEnricher enricher) {
        this.props = props;
        // Built-in adapters first, then the reviewed registry file; a registry key that repeats a built-in one is left out.
        List<OfficialSourceAdapter> all = new ArrayList<>(adapters);
        java.util.Set<String> keys = new java.util.HashSet<>();
        adapters.forEach(a -> keys.add(a.key()));
        for (OfficialSourceAdapter a : registry.adapters()) {
            if (keys.add(a.key())) {
                all.add(a);
            } else {
                log.error("Source registry: key {} is already used by a built-in source; the registry entry is left out", a.key());
            }
        }
        this.adapters = all.stream().sorted(Comparator.comparing(OfficialSourceAdapter::key)).toList();
        this.registry = registry;
        this.health = health;
        this.enricher = enricher;
        this.ingest = ingest;
        this.runs = runs;
        this.updates = updates;
        this.dataSource = dataSource;
        this.tx = tx;
        this.json = json;
        this.clock = clock;
        this.zone = ZoneId.of(timezone);
        this.schedulingEnabled = schedulingEnabled;
        this.transport = new com.indiaschoolfinder.notifications.fetch.JdkHttpTransport(props.getHttp().getConnectTimeout());
    }

    /** For tests: canned HTTP answers and no real waiting. */
    void useTransport(HttpTransport transport, FetchSession.Sleeper sleeper) {
        this.transport = transport;
        this.sleeper = sleeper;
    }

    public List<OfficialSourceAdapter> sources() {
        return adapters;
    }

    public boolean isRunning() {
        return running.get();
    }

    public boolean enabled(OfficialSourceAdapter a) {
        if (!props.getOnlySources().isEmpty() && !props.getOnlySources().contains(a.key())) {
            return false;
        }
        return a.enabledByDefault() && !props.getDisabledSources().contains(a.key());
    }

    /** Entries of the registry file that could not be used, with the reason (for staff). */
    public List<String> registryProblems() {
        return registry.problems();
    }

    /** Runs every enabled source now. Empty when another run (here or on another server) is in progress. */
    public Optional<NotificationSyncRun> run(NotificationSyncRun.Trigger trigger, String actor) {
        return run(trigger, actor, clock.instant());
    }

    Optional<NotificationSyncRun> run(NotificationSyncRun.Trigger trigger, String actor, Instant now) {
        if (!running.compareAndSet(false, true)) {
            log.info("Notification sync ({}) skipped: a run is already in progress here", trigger);
            return Optional.empty();
        }
        try (Connection lock = dataSource.getConnection()) {
            if (!tryLock(lock)) {
                log.info("Notification sync ({}) skipped: another server holds the run lock", trigger);
                return Optional.empty();
            }
            try {
                return Optional.of(execute(trigger, actor, now));
            } finally {
                unlock(lock);
            }
        } catch (SQLException e) {
            log.error("Notification sync ({}) could not take the run lock: {}", trigger, e.getMessage());
            return Optional.empty();
        } finally {
            running.set(false);
        }
    }

    private NotificationSyncRun execute(NotificationSyncRun.Trigger trigger, String actor, Instant now) {
        LocalDate today = now.atZone(zone).toLocalDate();
        NotificationSyncRun run = new NotificationSyncRun();
        run.setTrigger(trigger);
        run.setStartedAt(now);
        run.setTriggeredBy(actor);
        run.setInstanceName(instanceName());
        run = runs.save(run);
        log.info("Notification sync #{} ({}) started", run.getId(), trigger);
        enricher.clearCache();
        try {
            health.register(adapters, this::enabled, now);
        } catch (RuntimeException e) {
            log.warn("Notification sync #{}: could not update the source registry table: {}", run.getId(), e.toString());
        }
        List<SourceResult> results = new ArrayList<>();
        boolean interrupted = false;
        for (OfficialSourceAdapter source : adapters) {
            SourceResult r = new SourceResult(source.key(), source.name());
            results.add(r);
            if (!enabled(source)) {
                r.outcome = "SKIPPED";
                r.error = source.enabledByDefault() ? "switched off in settings" : "switched off in the source registry";
                continue;
            }
            if (stopping || interrupted) {
                r.outcome = "SKIPPED";
                r.error = "the server was stopping";
                continue;
            }
            long t0 = System.nanoTime();
            FetchSession session = new FetchSession(props.getHttp(), transport, sleeper, source.hosts(), () -> stopping);
            try {
                SourceListing listing = source.fetch(session, today);
                tx.executeWithoutResult(s -> ingest.apply(source, listing, now, today, r));
                r.outcome = "OK";
                excerpts(source, r);
            } catch (FetchException e) {
                r.outcome = e.kind() == FetchException.Kind.BLOCKED || e.kind() == FetchException.Kind.ROBOTS ? "BLOCKED"
                        : e.kind() == FetchException.Kind.STOPPED ? "SKIPPED" : "FAILED";
                r.error = e.getMessage();
                interrupted |= e.kind() == FetchException.Kind.STOPPED;
            } catch (SourceLayoutException e) {
                r.outcome = "FAILED";
                r.error = "page layout changed: " + e.getMessage();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                r.outcome = "SKIPPED";
                r.error = "interrupted (server stopping)";
                interrupted = true;
            } catch (RuntimeException e) {
                r.outcome = "FAILED";
                r.error = e.getClass().getSimpleName() + (e.getMessage() == null ? "" : ": " + UrlPolicyAbbrev.of(e.getMessage()));
                log.warn("Notification sync source {} failed", source.key(), e);
            } finally {
                r.requests = session.requests();
                r.durationMs = (System.nanoTime() - t0) / 1_000_000;
            }
            try {
                health.record(source.key(), r, now);
            } catch (RuntimeException e) {
                log.warn("Notification sync #{}: could not record the health of {}: {}", run.getId(), source.key(), e.toString());
            }
            log.info("Notification sync #{} {}: {} (listed {}, relevant {}, new {}, changed {}, published {}, pending {}){}",
                    run.getId(), source.key(), r.outcome, r.listed, r.relevant, r.created, r.updated, r.published, r.pending,
                    r.error == null ? "" : " - " + r.error);
        }
        if (!interrupted) {
            backfill(run.getId());
        }
        int expired = interrupted ? 0 : tx.execute(s -> ingest.expire(today));
        finish(run, results, expired, interrupted, clock.instant().isBefore(now) ? now : clock.instant());
        return run;
    }

    private void excerpts(OfficialSourceAdapter source, SourceResult r) throws InterruptedException {
        NotificationSyncProperties.Pdf pdf = props.getPdf();
        if (!pdf.isExcerpts() || r.newPendingIds.isEmpty()) {
            return;
        }
        FetchSession session = new FetchSession(props.getHttp(), transport, sleeper, source.documentHosts(), () -> stopping);
        int read = 0;
        for (Long id : r.newPendingIds) {
            if (read >= pdf.getMaxPerSource() || stopping) {
                break;
            }
            Optional<SiteUpdate> u = updates.findById(id);
            String url = u.map(SiteUpdate::getSourceUrl).orElse(null);
            boolean document = url != null && (url.toLowerCase(java.util.Locale.ROOT).contains(".pdf") || url.contains("/download"));
            if (!document || !UrlPolicy.allowed(url, source.documentHosts())) {
                continue;
            }
            read++;
            try {
                String text = PdfExcerpts.excerpt(session.get(url, pdf.getMaxBytes()).body(), pdf.getMaxPages(), pdf.getMaxChars());
                if (text != null) {
                    tx.executeWithoutResult(s -> ingest.addExcerpt(id, text));
                }
            } catch (FetchException e) {
                log.debug("No excerpt for update {}: {}", id, e.getMessage());
            }
        }
        r.requests += session.requests();
    }

    private void finish(NotificationSyncRun run, List<SourceResult> results, int expired, boolean interrupted, Instant end) {
        long checked = results.stream().filter(r -> !"SKIPPED".equals(r.outcome)).count();
        long ok = results.stream().filter(r -> "OK".equals(r.outcome)).count();
        long bad = results.stream().filter(r -> "FAILED".equals(r.outcome) || "BLOCKED".equals(r.outcome)).count();
        run.setSourcesChecked((int) checked);
        run.setSourcesFailed((int) bad);
        run.setItemsFound(results.stream().mapToInt(r -> r.relevant).sum());
        run.setItemsCreated(results.stream().mapToInt(r -> r.created).sum());
        run.setItemsUpdated(results.stream().mapToInt(r -> r.updated).sum());
        run.setItemsPublished(results.stream().mapToInt(r -> r.published).sum());
        run.setItemsPending(results.stream().mapToInt(r -> r.pending).sum());
        run.setItemsWithdrawn(results.stream().mapToInt(r -> r.withdrawn).sum());
        run.setItemsExpired(expired);
        run.setStatus(interrupted ? NotificationSyncRun.Status.ABANDONED
                : bad == 0 ? NotificationSyncRun.Status.SUCCEEDED
                : ok > 0 ? NotificationSyncRun.Status.PARTIAL : NotificationSyncRun.Status.FAILED);
        run.setFinishedAt(end);
        try {
            run.setDetails(json.writeValueAsString(results));
        } catch (JsonProcessingException e) {
            run.setDetails("[]");
        }
        runs.save(run);
        log.info("Notification sync #{} finished {}: {} source(s) checked, {} failed or blocked; {} new ({} published, {} pending; "
                        + "{} jobs, {} admissions), {} changed, {} expired, {} withdrawn", run.getId(), run.getStatus(),
                run.getSourcesChecked(), bad, run.getItemsCreated(), run.getItemsPublished(), run.getItemsPending(),
                results.stream().mapToInt(r -> r.createdJobs).sum(), results.stream().mapToInt(r -> r.createdAdmissions).sum(),
                run.getItemsUpdated(), expired, run.getItemsWithdrawn());
        try {
            Integer pruned = tx.execute(s -> runs.deleteFinishedBefore(end.minus(RUN_RETENTION)));
            if (pruned != null && pruned > 0) {
                log.info("Notification sync: {} run record(s) older than {} days deleted", pruned, RUN_RETENTION.toDays());
            }
        } catch (RuntimeException e) {
            log.warn("Notification sync: could not delete old run records: {}", e.toString());
        }
    }

    /** Fills in admission and job notices stored without their facts (a batch per call); never fails a run. */
    private void backfill(Long runId) {
        try {
            java.util.Map<String, OfficialSourceAdapter> byKey = new java.util.HashMap<>();
            adapters.forEach(a -> byKey.put(a.key(), a));
            Integer n = tx.execute(s -> ingest.enrichExisting(byKey));
            String when = runId == null ? "at start-up" : "#" + runId;
            if (n != null && n > 0) {
                log.info("Notification sync {}: {} earlier admission or job notice(s) given their facts and page address", when, n);
            }
        } catch (RuntimeException e) {
            log.warn("Notification sync {}: filling in earlier notices failed: {}", runId == null ? "at start-up" : "#" + runId, e.toString());
        }
    }

    /** Each source's result in a stored run. */
    public List<SourceResult> results(NotificationSyncRun run) {
        if (run.getDetails() == null || run.getDetails().isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(run.getDetails(), new TypeReference<List<SourceResult>>() { });
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    // --- staff "check now" ------------------------------------------------------------------------------------------

    /** Starts a run in the background for a signed-in admin; refused while one runs or within the cool-down. */
    public ManualStart startManual(String actor) {
        if (!props.isEnabled()) {
            return ManualStart.DISABLED;
        }
        if (running.get()) {
            return ManualStart.ALREADY_RUNNING;
        }
        Optional<NotificationSyncRun> last = runs.findFirstByOrderByStartedAtDescIdDesc();
        if (last.isPresent() && last.get().getStartedAt().isAfter(clock.instant().minus(props.getManualCooldown()))) {
            return last.get().getStatus() == NotificationSyncRun.Status.RUNNING ? ManualStart.ALREADY_RUNNING : ManualStart.COOLDOWN;
        }
        background.execute(() -> run(NotificationSyncRun.Trigger.MANUAL, actor));
        return ManualStart.STARTED;
    }

    // --- start-up and shut-down -------------------------------------------------------------------------------------

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        recoverAbandoned();
        if (!props.isEnabled() || !schedulingEnabled || !props.isCatchUpOnStartup()) {
            return;
        }
        // Notices stored before their facts existed get them soon after start, not only at the next 6:00 run.
        background.schedule(() -> backfill(null), 30, TimeUnit.SECONDS);
        Optional<NotificationSyncRun> last = runs.findFirstByStatusInOrderByStartedAtDescIdDesc(COMPLETED);
        if (last.isEmpty() || last.get().getStartedAt().isBefore(clock.instant().minus(props.getCatchUpAfter()))) {
            log.info("Notification sync: no successful run in the last {}; one starts in {}", props.getCatchUpAfter(), props.getCatchUpDelay());
            background.schedule(() -> run(NotificationSyncRun.Trigger.STARTUP, "startup"),
                    props.getCatchUpDelay().toMillis(), TimeUnit.MILLISECONDS);
        }
    }

    /** Marks runs left RUNNING by a stopped server as ABANDONED (only when no server holds the run lock). */
    public int recoverAbandoned() {
        if (running.get()) {
            return 0;
        }
        try (Connection lock = dataSource.getConnection()) {
            if (!tryLock(lock)) {
                return 0; // another server is running right now; its RUNNING row is live
            }
            try {
                Integer n = tx.execute(s -> runs.abandonRunning(clock.instant()));
                if (n != null && n > 0) {
                    log.warn("Notification sync: {} run(s) left unfinished by a stopped server marked ABANDONED", n);
                }
                return n == null ? 0 : n;
            } finally {
                unlock(lock);
            }
        } catch (SQLException e) {
            log.warn("Notification sync: could not check for unfinished runs: {}", e.getMessage());
            return 0;
        }
    }

    /** Published before any bean is destroyed: a run in progress stops at the next source or request. */
    @EventListener(ContextClosedEvent.class)
    public void onClose() {
        stopping = true;
    }

    @PreDestroy
    void shutdown() throws InterruptedException {
        stopping = true;
        background.shutdownNow();
        background.awaitTermination(20, TimeUnit.SECONDS);
    }

    // --- status ----------------------------------------------------------------------------------------------------

    public Optional<NotificationSyncRun> lastRun() {
        return runs.findFirstByOrderByStartedAtDescIdDesc();
    }

    public Optional<NotificationSyncRun> lastCompletedRun() {
        return runs.findFirstByStatusInOrderByStartedAtDescIdDesc(COMPLETED);
    }

    /** When the schedule fires next (null when the cron is "-", i.e. switched off). */
    public Instant nextRunAt() {
        if (!props.isEnabled() || !schedulingEnabled || "-".equals(props.getCron().trim())) {
            return null;
        }
        ZonedDateTime next = CronExpression.parse(props.getCron()).next(ZonedDateTime.now(clock.withZone(zone)));
        return next == null ? null : next.toInstant();
    }

    public NotificationSyncProperties properties() {
        return props;
    }

    public ZoneId zone() {
        return zone;
    }

    // --- lock helpers ----------------------------------------------------------------------------------------------

    private static boolean tryLock(Connection c) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            ps.setLong(1, LOCK_KEY);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }

    private static void unlock(Connection c) {
        try (PreparedStatement ps = c.prepareStatement("SELECT pg_advisory_unlock(?)")) {
            ps.setLong(1, LOCK_KEY);
            ps.execute();
        } catch (SQLException e) {
            log.warn("Notification sync: could not release the run lock ({}); it is released when the connection closes", e.getMessage());
        }
    }

    private static String instanceName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }

    /** Keeps error messages short in stored results. */
    private static final class UrlPolicyAbbrev {
        static String of(String s) {
            return s.length() <= 200 ? s : s.substring(0, 197) + "...";
        }
    }
}
