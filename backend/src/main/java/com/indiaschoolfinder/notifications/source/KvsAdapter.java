package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Kendriya Vidyalaya Sangathan. kvs.gov.in/en/recruitment/ is a static page about how KVS recruits; the current notices
 * are on the "Notifications/Recruitment" page (/en/interview-notice/) and the Admission page, both government-platform
 * document tables with a "Published On" date (dd/mm/yyyy) and a PDF link on the government file host. The Admission
 * page may list nothing between admission seasons; that is not an error.
 */
@Component
public class KvsAdapter implements OfficialSourceAdapter {

    static final String RECRUITMENT = "https://kvs.gov.in/en/interview-notice/";
    static final String ADMISSION = "https://kvs.gov.in/en/admission/";

    @Override
    public String key() {
        return "kvs";
    }

    @Override
    public String name() {
        return "Kendriya Vidyalaya Sangathan (KVS)";
    }

    @Override
    public String listingUrl() {
        return RECRUITMENT;
    }

    @Override
    public Set<String> hosts() {
        return Set.of("kvs.gov.in");
    }

    @Override
    public Set<String> documentHosts() {
        return Set.of("kvs.gov.in", "cdnbbsr.s3waas.gov.in");
    }

    @Override
    public boolean autoPublish() {
        return true;
    }

    @Override
    public boolean completeListing() {
        return false; // the tables show the newest page only
    }

    @Override
    public SourceProfile profile() {
        return SourceProfile.national(name(), "SCHOOL_SYSTEM", false, "HTML", SiteUpdate.Category.ADMISSION, SiteUpdate.Category.JOB);
    }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        SourceListing jobs = parse(http.get(RECRUITMENT).html(), SiteUpdate.Category.JOB, true, today);
        SourceListing admissions = parse(http.get(ADMISSION).html(), SiteUpdate.Category.ADMISSION, false, today);
        List<FoundNotice> all = new ArrayList<>(jobs.notices());
        all.addAll(admissions.notices());
        return new SourceListing(jobs.listed() + admissions.listed(), all, jobs.ignored() + admissions.ignored());
    }

    /** @param required the page must have a document table with rows (else the layout changed) */
    static SourceListing parse(Document doc, SiteUpdate.Category category, boolean required, LocalDate today) throws SourceLayoutException {
        Elements rows = doc.select("table.documents-table tbody tr");
        if (rows.isEmpty()) {
            if (required) {
                throw new SourceLayoutException("no rows in the document table (table.documents-table) on " + doc.location());
            }
            return new SourceListing(0, List.of(), 0);
        }
        Map<String, FoundNotice> found = new LinkedHashMap<>();
        int ignored = 0;
        for (Element row : rows) {
            Elements cells = row.select("> td");
            Element link = row.selectFirst("a[href]");
            if (cells.size() < 2 || link == null) {
                ignored++;
                continue;
            }
            Element strong = cells.get(0).selectFirst("strong");
            String title = NoticeText.clean(strong != null ? strong.text() : cells.get(0).text());
            String url = NoticeText.url(link.absUrl("href"));
            if (title == null || url == null) {
                ignored++;
                continue;
            }
            LocalDate date = NoticeText.dayMonthYear(NoticeText.clean(cells.get(1).text()), today);
            found.putIfAbsent(url, new FoundNotice(url, title, url, date, category, "kvs", null, null,
                    date == null ? "The 'Published On' cell has no readable date." : null));
        }
        return new SourceListing(rows.size(), new ArrayList<>(found.values()), ignored);
    }
}
