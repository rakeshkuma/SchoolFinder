package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.NotificationSyncService;
import com.indiaschoolfinder.notifications.NotificationSyncStatusService;
import com.indiaschoolfinder.service.SiteUpdateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: updates", description = "Updates for the home page and updates page, and the daily official-source check "
        + "(ADMIN or EDITOR; starting a check is ADMIN only)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/updates")
public class AdminUpdateController {

    private final SiteUpdateService updates;
    private final NotificationSyncService sync;
    private final NotificationSyncStatusService syncStatus;

    public AdminUpdateController(SiteUpdateService updates, NotificationSyncService sync, NotificationSyncStatusService syncStatus) {
        this.updates = updates;
        this.sync = sync;
        this.syncStatus = syncStatus;
    }

    @GetMapping
    public PageResponse<UpdateDtos.AdminRow> list(@RequestParam(defaultValue = "PUBLISHED") SiteUpdate.Status status,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return updates.list(status, page, size);
    }

    @Operation(summary = "Draft an update (not shown until published); an official source is required except for practice")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UpdateDtos.AdminRow create(@Valid @RequestBody UpdateDtos.UpdateRequest request) {
        return updates.create(request);
    }

    @PutMapping("/{id}")
    public UpdateDtos.AdminRow update(@PathVariable long id, @Valid @RequestBody UpdateDtos.UpdateRequest request) {
        return updates.update(id, request);
    }

    @PostMapping("/{id}/publish")
    public UpdateDtos.AdminRow publish(@PathVariable long id) {
        return updates.setStatus(id, SiteUpdate.Status.PUBLISHED);
    }

    @Operation(summary = "Take an update off the site (it can be published again)")
    @PostMapping("/{id}/archive")
    public UpdateDtos.AdminRow archive(@PathVariable long id) {
        return updates.setStatus(id, SiteUpdate.Status.ARCHIVED);
    }

    @Operation(summary = "Take an update off the site because a later update replaces it")
    @PostMapping("/{id}/supersede")
    public UpdateDtos.AdminRow supersede(@PathVariable long id, @RequestParam long by) {
        return updates.supersede(id, by);
    }

    @Operation(summary = "Set the posts a recruitment notice advertises, as entered from the official notice (replaces the "
            + "posts read from its title; an empty list removes the entered posts)")
    @PutMapping("/{id}/positions")
    public UpdateDtos.AdminRow positions(@PathVariable long id, @Valid @RequestBody java.util.List<UpdateDtos.@Valid PositionRequest> positions) {
        return updates.setPositions(id, positions);
    }

    // --- the daily check of official websites ------------------------------------------------------------------------

    @Operation(summary = "The daily official-source check: schedule, sources, last run and how many updates wait for review")
    @GetMapping("/sync-status")
    public UpdateDtos.AdminSyncStatus syncStatus() {
        return syncStatus.adminStatus();
    }

    @Operation(summary = "Past runs of the official-source check, newest first, with each source's result")
    @GetMapping("/sync-runs")
    public PageResponse<UpdateDtos.SyncRunRow> syncRuns(@RequestParam(defaultValue = "0") @Min(0) int page,
                                                        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return syncStatus.history(page, size);
    }

    @Operation(summary = "Check the official sources now (ADMIN only). Runs in the background; refused while a run is in "
            + "progress and for a cool-down after the last one")
    @PostMapping("/sync")
    public ResponseEntity<UpdateDtos.SyncStartResult> syncNow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        NotificationSyncService.ManualStart result = sync.startManual(auth == null ? "admin" : auth.getName());
        return switch (result) {
            case STARTED -> ResponseEntity.status(HttpStatus.ACCEPTED).body(new UpdateDtos.SyncStartResult(result.name(),
                    "Checking the official sources now. Results appear in the run history in a minute or two."));
            case ALREADY_RUNNING -> ResponseEntity.status(HttpStatus.CONFLICT).body(new UpdateDtos.SyncStartResult(result.name(),
                    "A check is already running."));
            case COOLDOWN -> ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new UpdateDtos.SyncStartResult(result.name(),
                    "The sources were checked a few minutes ago. Try again later."));
            case DISABLED -> ResponseEntity.status(HttpStatus.CONFLICT).body(new UpdateDtos.SyncStartResult(result.name(),
                    "The official-source check is switched off in settings."));
        };
    }
}
