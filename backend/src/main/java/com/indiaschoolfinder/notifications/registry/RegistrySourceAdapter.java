package com.indiaschoolfinder.notifications.registry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.fetch.FetchException;
import com.indiaschoolfinder.notifications.fetch.FetchSession;
import com.indiaschoolfinder.notifications.opportunity.DateText;
import com.indiaschoolfinder.notifications.opportunity.NoticeSlugs;
import com.indiaschoolfinder.notifications.opportunity.OpportunityClassifier;
import com.indiaschoolfinder.notifications.source.FoundNotice;
import com.indiaschoolfinder.notifications.source.NoticeText;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceLayoutException;
import com.indiaschoolfinder.notifications.source.SourceListing;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * An official source defined in the registry file rather than in code: one of a few common ways official sites list
 * notices (see {@link SourceDefinition}), configured by selectors and rules. Like the built-in adapters it returns the
 * title and address exactly as the site gives them and a date only where the site states it; it decides only whether an
 * entry is an admission or job notice at all, and leaves publishing to the ingest step.
 */
public final class RegistrySourceAdapter implements OfficialSourceAdapter {

    public enum Method { WP_MEDIA, S3WAAS_DOCS, HTML_ITEMS }

    public enum DateFrom { SOURCE, TEXT, FILENAME_STAMP, FILENAME_EPOCH, NONE }

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final Pattern STAMP = Pattern.compile("(?<!\\d)(20\\d{2})(\\d{2})(\\d{2})\\d{4,6}(?!\\d)");
    private static final Pattern EPOCH = Pattern.compile("(?<!\\d)(1[4-9]\\d{8})(?!\\d)");
    private static final Pattern LEADING_DATE = Pattern.compile("^\\s*(\\d{1,2}[./-]\\d{1,2}[./-]\\d{4})\\s*[:：|\\-–]\\s*(.+)$");

    private final SourceDefinition def;
    private final Rules rules;
    private final SourceProfile profile;
    private final ObjectMapper json;

    RegistrySourceAdapter(SourceDefinition def, SourceProfile profile, ObjectMapper json) {
        this.def = def;
        this.rules = new Rules(def, profile.noticeTypes());
        this.profile = profile;
        this.json = json;
    }

    public SourceDefinition definition() {
        return def;
    }

    @Override public String key() { return def.key(); }
    @Override public String name() { return def.name(); }
    @Override public String listingUrl() { return def.listingUrl(); }
    @Override public Set<String> hosts() { return Set.copyOf(def.hosts()); }

    @Override
    public Set<String> documentHosts() {
        Set<String> all = new LinkedHashSet<>(def.hosts());
        if (def.documentHosts() != null) all.addAll(def.documentHosts());
        return Set.copyOf(all);
    }

    @Override public boolean autoPublish() { return def.on(def.autoPublish()) && rules.dateFrom != DateFrom.NONE; }

    @Override
    public String reviewOnlyReason() {
        if (autoPublish()) return null;
        if (def.reviewOnlyReason() != null) return def.reviewOnlyReason();
        return rules.dateFrom == DateFrom.NONE ? "This page gives no dates for its entries; an editor confirms each one."
                : "This source is set to review only.";
    }

    @Override public boolean completeListing() { return def.on(def.completeListing()); }
    @Override public SourceProfile profile() { return profile; }
    @Override public boolean enabledByDefault() { return def.enabled() == null || def.enabled(); }
    @Override public boolean schoolPostsOnly() { return rules.schoolPostsOnly; }

    @Override
    public SourceListing fetch(FetchSession http, LocalDate today) throws FetchException, SourceLayoutException, InterruptedException {
        Collector c = new Collector(rules, today);
        for (String url : def.urls()) {
            FetchSession.Page page = http.get(url);
            switch (rules.method) {
                case WP_MEDIA -> parseWpMedia(read(page.body(), url), c);
                case S3WAAS_DOCS -> parseDocs(page.html(), c);
                case HTML_ITEMS -> parseItems(page.html(), c);
            }
        }
        if (c.listed == 0 && !def.on(def.mayBeEmpty())) {
            throw new SourceLayoutException("no entries found (" + rules.method + ") on " + String.join(", ", def.urls()));
        }
        return c.listing();
    }

    private JsonNode read(byte[] body, String url) throws SourceLayoutException {
        try {
            return json.readTree(body);
        } catch (IOException e) {
            throw new SourceLayoutException("the WordPress media API at " + url + " did not answer JSON");
        }
    }

    // --- parsers (static and side-effect free, for tests) --------------------------------------------------------

    /** WordPress media items: id, upload date ("2026-11-17T10:20:30", the site's time), title, file address. */
    static void parseWpMedia(JsonNode root, Collector c) throws SourceLayoutException {
        if (!root.isArray()) {
            throw new SourceLayoutException("the WordPress media API answered " + (root.has("code") ? root.get("code").asText() : "something else") + ", not a list");
        }
        for (JsonNode item : root) {
            String title = item.path("title").path("rendered").asText(null);
            String url = item.path("source_url").asText(null);
            String id = item.path("id").asText(null);
            LocalDate date = null;
            String raw = item.path("date").asText("");
            if (raw.length() >= 10) {
                date = NoticeText.plausible(parse(raw, 0, 4), parse(raw, 5, 7), parse(raw, 8, 10), c.today);
            }
            c.consider(title == null ? null : Jsoup.parse(title).text(), url, date, null, id == null ? null : "wp:" + id);
        }
    }

    /** The government platform's document table: title (bold), "Published On" (dd/mm/yyyy), file link. */
    static void parseDocs(Document doc, Collector c) {
        for (Element row : doc.select("table.documents-table tbody tr")) {
            Elements cells = row.select("> td");
            Element link = row.selectFirst("a[href]");
            if (cells.size() < 2 || link == null) {
                c.listed++;
                c.ignored++;
                continue;
            }
            Element strong = cells.get(0).selectFirst("strong");
            String title = strong != null ? strong.text() : cells.get(0).text();
            LocalDate date = c.rules.dateFrom == DateFrom.SOURCE ? NoticeText.dayMonthYear(NoticeText.clean(cells.get(1).text()), c.today) : null;
            String url = link.absUrl("href");
            c.consider(title, url, date != null ? date : c.dateFromFile(url), null, null);
        }
    }

    /** Entries picked by the definition's selectors. */
    static void parseItems(Document doc, Collector c) {
        Rules r = c.rules;
        for (Element item : doc.select(r.item)) {
            Element titleEl = r.title == null ? item : item.selectFirst(r.title);
            // A link's own title attribute is the cleanest wording (its text may add "(211 KB) |" and icons).
            String title = titleEl == null ? null : !titleEl.attr("title").isBlank() ? titleEl.attr("title") : titleEl.text();
            String url = null;
            Element linkEl = r.link == null ? (item.is("a[href]") ? item : item.selectFirst("a[href]")) : item.selectFirst(r.link);
            if (linkEl != null) {
                url = linkEl.hasAttr("href") ? linkEl.absUrl("href") : linkEl.absUrl("src");
            }
            boolean ownLink = url != null && !url.isBlank() && !url.contains("#");
            String page = doc.location();
            LocalDate date = null;
            String cleanTitle = NoticeText.clean(title);
            if (r.dateFrom == DateFrom.TEXT) {
                if (r.dateSelector != null) {
                    Element d = item.selectFirst(r.dateSelector);
                    date = d == null ? null : bounded(DateText.parse(d.text()), c.today);
                } else if (cleanTitle != null) {
                    Matcher m = LEADING_DATE.matcher(cleanTitle);
                    if (m.matches()) {
                        date = NoticeText.dayMonthYear(m.group(1), c.today);
                        cleanTitle = m.group(2).trim();
                    }
                }
            } else if (ownLink) {
                date = c.dateFromFile(url);
            }
            String itemId = null;
            if (!ownLink && cleanTitle != null) { // several openings on one careers page: told apart by their titles
                String words = NoticeSlugs.words(cleanTitle, 10);
                itemId = page + "#" + (words.isEmpty() ? Integer.toHexString(cleanTitle.hashCode()) : words);
            }
            c.consider(cleanTitle, ownLink ? url : page, date, null, itemId);
        }
    }

    private static int parse(String s, int from, int to) {
        try {
            return Integer.parseInt(s.substring(from, to));
        } catch (RuntimeException e) {
            return 0;
        }
    }

    private static LocalDate bounded(LocalDate d, LocalDate today) {
        return d == null ? null : NoticeText.plausible(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), today);
    }

    // --- rules and collection ------------------------------------------------------------------------------------

    /** The definition's settings, compiled once. */
    static final class Rules {
        final String key;
        final Method method;
        final DateFrom dateFrom;
        final Set<SiteUpdate.Category> allowed;
        final SiteUpdate.Category assume;
        final boolean schoolPostsOnly;
        final boolean reviewGeneric;
        final Pattern include;
        final Pattern exclude;
        final Pattern linkPattern;
        final String item;
        final Integer titlesCutAt;
        final String title;
        final String link;
        final String dateSelector;

        Rules(SourceDefinition d, Set<SiteUpdate.Category> allowed) {
            this.key = d.key();
            this.method = Method.valueOf(d.method());
            this.dateFrom = d.date() == null ? (method == Method.HTML_ITEMS ? DateFrom.NONE : DateFrom.SOURCE) : DateFrom.valueOf(d.date());
            this.allowed = allowed.isEmpty() ? EnumSet.of(SiteUpdate.Category.ADMISSION, SiteUpdate.Category.JOB) : EnumSet.copyOf(allowed);
            this.assume = d.assume() == null ? null : SiteUpdate.Category.valueOf(d.assume());
            this.schoolPostsOnly = d.on(d.schoolPostsOnly());
            this.reviewGeneric = d.on(d.reviewGeneric());
            this.include = d.include() == null ? null : Pattern.compile(d.include(), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
            this.exclude = d.exclude() == null ? null : Pattern.compile(d.exclude(), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
            this.linkPattern = d.linkPattern() == null ? null : Pattern.compile(d.linkPattern(), Pattern.CASE_INSENSITIVE);
            this.item = d.item() == null ? "a[href]" : d.item();
            this.titlesCutAt = d.titlesCutAt();
            this.title = d.title();
            this.link = d.link();
            this.dateSelector = d.dateSelector();
        }
    }

    /** What one read of the source found: entries seen, entries left out, and the notices kept (one per address). */
    static final class Collector {
        final Rules rules;
        final LocalDate today;
        int listed;
        int ignored;
        final Map<String, FoundNotice> notices = new LinkedHashMap<>();

        Collector(Rules rules, LocalDate today) {
            this.rules = rules;
            this.today = today;
        }

        LocalDate dateFromFile(String url) {
            if (url == null) return null;
            String file = url.substring(url.lastIndexOf('/') + 1);
            if (rules.dateFrom == DateFrom.FILENAME_STAMP) {
                Matcher m = STAMP.matcher(file);
                return m.find() ? NoticeText.plausible(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)), today) : null;
            }
            if (rules.dateFrom == DateFrom.FILENAME_EPOCH) {
                Matcher m = EPOCH.matcher(file);
                if (!m.find()) return null;
                LocalDate d = Instant.ofEpochSecond(Long.parseLong(m.group(1))).atZone(INDIA).toLocalDate();
                return bounded(d, today);
            }
            return null;
        }

        void consider(String rawTitle, String rawUrl, LocalDate date, LocalDate closesOn, String itemId) {
            listed++;
            String title = NoticeText.clean(rawTitle);
            String url = NoticeText.url(rawUrl);
            if (title == null || url == null) {
                ignored++;
                return;
            }
            if (rules.linkPattern != null && !rules.linkPattern.matcher(url).find()
                    || rules.exclude != null && rules.exclude.matcher(title).find()
                    || rules.include != null && !rules.include.matcher(title).find()) {
                ignored++;
                return;
            }
            List<String> notes = new ArrayList<>();
            SiteUpdate.Category category;
            if (rules.assume != null) {
                if (OpportunityClassifier.irrelevant(title)) {
                    ignored++;
                    return;
                }
                category = rules.assume;
            } else {
                OpportunityClassifier.Relevance r = OpportunityClassifier.relevance(title, rules.allowed);
                if (r == null) {
                    ignored++;
                    return;
                }
                category = r.category();
                if (!r.certain()) notes.add(r.reason());
            }
            if (category == SiteUpdate.Category.JOB && rules.schoolPostsOnly) {
                OpportunityClassifier.Facts f = OpportunityClassifier.facts(category, title, date);
                if (!f.schoolPost()) {
                    if (f.generic() && rules.reviewGeneric) {
                        notes.add("It names no post; check that it includes school posts (teachers, principals, librarians and the like) before publishing.");
                    } else {
                        ignored++;
                        return;
                    }
                }
            }
            if (fileNameLike(title)) {
                notes.add("Its title is the file's name; give it a clear title before publishing.");
            }
            if (rules.titlesCutAt != null && title.length() >= rules.titlesCutAt - 1 && !title.endsWith("…")) {
                title = title + "…"; // the site printed only the start of it; the official notice has the rest
            }
            String id = itemId != null ? itemId : url;
            FoundNotice n = new FoundNotice(id, title, url, date, category, rules.key, null, null,
                    notes.isEmpty() ? null : String.join(" ", notes), closesOn);
            FoundNotice before = notices.get(id);
            if (before == null || (!before.dated() && n.dated())) {
                notices.put(id, n);
            }
        }

        SourceListing listing() {
            return new SourceListing(listed, new ArrayList<>(notices.values()), ignored);
        }
    }

    /** "Advt_Recruitment_03_2026" or "202611031014468651": a file's name standing in for a title. */
    static boolean fileNameLike(String title) {
        long underscores = title.chars().filter(ch -> ch == '_').count();
        return underscores >= 2 || (!title.contains(" ") && title.length() > 10) || title.toLowerCase(Locale.ROOT).matches(".*\\.(pdf|docx?|jpe?g|png)$");
    }
}
