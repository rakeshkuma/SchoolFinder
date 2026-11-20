package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;

import java.time.LocalDate;
import java.util.Set;

/**
 * One approved official website. An adapter reads the site's notice listing (an API when the site has one, otherwise
 * its HTML) and turns each relevant entry into a {@link FoundNotice}: the title and address exactly as the site gives
 * them, the publication date only when the site prints one, and a category from plain keyword rules. It never invents
 * a date and never writes a summary; the ingest step decides what is published and what waits for an editor.
 *
 * <p>To add a source, implement this as a Spring bean (see NOTIFICATION_SYNC_GUIDE.md).
 */
public interface OfficialSourceAdapter {

    /** Stable key stored with every notice, e.g. "nta-aissee". Never change it once notices exist. */
    String key();

    /** Who publishes the notices, as shown on the site, e.g. "National Testing Agency (NTA)". */
    String name();

    /** The listing a person can open to see the same notices. */
    String listingUrl();

    /** Hosts the checker may request for this source (exact names, https only). */
    Set<String> hosts();

    /** Hosts whose notice links may be published without review; by default the hosts requested. */
    default Set<String> documentHosts() {
        return hosts();
    }

    /**
     * True when this source is approved for automatic publishing: notices with a date printed by the source and a link
     * on {@link #documentHosts()} go live without an editor. False: everything waits for review.
     */
    boolean autoPublish();

    /** Why the source is review-only (shown to editors); null when {@link #autoPublish()} is true. */
    default String reviewOnlyReason() {
        return null;
    }

    /**
     * True when the listing shows every current notice (an archive or an API), so a notice that disappears from it has
     * been withdrawn. False for "latest notices" boxes that drop older entries.
     */
    boolean completeListing();

    /**
     * What the source is (institution, government or private, boarding, place, school, how it is read), recorded in
     * the source registry and given to the admissions and jobs it publishes. The default says only who publishes it.
     */
    default SourceProfile profile() {
        return new SourceProfile(name(), "SCHOOL_SYSTEM", null, null, null, null, null, SourceProfile.OFFICIAL_PORTAL, "HTML",
                null, false);
    }

    /**
     * False for a source listed in the registry but switched off there (for example one whose site refuses automated
     * requests). Settings can switch any source off as well (app.notifications.disabled-sources).
     */
    default boolean enabledByDefault() {
        return true;
    }

    /**
     * True when only school posts are relevant from this source: a public service commission or selection board also
     * recruits for offices, police and engineering, which this site does not list.
     */
    default boolean schoolPostsOnly() {
        return false;
    }

    /**
     * Reads the source. Throws {@link SourceLayoutException} when the page no longer looks as expected (for example
     * no notice rows at all), so a layout change is reported instead of silently finding nothing.
     */
    SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException;
}
