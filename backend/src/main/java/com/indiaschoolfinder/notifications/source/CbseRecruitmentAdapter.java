package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * CBSE recruitment notices. As of November 2026 the CBSE website's content network answers automated clients that
 * identify themselves honestly with "403 Access Denied"; the checker reports that as BLOCKED each day and does not
 * disguise itself or work around it. If the site ever answers, notice links are collected for an editor to review
 * (the page layout could not be inspected, so nothing from it is published automatically and no dates are guessed).
 */
@Component
public class CbseRecruitmentAdapter implements OfficialSourceAdapter {

    static final String LISTING = "https://www.cbse.gov.in/cbsenew/recruitment.html";
    private static final Pattern DOCUMENT = Pattern.compile("\\.pdf($|\\?)", Pattern.CASE_INSENSITIVE);

    @Override
    public String key() {
        return "cbse-recruitment";
    }

    @Override
    public String name() {
        return "Central Board of Secondary Education (CBSE)";
    }

    @Override
    public String listingUrl() {
        return LISTING;
    }

    @Override
    public Set<String> hosts() {
        return Set.of("www.cbse.gov.in", "cbse.gov.in");
    }

    @Override
    public boolean autoPublish() {
        return false;
    }

    @Override
    public String reviewOnlyReason() {
        return "CBSE's page layout has not been verified, so its notices are checked by an editor.";
    }

    @Override
    public boolean completeListing() {
        return false;
    }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        return parse(http.get(LISTING).html());
    }

    static SourceListing parse(Document doc) throws SourceLayoutException {
        Map<String, FoundNotice> found = new LinkedHashMap<>();
        int listed = 0;
        for (Element a : doc.select("a[href]")) {
            String url = NoticeText.url(a.absUrl("href"));
            String title = NoticeText.clean(a.text());
            if (url == null || !DOCUMENT.matcher(url).find()) {
                continue;
            }
            listed++;
            if (title == null || title.length() < 15) {
                continue;
            }
            found.putIfAbsent(url, new FoundNotice(url, title, url, null, SiteUpdate.Category.JOB, "cbse", null, null,
                    "Collected from CBSE's recruitment page; check the title and the date in the notice."));
        }
        if (listed == 0) {
            throw new SourceLayoutException("no notice PDF links on the recruitment page");
        }
        return new SourceListing(listed, new ArrayList<>(found.values()), listed - found.size());
    }
}
