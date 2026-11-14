package com.indiaschoolfinder.notifications.source;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Navodaya Vidyalaya Samiti headquarters. Its website reads notices from a public JSON API (the same one its pages
 * call): each item has a stable id, an English and Hindi title, a start date (publication) and sometimes an end date.
 * Recruitment notices and notices & circulars are read; tenders, contracts and internal circulars are left out. The
 * site often posts the same notice under both lists with two ids; those are merged (earliest date kept).
 */
@Component
public class NavodayaAdapter implements OfficialSourceAdapter {

    static final String API = "https://navodaya.gov.in/api/public/media?organization_id=100&page=%d&limit=100";
    private static final int MAX_PAGES = 5;

    private static final Pattern SKIP = Pattern.compile(
            "tender|contract agreement|request for proposal|\\bRFP\\b|service charges|portfolio manager|annual maintenance"
                    + "|\\bdesks?\\b|vacation schedule|syllabus|national award|action points|perspective academic|allocation of streams"
                    + "|bio-?data", Pattern.CASE_INSENSITIVE);
    private static final Pattern JNVST = Pattern.compile("\\bJNVST\\b|Jawahar Navodaya Vidyalaya Selection Test", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEST = Pattern.compile("\\bLEST\\b|Lateral Entry", Pattern.CASE_INSENSITIVE);
    private static final Pattern ADMISSION = Pattern.compile("\\badmission", Pattern.CASE_INSENSITIVE);
    private static final Pattern JOB = Pattern.compile(
            "recruitment|\\bposts?\\b|counsell?ors?|teachers?|\\bTGT\\b|\\bPGT\\b|tier-?\\s?I|project (staff|associate|assistant)"
                    + "|deputation|engagement of|vacanc", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper json;

    public NavodayaAdapter(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public String key() {
        return "navodaya";
    }

    @Override
    public String name() {
        return "Navodaya Vidyalaya Samiti";
    }

    @Override
    public String listingUrl() {
        return "https://navodaya.gov.in/nvs/en/";
    }

    @Override
    public Set<String> hosts() {
        return Set.of("navodaya.gov.in");
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
        List<JsonNode> items = new ArrayList<>();
        for (int page = 1; page <= MAX_PAGES; page++) {
            JsonNode root = read(http.get(String.format(Locale.ROOT, API, page)).body());
            JsonNode data = root.path("data");
            if (!root.path("success").asBoolean(false) || !data.path("items").isArray()) {
                throw new SourceLayoutException("the notices API answered without success/data.items");
            }
            data.path("items").forEach(items::add);
            if (!data.path("meta").path("hasNextPage").asBoolean(false)) {
                break;
            }
        }
        return parse(items, today);
    }

    private JsonNode read(byte[] body) throws SourceLayoutException {
        try {
            return json.readTree(body);
        } catch (IOException e) {
            throw new SourceLayoutException("the notices API did not answer with JSON");
        }
    }

    static SourceListing parse(List<JsonNode> items, LocalDate today) throws SourceLayoutException {
        if (items.isEmpty()) {
            throw new SourceLayoutException("the notices API returned no items at all");
        }
        // Same notice under two lists: keep one per normalised title, the earliest date (then the lowest id).
        Map<String, JsonNode> byTitle = new LinkedHashMap<>();
        items.stream()
                .sorted(Comparator.comparing((JsonNode n) -> n.path("start_date").asText("9999"))
                        .thenComparingLong(n -> n.path("id").asLong()))
                .forEach(n -> byTitle.putIfAbsent(normal(title(n)), n));
        List<FoundNotice> found = new ArrayList<>();
        int ignored = items.size() - byTitle.size();
        for (JsonNode n : byTitle.values()) {
            String title = title(n);
            if (title == null || n.path("is_active").asBoolean(true) == false || SKIP.matcher(title).find()) {
                ignored++;
                continue;
            }
            SiteUpdate.Category category;
            String topic;
            String link = null;
            if (JNVST.matcher(title).find()) {
                category = SiteUpdate.Category.EXAM;
                topic = "jnvst";
                link = "/exams/jnvst";
            } else if (LEST.matcher(title).find()) {
                category = SiteUpdate.Category.EXAM;
                topic = "nvs-lest";
            } else if (ADMISSION.matcher(title).find()) {
                category = SiteUpdate.Category.ADMISSION;
                topic = "navodaya";
            } else if (JOB.matcher(title).find()) {
                category = SiteUpdate.Category.JOB;
                topic = "navodaya";
            } else {
                ignored++;
                continue;
            }
            String url = documentUrl(n);
            if (url == null) {
                ignored++;
                continue;
            }
            LocalDate published = date(n.path("start_date").asText(null), today);
            LocalDate end = date(n.path("end_date").asText(null), LocalDate.MAX.minusDays(2));
            found.add(new FoundNotice("media:" + n.path("id").asLong(), title, url, published, category, topic, link, end,
                    published == null ? "The notices API gives no start date for this item." : null));
        }
        return new SourceListing(items.size(), found, ignored);
    }

    private static String title(JsonNode n) {
        String en = NoticeText.clean(n.path("title_english").asText(null));
        return en != null ? en : NoticeText.clean(n.path("title_hindi").asText(null));
    }

    private static String normal(String title) {
        return title == null ? "" : title.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    }

    private static String documentUrl(JsonNode n) {
        String download = n.path("download_url").asText(null);
        if (download != null && !download.isBlank() && !"null".equals(download)) {
            return NoticeText.url(download.startsWith("/") ? "https://navodaya.gov.in" + download : download);
        }
        String external = n.path("external_url").asText(null);
        return external == null || "null".equals(external) ? null : NoticeText.url(external);
    }

    private static LocalDate date(String iso, LocalDate notAfter) {
        if (iso == null || iso.isBlank() || "null".equals(iso)) {
            return null;
        }
        try {
            LocalDate d = LocalDate.parse(iso.length() > 10 ? iso.substring(0, 10) : iso);
            return d.getYear() >= 2015 && !d.isAfter(notAfter.plusDays(1)) ? d : null;
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
