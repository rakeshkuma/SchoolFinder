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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * NTA's notice board archive (one table, newest first, about 1,900 rows), filtered to the All India Sainik Schools
 * Entrance Examination and the Rashtriya Indian Military College entrance exam (RIMCEE), which NTA also conducts. The
 * key stays "nta-aissee" because notices are stored under it. The table has no date column; NTA names each uploaded file after its upload time
 * ("Notice_20261103151121.PDF" = 3 Nov 2026, 15:11), which is the date used. Rows without such a name are kept for
 * review with no date.
 */
@Component
public class NtaAisseeAdapter implements OfficialSourceAdapter {

    static final String LISTING = "https://nta.ac.in/NoticeBoardArchive";
    private static final Pattern AISSEE = Pattern.compile("\\bAISSEE\\b|Sainik\\s+Schools?\\b", Pattern.CASE_INSENSITIVE);
    /** NTA also conducts the RIMC entrance exam; RIMC's own website could not be reached. */
    private static final Pattern RIMC = Pattern.compile("\\bRIMCEE\\b|\\bRIMC\\b|Rashtriya Indian Military College", Pattern.CASE_INSENSITIVE);
    /** "Notice_20261103151121.pdf" or "20240112123456.pdf": yyyyMMdd then the time. */
    private static final Pattern UPLOAD_STAMP = Pattern.compile("/(?:Notice_)?(\\d{4})(\\d{2})(\\d{2})\\d{6}\\.pdf$", Pattern.CASE_INSENSITIVE);

    @Override
    public String key() {
        return "nta-aissee";
    }

    @Override
    public String name() {
        return "National Testing Agency (NTA)";
    }

    @Override
    public String listingUrl() {
        return LISTING;
    }

    @Override
    public Set<String> hosts() {
        return Set.of("nta.ac.in", "www.nta.ac.in");
    }

    @Override
    public boolean autoPublish() {
        return true;
    }

    @Override
    public boolean completeListing() {
        return true;
    }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        return parse(http.get(LISTING).html(), today);
    }

    static SourceListing parse(Document doc, LocalDate today) throws SourceLayoutException {
        Elements rows = doc.select("table#tbl tbody tr");
        if (rows.isEmpty()) {
            throw new SourceLayoutException("the notice table (table#tbl) has no rows");
        }
        Map<String, FoundNotice> found = new LinkedHashMap<>();
        int ignored = 0;
        for (Element row : rows) {
            Elements cells = row.select("> td");
            // The "Attachment" cell holds the notice; some old rows also link their title elsewhere.
            Element link = cells.size() > 2 ? cells.get(2).selectFirst("a[href]") : null;
            if (link == null) {
                link = row.selectFirst("a[href]");
            }
            if (cells.size() < 2 || link == null) {
                ignored++;
                continue;
            }
            String title = NoticeText.clean(cells.get(1).text());
            boolean rimc = title != null && RIMC.matcher(title).find();
            if (title == null || (!rimc && !AISSEE.matcher(title).find())) {
                ignored++;
                continue;
            }
            String url = NoticeText.url(link.absUrl("href"));
            if (url == null) {
                ignored++;
                continue;
            }
            LocalDate date = null;
            Matcher m = UPLOAD_STAMP.matcher(url);
            if (m.find()) {
                date = NoticeText.plausible(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)), today);
            }
            String topic = rimc ? "rimc" : "aissee";
            found.putIfAbsent(url, new FoundNotice(url, title, url, date, SiteUpdate.Category.EXAM, topic, "/exams/" + topic,
                    null, date == null ? "NTA's file name for this notice carries no upload date." : null));
        }
        return new SourceListing(rows.size(), new ArrayList<>(found.values()), ignored);
    }
}
