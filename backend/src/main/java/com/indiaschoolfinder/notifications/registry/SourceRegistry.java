package com.indiaschoolfinder.notifications.registry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.select.QueryParser;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * The reviewed list of official sources beyond the built-in adapters (classpath notifications/sources.json). Each entry
 * is checked when the application starts; an entry with a mistake is left out and reported (in the log and to staff),
 * never allowed to stop the site or the other sources. The file is code-reviewed like any other change, so a source is
 * only ever added by a person who looked at the site.
 */
@Slf4j
@Component
public class SourceRegistry {

    static final String FILE = "notifications/sources.json";
    static final Set<String> CATEGORIES = Set.of("RECRUITMENT_BODY", "SCHOOL_SYSTEM", "SCHOOL", "EXAM_BODY", "EDUCATION_DEPARTMENT");
    private static final Pattern KEY = Pattern.compile("^[a-z0-9][a-z0-9-]{2,39}$");
    private static final Pattern HOST = Pattern.compile("^[a-z0-9.-]+\\.[a-z]{2,}$");

    private final List<RegistrySourceAdapter> adapters;
    private final List<String> problems;

    public SourceRegistry(ObjectMapper json) {
        List<RegistrySourceAdapter> ok = new ArrayList<>();
        List<String> bad = new ArrayList<>();
        load(json, new ClassPathResource(FILE), ok, bad);
        this.adapters = List.copyOf(ok);
        this.problems = List.copyOf(bad);
        bad.forEach(p -> log.error("Source registry: {}", p));
        log.info("Source registry: {} official source(s) loaded from {}{}", ok.size(), FILE,
                bad.isEmpty() ? "" : ", " + bad.size() + " left out (see errors above)");
    }

    /** The sources that passed every check, in the file's order. */
    public List<OfficialSourceAdapter> adapters() {
        return List.copyOf(adapters);
    }

    /** What was wrong with the entries left out (empty when the file is clean). */
    public List<String> problems() {
        return problems;
    }

    static void load(ObjectMapper json, ClassPathResource file, List<RegistrySourceAdapter> ok, List<String> bad) {
        if (!file.exists()) {
            bad.add(FILE + " is missing");
            return;
        }
        JsonNode root;
        try (InputStream in = file.getInputStream()) {
            root = json.readTree(in);
        } catch (IOException e) {
            bad.add(FILE + " is not valid JSON: " + e.getMessage());
            return;
        }
        Set<String> keys = new HashSet<>();
        int index = 0;
        for (JsonNode node : root.path("sources")) {
            index++;
            SourceDefinition d;
            try {
                d = json.treeToValue(node, SourceDefinition.class);
            } catch (IOException e) {
                String why = e instanceof com.fasterxml.jackson.core.JsonProcessingException j ? j.getOriginalMessage() : e.getMessage();
                bad.add("entry " + index + " (" + node.path("key").asText("?") + "): " + why);
                continue;
            }
            List<String> errors = validate(d);
            if (d.key() != null && !keys.add(d.key())) {
                errors.add("the key is used twice");
            }
            if (!errors.isEmpty()) {
                bad.add("entry " + index + " (" + d.key() + "): " + String.join("; ", errors));
                continue;
            }
            ok.add(new RegistrySourceAdapter(d, profile(d), json));
        }
    }

    static SourceProfile profile(SourceDefinition d) {
        Set<SiteUpdate.Category> types = EnumSet.noneOf(SiteUpdate.Category.class);
        d.notices().forEach(n -> types.add(SiteUpdate.Category.valueOf(n)));
        boolean school = "SCHOOL".equals(d.category());
        return new SourceProfile(d.institution() != null ? d.institution() : d.name(), d.category(),
                d.sector() == null ? null : SiteUpdate.Sector.valueOf(d.sector()), d.boarding(), d.state(), d.city(), d.school(),
                d.reliability(), d.method(), types, d.prefixTitles() != null ? d.prefixTitles() : school, "JOB".equals(d.assume()));
    }

    /** Every reason the entry cannot be used; empty when it is fine. */
    static List<String> validate(SourceDefinition d) {
        List<String> e = new ArrayList<>();
        if (d.key() == null || !KEY.matcher(d.key()).matches()) e.add("key must be 3-40 lower-case letters, digits or hyphens");
        if (blank(d.name()) || d.name().length() > 160) e.add("name is required (at most 160 characters)");
        if (d.category() == null || !CATEGORIES.contains(d.category())) e.add("category must be one of " + CATEGORIES);
        if (d.sector() != null && !Set.of("GOVERNMENT", "PRIVATE").contains(d.sector())) e.add("sector must be GOVERNMENT or PRIVATE");
        if (d.state() != null && !d.state().matches("^[A-Z]{2}$")) e.add("state must be a two-letter state code");
        if (d.notices() == null || d.notices().isEmpty() || !Set.of("ADMISSION", "JOB").containsAll(d.notices())) {
            e.add("notices must list ADMISSION and/or JOB");
        }
        if (!Set.of(SourceProfile.OFFICIAL_PORTAL, SourceProfile.OFFICIAL_SCHOOL_SITE).contains(d.reliability())) {
            e.add("reliability must be OFFICIAL_PORTAL or OFFICIAL_SCHOOL_SITE");
        }
        RegistrySourceAdapter.Method method = null;
        try {
            method = RegistrySourceAdapter.Method.valueOf(String.valueOf(d.method()));
        } catch (IllegalArgumentException ex) {
            e.add("method must be one of WP_MEDIA, S3WAAS_DOCS, HTML_ITEMS");
        }
        if (d.date() != null) {
            try {
                RegistrySourceAdapter.DateFrom from = RegistrySourceAdapter.DateFrom.valueOf(d.date());
                if (from == RegistrySourceAdapter.DateFrom.SOURCE && method == RegistrySourceAdapter.Method.HTML_ITEMS) {
                    e.add("an HTML page has no date of its own: use TEXT, FILENAME_STAMP, FILENAME_EPOCH or NONE");
                }
            } catch (IllegalArgumentException ex) {
                e.add("date must be one of SOURCE, TEXT, FILENAME_STAMP, FILENAME_EPOCH, NONE");
            }
        }
        if (d.assume() != null && !Set.of("ADMISSION", "JOB").contains(d.assume())) e.add("assume must be ADMISSION or JOB");
        if (d.assume() != null && d.notices() != null && !d.notices().contains(d.assume())) e.add("assume must be one of the notices");
        if (d.hosts() == null || d.hosts().isEmpty() || !d.hosts().stream().allMatch(h -> h != null && HOST.matcher(h).matches())) {
            e.add("hosts must list the exact lower-case host names requested");
        }
        if (d.documentHosts() != null && !d.documentHosts().stream().allMatch(h -> h != null && HOST.matcher(h).matches())) {
            e.add("documentHosts must be lower-case host names");
        }
        if (d.urls() == null || d.urls().isEmpty()) {
            e.add("urls must list at least one address to read");
        } else if (d.hosts() != null) {
            for (String u : d.urls()) {
                if (!httpsOn(u, d.hosts())) e.add("url " + u + " must be https on one of the hosts");
            }
        }
        if (d.listingUrl() == null || !d.listingUrl().startsWith("https://")) e.add("listingUrl must be an https address");
        for (String[] rx : new String[][]{{"include", d.include()}, {"exclude", d.exclude()}, {"linkPattern", d.linkPattern()}}) {
            if (rx[1] != null) {
                try {
                    Pattern.compile(rx[1]);
                } catch (PatternSyntaxException ex) {
                    e.add(rx[0] + " is not a valid regular expression");
                }
            }
        }
        for (String[] css : new String[][]{{"item", d.item()}, {"title", d.title()}, {"link", d.link()}, {"dateSelector", d.dateSelector()}}) {
            if (css[1] != null) {
                try {
                    QueryParser.parse(css[1]);
                } catch (RuntimeException ex) {
                    e.add(css[0] + " is not a valid CSS selector");
                }
            }
        }
        if (method == RegistrySourceAdapter.Method.HTML_ITEMS && d.item() == null) e.add("HTML_ITEMS needs an item selector");
        if (Boolean.FALSE.equals(d.enabled()) && blank(d.disabledReason())) e.add("a switched-off source needs a disabledReason");
        return e;
    }

    private static boolean httpsOn(String url, List<String> hosts) {
        try {
            URI u = URI.create(url);
            return "https".equals(u.getScheme()) && u.getHost() != null && hosts.contains(u.getHost().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
