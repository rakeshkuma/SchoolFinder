package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.NotificationSyncStatusService;
import com.indiaschoolfinder.service.UpdateFeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Updates")
@Validated
@RestController
public class UpdateController {

    private final UpdateFeedService feed;
    private final NotificationSyncStatusService syncStatus;

    public UpdateController(UpdateFeedService feed, NotificationSyncStatusService syncStatus) {
        this.feed = feed;
        this.syncStatus = syncStatus;
    }

    @Operation(summary = "Latest school and exam updates: official exam notices and dates, open admissions, new practice sets and "
            + "published editorial notices, most relevant first. Badges (NEW, UPDATED, OPEN, UPCOMING, CLOSING_SOON) follow the dates.")
    @GetMapping("/api/v1/updates")
    public PageResponse<UpdateDtos.UpdateItem> list(@RequestParam(required = false) SiteUpdate.Category category,
                                                    @RequestParam(defaultValue = "0") @Min(0) int page,
                                                    @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return feed.feed(category, page, size);
    }

    @Operation(summary = "Updates that expired in the last 90 days (badge EXPIRED), newest first: notices kept for reference")
    @GetMapping("/api/v1/updates/past")
    public PageResponse<UpdateDtos.UpdateItem> past(@RequestParam(required = false) SiteUpdate.Category category,
                                                    @RequestParam(defaultValue = "0") @Min(0) int page,
                                                    @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return feed.past(category, page, size);
    }

    @Operation(summary = "When the official sources were last checked and when they are checked next. Read-only: the check "
            + "itself runs on a schedule and cannot be started from here")
    @GetMapping("/api/v1/updates/sync-status")
    public UpdateDtos.SyncStatus syncStatus() {
        return syncStatus.publicStatus();
    }
}
