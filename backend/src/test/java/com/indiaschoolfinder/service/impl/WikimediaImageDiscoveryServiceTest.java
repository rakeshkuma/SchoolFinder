package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.exception.ServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.hamcrest.Matchers.startsWith;

class WikimediaImageDiscoveryServiceTest {

    private static final String WIKI = "https://en.wikipedia.org/w/api.php";
    private static final String COMMONS = "https://commons.wikimedia.org/w/api.php";

    private MockRestServiceServer server;
    private WikimediaImageDiscoveryService service;
    private final AppProperties properties = new AppProperties();

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new WikimediaImageDiscoveryService(properties, builder.build());
    }

    private static String file(String title, String licence, String artist, String extra) {
        return """
                {"title":"%s","index":%s,"imageinfo":[{"url":"https://upload.wikimedia.org/x/%s",
                 "descriptionurl":"https://commons.wikimedia.org/wiki/%s","thumburl":"https://upload.wikimedia.org/thumb/%s",
                 "width":1200,"height":800,"mime":"image/jpeg","extmetadata":{
                 "LicenseShortName":{"value":"%s"},"Artist":{"value":"%s"}%s}}]}
                """.formatted(title, 1, title.substring(5), title.replace(' ', '_'), title.substring(5), licence, artist, extra);
    }

    @Test
    void returnsLicensedCommonsFilesWikipediaLeadImageFirstAndSkipsNonFreeOnes() {
        server.expect(requestTo(startsWith(WIKI)))
                .andExpect(queryParam("gsrsearch", "Netarhat%20School"))
                .andExpect(header(HttpHeaders.USER_AGENT, startsWith("IndiaSchoolFinder/")))
                .andRespond(withSuccess("""
                        {"query":{"pages":[{"title":"Netarhat Residential School","index":1,"pageimage":"Netarhat_School.jpg"},
                                           {"title":"Logo page","index":2,"pageimage":"Fair_use_logo.png"}]}}""",
                        MediaType.APPLICATION_JSON));
        // The logo exists only on Wikipedia (not on Commons), so it is never suggested.
        server.expect(requestTo(startsWith(COMMONS)))
                .andExpect(queryParam("titles", "File:Netarhat_School.jpg%7CFile:Fair_use_logo.png"))
                .andRespond(withSuccess("{\"query\":{\"pages\":[" + file("File:Netarhat School.jpg", "Public domain", "Unknown", "")
                        + ",{\"title\":\"File:Fair use logo.png\",\"missing\":true}]}}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(startsWith(COMMONS)))
                .andExpect(queryParam("gsrsearch", "Netarhat%20School%20filetype:bitmap"))
                .andRespond(withSuccess("{\"query\":{\"pages\":["
                        + file("File:Netarhat Awasiya Vidyalaya.jpg", "CC BY-SA 4.0", "<a href=\\\"//x\\\">Jane Doe</a>", "")
                        + "," + file("File:NC photo.jpg", "CC BY-NC-SA 2.0", "Someone", "")
                        + "," + file("File:Netarhat School.jpg", "Public domain", "Unknown", "")
                        + "]}}", MediaType.APPLICATION_JSON));

        List<ImageCandidate> found = service.search("Netarhat School", 10);

        assertThat(found).extracting(ImageCandidate::title)
                .containsExactly("File:Netarhat School.jpg", "File:Netarhat Awasiya Vidyalaya.jpg", "File:NC photo.jpg");
        assertThat(found.get(0).source()).isEqualTo("Wikipedia article image");
        assertThat(found.get(0).suggestedPermission()).isEqualTo(ImagePermission.PUBLIC_DOMAIN);
        ImageCandidate cc = found.get(1);
        assertThat(cc.author()).isEqualTo("Jane Doe");
        assertThat(cc.suggestedPermission()).isEqualTo(ImagePermission.OPEN_LICENCE);
        assertThat(cc.attributionText()).isEqualTo("Jane Doe, CC BY-SA 4.0, via Wikimedia Commons");
        assertThat(cc.thumbnailUrl()).startsWith("https://upload.wikimedia.org/thumb/");
        assertThat(cc.pageUrl()).isEqualTo("https://commons.wikimedia.org/wiki/File:Netarhat_Awasiya_Vidyalaya.jpg");
        // Shown so the admin knows it exists, but with no permission it can be published under.
        assertThat(found.get(2).suggestedPermission()).isNull();
        server.verify();
    }

    @Test
    void licencesThatForbidReuseHereGetNoPermission() {
        assertThat(WikimediaImageDiscoveryService.permissionFor("CC0")).isEqualTo(ImagePermission.PUBLIC_DOMAIN);
        assertThat(WikimediaImageDiscoveryService.permissionFor("PD-India")).isEqualTo(ImagePermission.PUBLIC_DOMAIN);
        assertThat(WikimediaImageDiscoveryService.permissionFor("CC BY 3.0")).isEqualTo(ImagePermission.OPEN_LICENCE);
        assertThat(WikimediaImageDiscoveryService.permissionFor("GFDL")).isEqualTo(ImagePermission.OPEN_LICENCE);
        assertThat(WikimediaImageDiscoveryService.permissionFor("CC BY-ND 4.0")).isNull();
        assertThat(WikimediaImageDiscoveryService.permissionFor("Fair use")).isNull();
        assertThat(WikimediaImageDiscoveryService.permissionFor("All rights reserved")).isNull();
        assertThat(WikimediaImageDiscoveryService.permissionFor(null)).isNull();
    }

    @Test
    void trackingParametersAreRemovedFromFileUrls() {
        assertThat(WikimediaImageDiscoveryService.withoutTracking(
                "https://upload.wikimedia.org/a.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"))
                .isEqualTo("https://upload.wikimedia.org/a.jpg");
        assertThat(WikimediaImageDiscoveryService.withoutTracking("https://x.org/a.jpg?w=2&utm_source=y"))
                .isEqualTo("https://x.org/a.jpg?w=2");
        assertThat(WikimediaImageDiscoveryService.withoutTracking("https://x.org/a.jpg")).isEqualTo("https://x.org/a.jpg");
    }

    @Test
    void anUnreachableApiIsReportedAsUnavailable() {
        server.expect(requestTo(startsWith(WIKI))).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertThatThrownBy(() -> service.search("x", 5)).isInstanceOf(ServiceUnavailableException.class);
    }

    @Test
    void canBeTurnedOff() {
        properties.getImageDiscovery().setEnabled(false);
        assertThatThrownBy(() -> service.search("x", 5)).isInstanceOf(ServiceUnavailableException.class);
    }
}
