package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.exception.ServiceUnavailableException;
import com.indiaschoolfinder.service.ImageDiscoveryService;
import com.indiaschoolfinder.util.InputSanitizer;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Uses the MediaWiki Action API (https://www.mediawiki.org/wiki/API:Imageinfo), which returns each file's author and
 * licence from its description page. Files that exist only on Wikipedia (typically non-free logos used under fair use)
 * are skipped, as are licences that forbid commercial use or changes.
 */
@Slf4j
@Service
public class WikimediaImageDiscoveryService implements ImageDiscoveryService {

    private static final String METADATA = "Artist|LicenseShortName|LicenseUrl|AttributionRequired|ImageDescription|NonFree";

    private final AppProperties.ImageDiscovery config;
    private final RestClient restClient;

    @Autowired
    public WikimediaImageDiscoveryService(AppProperties properties, RestClient.Builder builder) {
        this(properties, builder.requestFactory(requestFactory(properties.getImageDiscovery())).build());
    }

    WikimediaImageDiscoveryService(AppProperties properties, RestClient restClient) {
        this.config = properties.getImageDiscovery();
        this.restClient = restClient;
    }

    private static SimpleClientHttpRequestFactory requestFactory(AppProperties.ImageDiscovery config) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(config.getConnectTimeout());
        factory.setReadTimeout(config.getReadTimeout());
        return factory;
    }

    @Override
    public List<ImageCandidate> search(String query, int limit) {
        requireEnabled();
        Map<String, ImageCandidate> byTitle = new LinkedHashMap<>();
        for (ImageCandidate c : fileInfo(wikipediaLeadImages(query), "Wikipedia article image")) {
            byTitle.putIfAbsent(c.title(), c);
        }
        JsonNode commons = get(UriComponentsBuilder.fromUriString(config.getCommonsApiUrl())
                .queryParam("action", "query").queryParam("format", "json").queryParam("formatversion", "2")
                .queryParam("generator", "search").queryParam("gsrnamespace", "6")
                .queryParam("gsrsearch", query + " filetype:bitmap").queryParam("gsrlimit", limit)
                .queryParam("prop", "imageinfo").queryParam("iiprop", "url|size|mime|extmetadata")
                .queryParam("iiurlwidth", config.getThumbnailWidth()).queryParam("iiextmetadatafilter", METADATA)
                .encode().build().toUri());
        for (JsonNode page : sortedPages(commons)) {
            toCandidate(page, "Wikimedia Commons").ifPresent(c -> byTitle.putIfAbsent(c.title(), c));
        }
        return byTitle.values().stream().limit(limit).toList();
    }

    @Override
    public Optional<ImageCandidate> commonsFile(String fileTitle) {
        requireEnabled();
        List<ImageCandidate> found = fileInfo(List.of(fileTitle), "Wikimedia Commons");
        return found.isEmpty() ? Optional.empty() : Optional.of(found.getFirst());
    }

    /** File names of the lead images of the Wikipedia articles that best match the query. */
    private List<String> wikipediaLeadImages(String query) {
        JsonNode response = get(UriComponentsBuilder.fromUriString(config.getWikipediaApiUrl())
                .queryParam("action", "query").queryParam("format", "json").queryParam("formatversion", "2")
                .queryParam("generator", "search").queryParam("gsrsearch", query).queryParam("gsrlimit", 3)
                .queryParam("prop", "pageimages").queryParam("piprop", "name")
                .encode().build().toUri());
        List<String> files = new ArrayList<>();
        for (JsonNode page : sortedPages(response)) {
            String name = page.path("pageimage").asText("");
            if (!name.isBlank()) files.add("File:" + name);
        }
        return files;
    }

    /** Commons records of the named files; files missing from Commons are left out. */
    private List<ImageCandidate> fileInfo(List<String> fileTitles, String source) {
        if (fileTitles.isEmpty()) return List.of();
        JsonNode response = get(UriComponentsBuilder.fromUriString(config.getCommonsApiUrl())
                .queryParam("action", "query").queryParam("format", "json").queryParam("formatversion", "2")
                .queryParam("titles", String.join("|", fileTitles))
                .queryParam("prop", "imageinfo").queryParam("iiprop", "url|size|mime|extmetadata")
                .queryParam("iiurlwidth", config.getThumbnailWidth()).queryParam("iiextmetadatafilter", METADATA)
                .encode().build().toUri());
        List<ImageCandidate> result = new ArrayList<>();
        for (JsonNode page : response.path("query").path("pages")) {
            if (!page.path("missing").asBoolean(false)) toCandidate(page, source).ifPresent(result::add);
        }
        return result;
    }

    private Optional<ImageCandidate> toCandidate(JsonNode page, String source) {
        JsonNode info = page.path("imageinfo").path(0);
        if (info.isMissingNode() || !info.hasNonNull("url")) return Optional.empty();
        String mime = info.path("mime").asText("");
        if (!mime.startsWith("image/") || mime.equals("image/svg+xml")) return Optional.empty();
        JsonNode meta = info.path("extmetadata");
        String licence = text(meta, "LicenseShortName");
        boolean nonFree = "true".equalsIgnoreCase(text(meta, "NonFree"));
        ImagePermission permission = nonFree ? null : permissionFor(licence);
        String author = text(meta, "Artist");
        boolean attributionRequired = !"false".equalsIgnoreCase(text(meta, "AttributionRequired"));
        String attribution = permission == ImagePermission.OPEN_LICENCE || attributionRequired
                ? attribution(author, licence) : null;
        String description = text(meta, "ImageDescription");
        if (description != null && description.length() > 300) description = description.substring(0, 297) + "…";
        String thumb = withoutTracking(info.path("thumburl").asText(null));
        return Optional.of(new ImageCandidate(source, page.path("title").asText(), info.path("descriptionurl").asText(null),
                withoutTracking(info.get("url").asText()), thumb, intOrNull(info, "width"), intOrNull(info, "height"), mime, author,
                licence, text(meta, "LicenseUrl"), attributionRequired, description, permission, attribution, false));
    }

    /**
     * The permission a stated licence supports here, or null when it does not allow reuse on this site (no licence,
     * fair use, non-commercial or no-derivatives). The administrator still confirms it before publishing.
     */
    static ImagePermission permissionFor(String licence) {
        if (licence == null) return null;
        String l = licence.toLowerCase(Locale.ROOT).trim();
        if (l.matches(".*\\b(nc|nd)\\b.*") || l.contains("fair use") || l.contains("non-free")) {
            return null;
        }
        if (l.contains("public domain") || l.startsWith("pd") || l.startsWith("cc0") || l.contains("cc-zero")) {
            return ImagePermission.PUBLIC_DOMAIN;
        }
        if (l.startsWith("cc by") || l.startsWith("cc-by") || l.startsWith("gfdl") || l.startsWith("attribution")) {
            return ImagePermission.OPEN_LICENCE;
        }
        return null;
    }

    /** Commons adds utm_ parameters to the file URLs it returns; stored URLs should not carry them. */
    static String withoutTracking(String url) {
        if (url == null) return null;
        return url.replaceAll("(?<=[?&])utm_[^&#]*(&|(?=#|$))", "").replaceAll("[?&]+($|#)", "$1");
    }

    /** "Jane Doe, CC BY-SA 4.0, via Wikimedia Commons" */
    static String attribution(String author, String licence) {
        String who = author == null ? "Unknown author" : author;
        return licence == null ? who + ", via Wikimedia Commons" : who + ", " + licence + ", via Wikimedia Commons";
    }

    /** Search results come back unordered; "index" is the search rank. */
    private static List<JsonNode> sortedPages(JsonNode response) {
        List<JsonNode> pages = new ArrayList<>();
        response.path("query").path("pages").forEach(pages::add);
        pages.sort(java.util.Comparator.comparingInt(p -> p.path("index").asInt(Integer.MAX_VALUE)));
        return pages;
    }

    /** extmetadata values may contain HTML (links to the author's page); keep only the text. */
    private static String text(JsonNode meta, String field) {
        JsonNode value = meta.path(field).path("value");
        return value.isMissingNode() || value.isNull() ? null : InputSanitizer.clean(value.asText());
    }

    private static Integer intOrNull(JsonNode node, String field) {
        int v = node.path(field).asInt(0);
        return v > 0 ? v : null;
    }

    private JsonNode get(URI uri) {
        try {
            JsonNode body = restClient.get().uri(uri).header(HttpHeaders.USER_AGENT, config.getUserAgent())
                    .retrieve().body(JsonNode.class);
            if (body == null || body.has("error")) {
                throw new ServiceUnavailableException("Wikimedia returned an unexpected response; please try again later");
            }
            return body;
        } catch (RestClientException e) {
            log.warn("Wikimedia request failed: {}", e.getMessage());
            throw new ServiceUnavailableException("Wikimedia is unavailable; please try again later", e);
        }
    }

    private void requireEnabled() {
        if (!config.isEnabled()) {
            throw new ServiceUnavailableException("Image search is turned off (app.image-discovery.enabled=false)");
        }
    }
}
