package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.entity.SiteUpdate;

import java.time.LocalDate;

/**
 * One notice as a source lists it.
 *
 * @param itemId         the source's identifier (an id, or the canonical address of the notice)
 * @param title          the title as printed (cleaned of spacing only)
 * @param url            the notice itself (a PDF or page), absolute
 * @param publishedOn    the date the source gives for it, or null when it gives none
 * @param category       what kind of update it is
 * @param topic          exam or scheme, e.g. "aissee"
 * @param linkPath       a page on this site about the topic, or null
 * @param officialEndDate a "show until" or closing date the source itself gives, or null
 * @param reviewNote     set when the adapter is unsure (the notice then waits for an editor)
 * @param closesOn       the last date to apply, when the listing itself states it in a field of its own (a "Last date"
 *                       column, say); null otherwise. A last date written in the title is read from the title later.
 * @param employmentType the kind of employment, when the listing states it in a field of its own (an employer's JobPosting
 *                       data, say); null otherwise. It is not part of the notice's fingerprint, so stored notices are not
 *                       reported as changed when a source starts stating it.
 */
public record FoundNotice(String itemId, String title, String url, LocalDate publishedOn, SiteUpdate.Category category,
                          String topic, String linkPath, LocalDate officialEndDate, String reviewNote, LocalDate closesOn,
                          SiteUpdate.EmploymentType employmentType) {

    public FoundNotice(String itemId, String title, String url, LocalDate publishedOn, SiteUpdate.Category category,
                       String topic, String linkPath, LocalDate officialEndDate, String reviewNote, LocalDate closesOn) {
        this(itemId, title, url, publishedOn, category, topic, linkPath, officialEndDate, reviewNote, closesOn, null);
    }

    public FoundNotice(String itemId, String title, String url, LocalDate publishedOn, SiteUpdate.Category category,
                       String topic, String linkPath, LocalDate officialEndDate, String reviewNote) {
        this(itemId, title, url, publishedOn, category, topic, linkPath, officialEndDate, reviewNote, null, null);
    }

    public boolean dated() {
        return publishedOn != null;
    }
}
