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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Netarhat Residential School's home page. Its "Notices" box lists entries as "24-09-2026 : title" (mostly Hindi);
 * that printed date is the publication date. The page also links notice PDFs without a date; those are kept for review
 * with no date (the dates inside their file names are written in several formats and are not relied on).
 */
@Component
public class NetarhatAdapter implements OfficialSourceAdapter {

    static final String HOME = "https://www.netarhatvidyalaya.com/";
    private static final Pattern DATED = Pattern.compile("^(\\d{1,2}[./-]\\d{1,2}[./-]\\d{4})\\s*[:：]\\s*(.+)$");
    private static final Pattern NOTICE_FILE = Pattern.compile("/(master_login/dashboard/assest/file|pdf)/.+\\.pdf$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ENTRANCE = Pattern.compile("प्रवेश\\s*परीक्षा|entrance", Pattern.CASE_INSENSITIVE);
    private static final Pattern ADMISSION = Pattern.compile("प्रवेश|नामांकन|admission|प्रतीक्षा\\s*सूची|waiting list", Pattern.CASE_INSENSITIVE);
    private static final Pattern JOB = Pattern.compile("नियुक्ति|रिक्ति|भर्ती|शिक्षक|recruitment|vacanc|teacher", Pattern.CASE_INSENSITIVE);

    @Override
    public String key() {
        return "netarhat";
    }

    @Override
    public String name() {
        return "Netarhat Residential School";
    }

    @Override
    public String listingUrl() {
        return HOME;
    }

    @Override
    public Set<String> hosts() {
        return Set.of("www.netarhatvidyalaya.com", "netarhatvidyalaya.com");
    }

    @Override
    public boolean autoPublish() {
        return true;
    }

    @Override
    public boolean completeListing() {
        return false; // a "latest notices" box: older entries drop off without being withdrawn
    }

    @Override
    public SourceProfile profile() {
        return new SourceProfile(name(), "SCHOOL", com.indiaschoolfinder.entity.SiteUpdate.Sector.GOVERNMENT, true, "JH",
                "Netarhat", "netarhat-awasiya-vidyalaya", SourceProfile.OFFICIAL_SCHOOL_SITE, "HTML",
                java.util.Set.of(SiteUpdate.Category.ADMISSION, SiteUpdate.Category.EXAM, SiteUpdate.Category.JOB), false);
    }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        return parse(http.get(HOME).html(), today);
    }

    static SourceListing parse(Document doc, LocalDate today) throws SourceLayoutException {
        Map<String, FoundNotice> byUrl = new LinkedHashMap<>();
        int listed = 0;
        int ignored = 0;
        for (Element a : doc.select("a[href]")) {
            String url = NoticeText.url(a.absUrl("href"));
            if (url == null || !NOTICE_FILE.matcher(url).find()) {
                continue;
            }
            listed++;
            String text = NoticeText.clean(a.text());
            if (text == null) {
                ignored++;
                continue;
            }
            LocalDate date = null;
            String title = text;
            Matcher m = DATED.matcher(text);
            if (m.matches()) {
                date = NoticeText.dayMonthYear(m.group(1), today);
                title = m.group(2).replaceFirst("\\s*[|।]\\s*$", "").trim();
            }
            SiteUpdate.Category category;
            String link = null;
            if (ENTRANCE.matcher(title).find()) {
                category = SiteUpdate.Category.EXAM;
                link = "/exams/netarhat";
            } else if (ADMISSION.matcher(title).find()) {
                category = SiteUpdate.Category.ADMISSION;
                link = "/exams/netarhat";
            } else if (JOB.matcher(title).find()) {
                category = SiteUpdate.Category.JOB;
            } else {
                ignored++;
                continue;
            }
            FoundNotice n = new FoundNotice(url, title, url, date, category, "netarhat", link, null,
                    date == null ? "Listed on the school's home page without a date." : null);
            FoundNotice before = byUrl.get(url);
            if (before == null || (!before.dated() && n.dated())) {
                byUrl.put(url, n); // the dated entry for the same file wins
            }
        }
        if (listed == 0) {
            throw new SourceLayoutException("no notice PDF links found on the home page");
        }
        return new SourceListing(listed, new ArrayList<>(byUrl.values()), ignored);
    }
}
