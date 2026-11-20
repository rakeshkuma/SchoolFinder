package com.indiaschoolfinder.notifications.registry;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * One official source as written in the reviewed registry file (classpath notifications/sources.json). Adding a school
 * or a recruitment body is a matter of adding an entry here after looking at its site; see NOTIFICATION_SYNC_GUIDE.md.
 *
 * <p>How the site is read ({@code method}):
 * <ul>
 *   <li>{@code WP_MEDIA}: the public WordPress media API of the site ({@code /wp-json/wp/v2/media?mime_type=application/pdf}),
 *   which lists the PDFs the institution uploaded with their upload dates. Used only when the site answers it without
 *   signing in.</li>
 *   <li>{@code S3WAAS_DOCS}: a document table of the government website platform (S3WaaS): title, "Published On" date
 *   and file link per row.</li>
 *   <li>{@code HTML_ITEMS}: entries of an HTML page picked by CSS selectors ({@code item}, and within it {@code title},
 *   {@code link}, {@code dateSelector}).</li>
 * </ul>
 * Where an entry's date comes from ({@code date}): {@code SOURCE} (the API's or table's own date), {@code TEXT} (a date
 * printed in the entry, or in {@code dateSelector}), {@code FILENAME_STAMP} (an upload time the site writes into the
 * file name, yyyyMMddHHmmss), {@code FILENAME_EPOCH} (a Unix time in the file name), or {@code NONE} (entries wait for
 * an editor).
 *
 * @param assume         the category every entry has (a careers page lists only jobs); otherwise read from its words
 * @param schoolPostsOnly keep only school posts (a public service commission also recruits engineers, police...)
 * @param reviewGeneric  with schoolPostsOnly: send notices that name no post ("various posts") to review instead of
 *                       leaving them out
 * @param checked        the day a person last looked at the site and confirmed this entry (documentation only)
 */
@JsonIgnoreProperties(ignoreUnknown = false)
public record SourceDefinition(
        String key,
        String name,
        String institution,
        String category,
        String sector,
        Boolean boarding,
        String state,
        String city,
        String school,
        List<String> notices,
        String method,
        String listingUrl,
        List<String> urls,
        List<String> hosts,
        List<String> documentHosts,
        Boolean autoPublish,
        String reviewOnlyReason,
        Boolean completeListing,
        String reliability,
        Boolean schoolPostsOnly,
        Boolean reviewGeneric,
        String assume,
        String item,
        String title,
        String link,
        String dateSelector,
        String date,
        String linkPattern,
        String include,
        String exclude,
        Boolean prefixTitles,
        Boolean mayBeEmpty,
        Boolean enabled,
        String disabledReason,
        String checked,
        String notes,
        /* The site cuts every title at this many characters (OAV's cards): a title that long is marked "…". */
        Integer titlesCutAt) {

    public boolean on(Boolean flag) {
        return Boolean.TRUE.equals(flag);
    }
}
