package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.notifications.fetch.UrlPolicy;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import com.indiaschoolfinder.service.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Applies what a source listed to the site_update table, in one transaction per source.
 *
 * <ul>
 *   <li>A notice is identified by (source, the source's id or canonical address): a second daily run with the same
 *   listing changes nothing but the "last seen" time, which never alters updated_at.</li>
 *   <li>A notice already on the site under another update with the same official address is not added again.</li>
 *   <li>A new notice is published straight away only if the source is approved for that, the source printed its date,
 *   and the notice's link is on the source's own hosts; otherwise it waits for an editor (PENDING_REVIEW) with the
 *   reason written down.</li>
 *   <li>A correction by the source (title, address or dates) updates the notice and records last_changed_at, which is
 *   what shows the "Updated" badge. The publication date stays the date first published; if staff have edited the
 *   update, their wording is kept and the change is noted for them instead.</li>
 *   <li>On a complete listing, a notice missing for {@code withdrawAfter} is treated as withdrawn and taken off the site.</li>
 * </ul>
 * The summaries are short sentences written here from the facts above, never text copied from the notice.
 */
@Service
public class NotificationIngestService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private final SiteUpdateRepository updates;
    private final AuditService audit;
    private final NotificationSyncProperties props;

    public NotificationIngestService(SiteUpdateRepository updates, AuditService audit, NotificationSyncProperties props) {
        this.updates = updates;
        this.audit = audit;
        this.props = props;
    }

    @Transactional
    public void apply(OfficialSourceAdapter source, SourceListing listing, Instant now, LocalDate today, SourceResult result) {
        result.listed = listing.listed();
        result.relevant = listing.notices().size();
        result.ignored = listing.ignored();
        Map<String, SiteUpdate> existing = new HashMap<>();
        for (SiteUpdate u : updates.findBySourceKey(source.key())) {
            existing.put(u.getSourceItemId(), u);
        }
        Set<String> listedIds = new HashSet<>();
        List<Long> seen = new ArrayList<>();
        for (FoundNotice n : listing.notices()) {
            String itemId = clip(n.itemId(), 300);
            if (!listedIds.add(itemId)) {
                continue;
            }
            SiteUpdate u = existing.get(itemId);
            if (u == null) {
                create(source, n, itemId, now, today, result);
            } else if (Objects.equals(u.getContentHash(), hash(n))) {
                result.unchanged++;
                seen.add(u.getId());
                if (u.getWithdrawnAt() != null) {
                    relist(u, now);
                }
            } else {
                change(u, source, n, now, today);
                result.updated++;
            }
        }
        if (!seen.isEmpty()) {
            updates.markSeen(seen, now);
        }
        if (source.completeListing() && listing.listed() > 0) {
            for (SiteUpdate u : existing.values()) {
                if (listedIds.contains(u.getSourceItemId()) || u.getWithdrawnAt() != null
                        || (u.getStatus() != SiteUpdate.Status.PUBLISHED && u.getStatus() != SiteUpdate.Status.PENDING_REVIEW)) {
                    continue;
                }
                if (u.getMissingSince() == null) {
                    u.setMissingSince(now);
                } else if (!u.getMissingSince().isAfter(now.minus(props.getWithdrawAfter()))) {
                    u.setStatus(SiteUpdate.Status.ARCHIVED);
                    u.setWithdrawnAt(now);
                    u.setReviewNote(clip("No longer listed by " + source.name() + " since "
                            + DAY.format(u.getMissingSince().atZone(java.time.ZoneId.of("Asia/Kolkata"))) + "; treated as withdrawn.", 600));
                    audit.record("SITE_UPDATE_WITHDRAWN", "SITE_UPDATE", u.getId(), u.getTitle());
                    result.withdrawn++;
                }
            }
        }
    }

    private void create(OfficialSourceAdapter source, FoundNotice n, String itemId, Instant now, LocalDate today, SourceResult result) {
        String url = UrlPolicy.canonical(n.url());
        LocalDate published = n.dated() ? n.publishedOn() : today;
        LocalDate expires = expiry(published, n.officialEndDate());
        if (expires.isBefore(today)) {
            result.tooOld++;
            return; // old news: the feed is for current notices
        }
        if (url != null && updates.findFirstBySourceUrl(url).isPresent()) {
            result.duplicates++;
            return;
        }
        List<String> reasons = new ArrayList<>();
        if (!source.autoPublish()) {
            reasons.add(source.reviewOnlyReason() != null ? source.reviewOnlyReason() : "This source is set to review only.");
        }
        if (!n.dated()) {
            reasons.add("The source gives no date for it; " + DAY.format(today) + " is only the day it was found. Confirm the date before publishing.");
        }
        if (url == null || !UrlPolicy.allowed(url, source.documentHosts())) {
            reasons.add("Its link is not on " + String.join(" or ", source.documentHosts()) + ": " + (url == null ? "invalid" : host(url)) + ".");
        }
        if (n.reviewNote() != null && n.dated()) {
            reasons.add(n.reviewNote());
        }
        SiteUpdate u = new SiteUpdate();
        u.setOrigin(SiteUpdate.Origin.OFFICIAL_SYNC);
        u.setSourceKey(source.key());
        u.setSourceItemId(itemId);
        u.setCategory(n.category());
        u.setTopic(clip(n.topic(), 40));
        u.setOfficialTitle(clip(n.title(), 400));
        u.setTitle(displayTitle(n.title()));
        u.setSummary(summary(source, n, published));
        u.setPublishedOn(published);
        u.setDateConfirmed(n.dated());
        u.setExpiresOn(expires);
        u.setSourceUrl(url != null ? clip(url, 600) : source.listingUrl());
        u.setSourceName(clip(source.name(), 120));
        u.setLinkPath(n.linkPath());
        u.setVerificationStatus(VerificationStatus.UNVERIFIED); // taken from the official site; no editor has checked it
        u.setStatus(reasons.isEmpty() ? SiteUpdate.Status.PUBLISHED : SiteUpdate.Status.PENDING_REVIEW);
        u.setReviewNote(reasons.isEmpty() ? null : clip(String.join(" ", reasons), 600));
        u.setContentHash(hash(n));
        u.setFirstSeenAt(now);
        u.setLastSeenAt(now);
        u = updates.save(u);
        result.created++;
        if (u.getStatus() == SiteUpdate.Status.PUBLISHED) {
            result.published++;
            audit.record("SITE_UPDATE_SYNC_PUBLISHED", "SITE_UPDATE", u.getId(), source.key() + ": " + u.getTitle());
        } else {
            result.pending++;
            result.newPendingIds.add(u.getId());
            audit.record("SITE_UPDATE_SYNC_PENDING", "SITE_UPDATE", u.getId(), source.key() + ": " + u.getTitle());
        }
    }

    /** The source corrected the notice. The publication date is never moved later; corrections show as "Updated". */
    private void change(SiteUpdate u, OfficialSourceAdapter source, FoundNotice n, Instant now, LocalDate today) {
        List<String> what = new ArrayList<>();
        if (!Objects.equals(u.getOfficialTitle(), clip(n.title(), 400))) {
            what.add("title");
        }
        String url = UrlPolicy.canonical(n.url());
        if (url != null && !url.equals(u.getSourceUrl())) {
            what.add("link");
        }
        String dateNote = null;
        if (n.dated()) {
            if (!u.isDateConfirmed()) {
                // The source now prints a date for a notice first seen without one: that date replaces the first-seen day.
                u.setPublishedOn(n.publishedOn());
                u.setDateConfirmed(true);
                what.add("date (now given by the source)");
            } else if (!n.publishedOn().equals(u.getPublishedOn())) {
                dateNote = "The source now dates it " + DAY.format(n.publishedOn()) + "; it stays dated "
                        + DAY.format(u.getPublishedOn()) + ", when it was first published.";
                what.add("date");
            }
        }
        LocalDate newExpiry = expiry(u.getPublishedOn(), n.officialEndDate());
        boolean extended = false;
        if (!u.isStaffEdited() && !newExpiry.equals(u.getExpiresOn())) {
            extended = u.getExpiresOn() == null || newExpiry.isAfter(u.getExpiresOn());
            u.setExpiresOn(newExpiry);
            what.add("closing date");
        }
        if (n.category() != u.getCategory() && !u.isStaffEdited()) {
            u.setCategory(n.category());
            what.add("category");
        }
        u.setOfficialTitle(clip(n.title(), 400));
        if (!u.isStaffEdited()) {
            u.setTitle(displayTitle(n.title()));
            if (url != null && UrlPolicy.allowed(url, source.documentHosts())) {
                u.setSourceUrl(clip(url, 600));
            }
            u.setSummary(summary(source, n, u.getPublishedOn()));
        }
        String changed = "Changed at the source on " + DAY.format(today) + ": " + String.join(", ", what) + "."
                + (dateNote == null ? "" : " " + dateNote)
                + (u.isStaffEdited() ? " Staff wording kept; review the new official title: " + n.title() : "");
        u.setReviewNote(clip(changed, 600));
        u.setContentHash(hash(n));
        u.setLastChangedAt(now);
        u.setLastSeenAt(now);
        u.setMissingSince(null);
        // An official extension reopens a notice that had expired, unless staff took it down or edited it.
        if (u.getStatus() == SiteUpdate.Status.EXPIRED && extended && !u.isStaffEdited() && !u.getExpiresOn().isBefore(today)
                && u.isDateConfirmed() && source.autoPublish()) {
            u.setStatus(SiteUpdate.Status.PUBLISHED);
        }
        if (u.getWithdrawnAt() != null) {
            relist(u, now);
        }
        updates.save(u);
        audit.record("SITE_UPDATE_SOURCE_CHANGED", "SITE_UPDATE", u.getId(), clip(source.key() + ": " + String.join(", ", what), 300));
    }

    /** Listed again after being treated as withdrawn: back to the review queue (an editor decides). */
    private void relist(SiteUpdate u, Instant now) {
        u.setWithdrawnAt(null);
        u.setMissingSince(null);
        if (u.getStatus() == SiteUpdate.Status.ARCHIVED) {
            u.setStatus(SiteUpdate.Status.PENDING_REVIEW);
            u.setReviewNote("Listed again by the source after it had disappeared; check before publishing again.");
        }
        u.setLastSeenAt(now);
        updates.save(u);
    }

    /** Published and waiting updates past their expiry date become EXPIRED. Returns how many. */
    @Transactional
    public int expire(LocalDate today) {
        List<SiteUpdate> expired = updates.findExpired(List.of(SiteUpdate.Status.PUBLISHED, SiteUpdate.Status.PENDING_REVIEW), today);
        for (SiteUpdate u : expired) {
            u.setStatus(SiteUpdate.Status.EXPIRED);
            audit.record("SITE_UPDATE_EXPIRED", "SITE_UPDATE", u.getId(), u.getTitle());
        }
        updates.saveAll(expired);
        return expired.size();
    }

    /** Adds a short excerpt of the notice PDF to the review note (staff only). */
    @Transactional
    public void addExcerpt(long id, String excerpt) {
        updates.findById(id).ifPresent(u -> {
            String note = (u.getReviewNote() == null ? "" : u.getReviewNote() + " ") + "Opening text of the notice: “" + excerpt + "”";
            u.setReviewNote(clip(note, 600));
        });
    }

    LocalDate expiry(LocalDate published, LocalDate officialEnd) {
        if (officialEnd != null && !officialEnd.isBefore(published) && !officialEnd.isAfter(published.plusYears(1))) {
            return officialEnd;
        }
        return published.plusDays(props.getLifetimeDays());
    }

    /** A plain sentence from the facts (who, when, what to open): never the notice's own text. */
    static String summary(OfficialSourceAdapter source, FoundNotice n, LocalDate published) {
        String when = n.dated() ? "published this notice on " + DAY.format(published) : "lists this notice (no date given on its listing)";
        String what = switch (n.category()) {
            case EXAM -> "dates, eligibility and how to apply";
            case ADMISSION -> "classes, eligibility and dates";
            case JOB -> "the posts, eligibility and last date";
            case PREP -> "the details";
        };
        return clip(source.name() + " " + when + ". Open the official notice for " + what + ".", 400);
    }

    static String displayTitle(String title) {
        String t = title.replaceAll("\\s+", " ").trim();
        if (t.length() <= 160) {
            return t.length() >= 10 ? t : (t + " (official notice)");
        }
        int cut = t.lastIndexOf(' ', 158);
        return t.substring(0, cut > 80 ? cut : 159) + "…";
    }

    /** What the source says about the notice; a different value on a later run is a correction. */
    static String hash(FoundNotice n) {
        String basis = String.join("\n", n.title(), String.valueOf(UrlPolicy.canonical(n.url())), String.valueOf(n.publishedOn()),
                String.valueOf(n.officialEndDate()), n.category().name());
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(basis.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String host(String url) {
        try {
            return java.net.URI.create(url).getHost();
        } catch (IllegalArgumentException e) {
            return "another site";
        }
    }

    static String clip(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
