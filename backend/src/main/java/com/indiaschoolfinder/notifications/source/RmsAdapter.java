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
 * Rashtriya Military Schools. The home page lists admission and recruitment notices ("... (CLICK HERE)") but prints no
 * dates, so this source is review-only: everything found waits for an editor, who confirms the date from the notice.
 */
@Component
public class RmsAdapter implements OfficialSourceAdapter {

    static final String HOME = "https://www.rashtriyamilitaryschools.edu.in/";
    private static final Pattern NOTICE_LINK = Pattern.compile("/Attachments/|nielit\\.gov\\.in", Pattern.CASE_INSENSITIVE);
    private static final Pattern ADMISSION = Pattern.compile("admission|\\bclass (vi|ix|6|9)\\b|\\bCET\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern JOB = Pattern.compile("recruitment|\\bposts?\\b|teachers?|assistant master|employment|interview for the post",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SKIP = Pattern.compile("news ?letter|agreement form|indemnity|kesarian", Pattern.CASE_INSENSITIVE);

    @Override
    public String key() {
        return "rms";
    }

    @Override
    public String name() {
        return "Rashtriya Military Schools";
    }

    @Override
    public String listingUrl() {
        return HOME;
    }

    @Override
    public Set<String> hosts() {
        return Set.of("www.rashtriyamilitaryschools.edu.in");
    }

    @Override
    public boolean autoPublish() {
        return false;
    }

    @Override
    public String reviewOnlyReason() {
        return "The Rashtriya Military Schools site lists notices without dates.";
    }

    @Override
    public boolean completeListing() {
        return false;
    }

    @Override
    public SourceProfile profile() {
        return SourceProfile.national(name(), "SCHOOL_SYSTEM", true, "HTML", SiteUpdate.Category.ADMISSION,
                SiteUpdate.Category.EXAM, SiteUpdate.Category.JOB);
    }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        return parse(http.get(HOME).html());
    }

    static SourceListing parse(Document doc) throws SourceLayoutException {
        Map<String, FoundNotice> found = new LinkedHashMap<>();
        int listed = 0;
        int ignored = 0;
        for (Element a : doc.select("a[href]")) {
            String url = NoticeText.url(a.absUrl("href"));
            if (url == null || !NOTICE_LINK.matcher(url).find()) {
                continue;
            }
            listed++;
            String title = NoticeText.clean(a.text());
            title = title == null ? null : NoticeText.clean(title.replaceAll("(?i)\\(\\s*click here\\s*\\)", ""));
            if (title == null || title.length() < 12 || SKIP.matcher(title).find()) {
                ignored++;
                continue;
            }
            SiteUpdate.Category category = JOB.matcher(title).find() ? SiteUpdate.Category.JOB
                    : ADMISSION.matcher(title).find() ? SiteUpdate.Category.ADMISSION : null;
            if (category == null) {
                ignored++;
                continue;
            }
            found.putIfAbsent(url, new FoundNotice(url, title, url, null, category, "rms", null, null,
                    "Listed on the home page without a date."));
        }
        if (listed == 0) {
            throw new SourceLayoutException("no notice links (Attachments or the admissions portal) on the home page");
        }
        return new SourceListing(listed, new ArrayList<>(found.values()), ignored);
    }
}
