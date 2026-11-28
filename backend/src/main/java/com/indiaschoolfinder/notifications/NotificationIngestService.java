package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.notifications.fetch.UrlPolicy;
import com.indiaschoolfinder.notifications.opportunity.OpportunityClassifier;
import com.indiaschoolfinder.notifications.opportunity.OpportunityEnricher;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.notifications.source.SourceProfile;
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
    private final OpportunityEnricher enricher;

    public NotificationIngestService(SiteUpdateRepository updates, AuditService audit, NotificationSyncProperties props,
                                     OpportunityEnricher enricher) {
        this.updates = updates;
        this.audit = audit;
        this.props = props;
        this.enricher = enricher;
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
        // Several openings listed on one page (a careers page) share that page's address; they are different notices,
        // not copies of one another.
        Map<String, Integer> sharedUrls = new HashMap<>();
        for (FoundNotice n : listing.notices()) {
            String url = UrlPolicy.canonical(n.url());
            if (url != null) sharedUrls.merge(url, 1, Integer::sum);
        }
        String listingPage = UrlPolicy.canonical(source.listingUrl());
        if (listingPage != null) sharedUrls.merge(listingPage, 2, Integer::sum);
        Set<String> listedIds = new HashSet<>();
        List<Long> seen = new ArrayList<>();
        for (FoundNotice n : listing.notices()) {
            String itemId = clip(n.itemId(), 300);
            if (!listedIds.add(itemId)) {
                continue;
            }
            SiteUpdate u = existing.get(itemId);
            if (u == null) {
                create(source, n, itemId, now, today, result, sharedUrls);
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

    private void create(OfficialSourceAdapter source, FoundNotice n, String itemId, Instant now, LocalDate today, SourceResult result,
                        Map<String, Integer> sharedUrls) {
        String url = UrlPolicy.canonical(n.url());
        LocalDate published = n.dated() ? n.publishedOn() : today;
        OpportunityClassifier.Facts facts = opportunity(n.category()) ? facts(source, n.category(), n.title(), published) : null;
        LocalDate closes = n.closesOn() != null ? n.closesOn() : facts == null ? null : facts.closesOn();
        LocalDate expires = expiry(published, n.officialEndDate(), facts, closes);
        if (expires.isBefore(today)) {
            result.tooOld++;
            return; // old news, or applications already closed: the feed is for current notices
        }
        boolean sharedPage = url != null && sharedUrls.getOrDefault(url, 0) > 1;
        if (url != null && !sharedPage && updates.findFirstBySourceUrl(url).isPresent()) {
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
        // This site lists school jobs: a school system's or commission's notice for an engineer or a project post waits
        // for an editor. A school's own site only ever recruits for the school.
        if (facts != null && n.category() == SiteUpdate.Category.JOB && facts.nonSchoolPost() && !facts.schoolPost()
                && !facts.schoolStaff() && !"SCHOOL".equals(source.profile().sourceCategory())) {
            reasons.add("The post it names does not look like school employment (this site lists teaching and school staff jobs); "
                    + "publish it only if it is a school post.");
        }
        SiteUpdate u = new SiteUpdate();
        u.setOrigin(SiteUpdate.Origin.OFFICIAL_SYNC);
        u.setSourceKey(source.key());
        u.setSourceItemId(itemId);
        u.setCategory(n.category());
        u.setTopic(clip(n.topic(), 40));
        u.setOfficialTitle(clip(n.title(), 400));
        u.setTitle(displayTitle(source, n));
        u.setSummary(facts == null ? summary(source, n, published) : opportunitySummary(source, n, published, facts, closes));
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
        enricher.apply(u, source.profile(), facts, n.closesOn(), n.employmentType(), true);
        u = updates.save(u);
        enricher.savePositions(u.getId(), facts);
        result.created++;
        if (n.category() == SiteUpdate.Category.JOB) {
            result.createdJobs++;
            result.newJobIds.add(u.getId());
        }
        if (n.category() == SiteUpdate.Category.ADMISSION) result.createdAdmissions++;
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
        OpportunityClassifier.Facts facts = opportunity(n.category())
                ? facts(source, n.category(), n.title(), u.getPublishedOn()) : null;
        LocalDate closes = n.closesOn() != null ? n.closesOn() : facts == null ? null : facts.closesOn();
        LocalDate newExpiry = expiry(u.getPublishedOn(), n.officialEndDate(), facts, closes);
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
            u.setTitle(displayTitle(source, n));
            if (url != null && UrlPolicy.allowed(url, source.documentHosts())) {
                u.setSourceUrl(clip(url, 600));
            }
            u.setSummary(facts == null ? summary(source, n, u.getPublishedOn())
                    : opportunitySummary(source, n, u.getPublishedOn(), facts, closes));
            enricher.apply(u, source.profile(), facts, n.closesOn(), n.employmentType(), true);
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
        if (!u.isStaffEdited()) {
            enricher.savePositions(u.getId(), facts);
        }
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

    /**
     * The interview or last date of a new job notice, read from its official document when its title gives none (a
     * Kendriya Vidyalaya's "Walk-in interview 2026-27"). The document's words are read like a title, after the title
     * itself: a date counts only after its cue word ("walk-in interview on", "last date"), and only if it falls after
     * the notice's publication and within {@value #DOCUMENT_DAYS} days of it (the letter's own date does not). The
     * notice then stays current until that date, and its card shows it. An editor's notice is never changed.
     *
     * @return true when a date was taken from the document
     */
    @Transactional
    public boolean applyDocument(OfficialSourceAdapter source, long id, String documentUrl, String text) {
        SiteUpdate u = updates.findById(id).orElse(null);
        if (u == null || u.isStaffEdited() || u.getCategory() != SiteUpdate.Category.JOB || u.getClosesOn() != null
                || u.getPublishedOn() == null || text == null || text.isBlank()) {
            return false;
        }
        LocalDate published = u.getPublishedOn();
        String title = u.getOfficialTitle() != null ? u.getOfficialTitle() : u.getTitle();
        OpportunityClassifier.Facts titleFacts = facts(source, u.getCategory(), title, published);
        OpportunityClassifier.DocumentDates doc = OpportunityClassifier.documentDates(text, published, DOCUMENT_DAYS);
        LocalDate closes = doc.closesOn();
        LocalDate exam = doc.examOn();
        if (closes == null && exam == null) {
            return false;
        }
        if (closes == null && doc.walkIn()) {
            closes = exam; // a walk-in interview is applied for by attending it
        }
        // Posts and the kind of notice stay as the title gives them; only the dates come from the document.
        OpportunityClassifier.Facts merged = titleFacts.withDates(titleFacts.opensOn(), closes, exam,
                titleFacts.walkIn() || doc.walkIn());
        enricher.apply(u, source.profile(), merged, null, true);
        u.setExpiresOn(expiry(published, null, merged, closes != null ? closes : exam));
        String when = DAY.format(closes != null ? closes : exam);
        u.setSummary(clip(u.getSummary() + " " + (merged.walkIn() ? "Walk-in interview" : closes != null ? "Last date" : "Interview / exam")
                + " " + when + ", as the official notice states.", 400));
        if (u.getStatus() == SiteUpdate.Status.PENDING_REVIEW) {
            u.setReviewNote(clip((u.getReviewNote() == null ? "" : u.getReviewNote() + " ") + "Date " + when + " read from "
                    + documentUrl + "; check it there.", 600));
        }
        audit.record("SITE_UPDATE_SOURCE_DOCUMENT", "SITE_UPDATE", id, clip(source.key() + ": " + when + " from " + documentUrl, 300));
        return true;
    }

    /** Days after publication within which a date read from a notice's document is believed (walk-ins are weeks away). */
    static final int DOCUMENT_DAYS = 120;

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

    /**
     * An opening whose official last date is known stays current until that date (or its exam or interview, if
     * later), and then moves to past updates; everything else keeps the usual lifetime.
     */
    LocalDate expiry(LocalDate published, LocalDate officialEnd, OpportunityClassifier.Facts facts, LocalDate closes) {
        return expiry(published, officialEnd, facts, closes, props.getLifetimeDays(), props.getWalkInLifetimeDays());
    }

    /**
     * The same, with the lifetimes given. A walk-in interview (or an interview for contractual or part-time posts) whose
     * day no one has read, neither in its title nor in its document, is usually held within days of being announced:
     * it stays current {@code walkInDays} after its publication, not the usual lifetime, so a past interview is not shown
     * as open for weeks (and one found later than that is not added at all).
     */
    static LocalDate expiry(LocalDate published, LocalDate officialEnd, OpportunityClassifier.Facts facts, LocalDate closes,
                            int lifetimeDays, int walkInDays) {
        if (facts != null && closes != null
                && (facts.noticeType() == SiteUpdate.NoticeType.OPENING || facts.noticeType() == SiteUpdate.NoticeType.EXTENSION)) {
            LocalDate end = facts.examOn() != null && facts.examOn().isAfter(closes) ? facts.examOn() : closes;
            if (!end.isAfter(published.plusYears(1))) {
                return end;
            }
        }
        if (officialEnd != null && !officialEnd.isBefore(published) && !officialEnd.isAfter(published.plusYears(1))) {
            return officialEnd;
        }
        if (facts != null && closes == null && facts.examOn() == null && facts.walkIn()
                && facts.noticeType() == SiteUpdate.NoticeType.OPENING && walkInDays > 0) {
            return published.plusDays(Math.min(walkInDays, lifetimeDays));
        }
        return published.plusDays(lifetimeDays);
    }

    /** The notice's facts; on a careers page an entry whose words say nothing else is an opening. */
    static OpportunityClassifier.Facts facts(OfficialSourceAdapter source, SiteUpdate.Category category, String title, LocalDate published) {
        OpportunityClassifier.Facts f = OpportunityClassifier.facts(category, title, published);
        if (source != null && source.profile().openingsPage() && f.noticeType() == SiteUpdate.NoticeType.OTHER) {
            return f.withNoticeType(SiteUpdate.NoticeType.OPENING);
        }
        return f;
    }

    private static boolean opportunity(SiteUpdate.Category category) {
        return category == SiteUpdate.Category.ADMISSION || category == SiteUpdate.Category.JOB;
    }

    /**
     * Gives notices stored before admissions and jobs had their own facts (or found while a classifier rule was
     * missing) their facts and page address. Notices staff edited keep everything staff set; editorial notices keep
     * their dates. Returns how many were filled in; a batch at a time, so a long backlog never makes one run slow.
     */
    @Transactional
    public int enrichExisting(Map<String, OfficialSourceAdapter> sourcesByKey) {
        int n = 0;
        for (SiteUpdate u : updates.findTop200ByCategoryInAndSlugIsNullOrderByIdAsc(List.of(SiteUpdate.Category.ADMISSION, SiteUpdate.Category.JOB))) {
            OfficialSourceAdapter source = u.getSourceKey() == null ? null : sourcesByKey.get(u.getSourceKey());
            String text = u.getOfficialTitle() != null ? u.getOfficialTitle() : u.getTitle();
            OpportunityClassifier.Facts facts = facts(source, u.getCategory(), text, u.getPublishedOn());
            boolean derive = u.isOfficialSync() && !u.isStaffEdited() && u.getEventDate() == null;
            enricher.apply(u, source == null ? null : source.profile(), facts, null, derive);
            updates.save(u);
            if (!u.isStaffEdited()) {
                enricher.savePositions(u.getId(), facts);
            }
            n++;
        }
        return n;
    }

    /**
     * The summary of an admission or job notice: who published it and when, what it is about as far as its title
     * says, its last date or that none is given, and what to open for the rest. Facts only, never the notice's text.
     */
    static String opportunitySummary(OfficialSourceAdapter source, FoundNotice n, LocalDate published,
                                     OpportunityClassifier.Facts f, LocalDate closes) {
        StringBuilder s = new StringBuilder(source.name());
        s.append(n.dated() ? " published this notice on " + DAY.format(published) : " lists this notice (no date given on its listing)");
        String what = describe(n.category(), f);
        if (what != null) {
            s.append(": ").append(what);
        }
        s.append(". ");
        boolean opening = f.noticeType() == SiteUpdate.NoticeType.OPENING || f.noticeType() == SiteUpdate.NoticeType.EXTENSION;
        if (closes != null) {
            s.append(f.walkIn() ? "Walk-in interview: " : "Last date to apply: ").append(DAY.format(closes)).append(". ");
        } else if (opening) {
            s.append("No last date is given on the listing. ");
        }
        s.append("Open the official notice for ").append(n.category() == SiteUpdate.Category.JOB
                ? "the posts, eligibility, pay and how to apply" : "eligibility, dates and how to apply").append('.');
        return clip(s.toString(), 400);
    }

    private static String describe(SiteUpdate.Category category, OpportunityClassifier.Facts f) {
        if (category == SiteUpdate.Category.ADMISSION) {
            String about = "admission" + (f.classes() == null ? "" : " to " + (f.classes().contains(",") ? "Classes " : "Class ") + f.classes())
                    + (f.academicSession() == null ? "" : " for " + f.academicSession());
            return switch (f.noticeType()) {
                case OPENING -> about;
                case EXTENSION -> "a new last date for " + about;
                case RESULT -> "results or lists for " + about;
                case ADMIT_CARD -> "admit cards for " + about;
                case SCHEDULE -> "a schedule for " + about;
                case CORRIGENDUM -> "a correction to the notice on " + about;
                case OTHER -> null;
            };
        }
        List<String> posts = f.postNames(); // real post names only: "Support Staff" is a filter, not a post
        String named = posts.isEmpty() ? null
                : String.join(", ", posts.subList(0, Math.min(3, posts.size()))) + (posts.size() > 3 ? " and " + (posts.size() - 3) + " more" : "");
        return switch (f.noticeType()) {
            case OPENING -> named == null ? "recruitment" : "recruitment for " + named;
            case EXTENSION -> named == null ? "a new last date for applications" : "a new last date for " + named;
            case RESULT -> named == null ? "a result or list of candidates" : "a result or list for " + named;
            case ADMIT_CARD -> named == null ? "admit cards" : "admit cards for " + named;
            case SCHEDULE -> named == null ? "a test or interview schedule" : "a schedule for " + named;
            case CORRIGENDUM -> named == null ? "a correction to an earlier notice" : "a correction for " + named;
            case OTHER -> named;
        };
    }

    /**
     * The title shown on the site: the official one, after the institution's name when a school's own upload does not
     * name the school ("Sainik School Korukonda: Final result for the post of TGT"), with file-name underscores as spaces.
     */
    static String displayTitle(OfficialSourceAdapter source, FoundNotice n) {
        String t = n.title();
        SourceProfile p = source.profile();
        if (opportunity(n.category()) && p.prefixTitles()) {
            if (t.chars().filter(c -> c == '_').count() >= 2) {
                t = t.replace('_', ' ');
            }
            if (p.institution() != null && !mentions(t, p.institution())) {
                t = p.institution() + ": " + t;
            }
        }
        return displayTitle(t);
    }

    /** Whether the title names the institution by one of its distinctive words ("Korukonda", "Mayo", "DSSSB"). */
    static boolean mentions(String title, String institution) {
        String lower = title.toLowerCase(Locale.ROOT);
        Set<String> generic = Set.of("school", "schools", "public", "college", "international", "residential", "sainik", "vidyalaya",
                "board", "society", "india", "national", "the", "service", "services", "commission", "selection", "delhi", "subordinate");
        for (String w : institution.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (w.length() >= 4 && !generic.contains(w) && lower.contains(w)) {
                return true;
            }
        }
        // An abbreviation in brackets: "(DSSSB)", "(BPSC)", "(OAVS)".
        java.util.regex.Matcher abbr = java.util.regex.Pattern.compile("\\(([A-Z]{3,8})\\)").matcher(institution);
        return abbr.find() && title.contains(abbr.group(1));
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
        if (n.closesOn() != null) {
            // Only when a listing states one: fingerprints of notices stored before V47 stay exactly the same.
            basis += "\n" + n.closesOn();
        }
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
