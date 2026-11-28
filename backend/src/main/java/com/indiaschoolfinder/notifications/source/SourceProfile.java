package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.entity.SiteUpdate;

import java.util.Set;

/**
 * What a source is, as the registry of official sources records it: the institution behind it, whether that is
 * government or private and residential, where it is, which of our schools it is (if it is one school's own site), how
 * reliable it is as a source, how it is read, and which kinds of notice it publishes. Notices found on the source
 * inherit these facts (an institution-wide fact such as "Sainik School Korukonda is a government boarding school in
 * Andhra Pradesh", never a fact about a particular notice).
 *
 * @param institution    the admitting or hiring institution, e.g. "Sainik School Korukonda"
 * @param sourceCategory RECRUITMENT_BODY, SCHOOL_SYSTEM, SCHOOL, EXAM_BODY or EDUCATION_DEPARTMENT
 * @param sector         government or private; null when mixed or unknown
 * @param boarding       true for residential institutions; null when mixed or unknown
 * @param stateCode      two-letter state code (state table); null for all-India sources
 * @param city           city or town; null for sources covering a state or India
 * @param schoolSlug     this site's profile of the school, when the source is one school's own website
 * @param reliability    OFFICIAL_PORTAL (a government or examining body) or OFFICIAL_SCHOOL_SITE (the school itself)
 * @param method         how it is read: API, WP_MEDIA, S3WAAS_DOCS, HTML_ITEMS or HTML
 * @param noticeTypes    the categories of notice it may publish
 * @param prefixTitles   true when notice titles on the source do not name the institution (a school's own uploads), so
 *                       the displayed title starts with it
 * @param openingsPage   true for a careers page: each entry is a current opening unless its words say otherwise
 */
public record SourceProfile(String institution, String sourceCategory, SiteUpdate.Sector sector, Boolean boarding,
                            String stateCode, String city, String schoolSlug, String reliability, String method,
                            Set<SiteUpdate.Category> noticeTypes, boolean prefixTitles, boolean openingsPage) {

    public static final String OFFICIAL_PORTAL = "OFFICIAL_PORTAL";
    public static final String OFFICIAL_SCHOOL_SITE = "OFFICIAL_SCHOOL_SITE";

    public SourceProfile {
        noticeTypes = noticeTypes == null || noticeTypes.isEmpty()
                ? Set.of(SiteUpdate.Category.ADMISSION, SiteUpdate.Category.EXAM, SiteUpdate.Category.JOB) : Set.copyOf(noticeTypes);
    }

    /** A source that is not a careers page. */
    public SourceProfile(String institution, String sourceCategory, SiteUpdate.Sector sector, Boolean boarding, String stateCode,
                         String city, String schoolSlug, String reliability, String method, Set<SiteUpdate.Category> noticeTypes,
                         boolean prefixTitles) {
        this(institution, sourceCategory, sector, boarding, stateCode, city, schoolSlug, reliability, method, noticeTypes, prefixTitles,
                false);
    }

    /** A national government body (no state, no school). */
    public static SourceProfile national(String institution, String sourceCategory, Boolean boarding, String method,
                                         SiteUpdate.Category... types) {
        return new SourceProfile(institution, sourceCategory, SiteUpdate.Sector.GOVERNMENT, boarding, null, null, null,
                OFFICIAL_PORTAL, method, Set.of(types), false);
    }
}
