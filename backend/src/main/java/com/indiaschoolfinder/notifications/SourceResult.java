package com.indiaschoolfinder.notifications;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.ArrayList;
import java.util.List;

/**
 * How one source went in one run (stored as JSON in notification_sync_run.details).
 *
 * <p>Outcomes: OK (read and applied), FAILED (network, layout or other error), BLOCKED (the site refused automated
 * access, or robots.txt disallows it), SKIPPED (switched off, or the run was stopping).
 */
public class SourceResult {

    public String key;
    public String name;
    public String outcome;
    public String error;
    public long durationMs;
    public int requests;
    /** Entries on the listing in all; notices relevant to the site; entries left out (tenders and so on). */
    public int listed;
    public int relevant;
    public int ignored;
    public int created;
    public int updated;
    public int unchanged;
    public int published;
    public int pending;
    /** Relevant but older than the lifetime when first seen, so not added. */
    public int tooOld;
    /** Already on the site under another update with the same official address. */
    public int duplicates;
    public int withdrawn;
    /** Ids of new updates waiting for review (for PDF excerpts after the transaction). */
    @JsonIgnore
    public transient List<Long> newPendingIds = new ArrayList<>();

    public SourceResult() {
    }

    public SourceResult(String key, String name) {
        this.key = key;
        this.name = name;
    }
}
