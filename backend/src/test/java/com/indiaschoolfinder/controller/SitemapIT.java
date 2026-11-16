package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SitemapIT extends AbstractIntegrationTest {

    @Test
    void robotsAndSitemapsListPublicPagesAndActiveSchoolsOnly() throws Exception {
        createSchool(school("Sitemap Public School", Map.of("stateCode", "BR", "district", "Patna", "boardCode", "CBSE",
                "description", SeoHeadIT.RICH_DESCRIPTION)));
        createSchool(school("Sitemap Second School", Map.of("stateCode", "BR", "district", "Patna")));
        createSchool(school("Sitemap Third School", Map.of("stateCode", "BR", "district", "Patna")));
        createSchool(school("Sitemap Lone School", Map.of("stateCode", "BR", "district", "Buxar")));
        long hidden = createSchool(school("Sitemap Hidden School", Map.of()));
        mockMvc.perform(patch("/api/v1/admin/schools/{id}/status", hidden).header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false,\"reason\":\"closed\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Disallow: /admin")))
                // The public API stays crawlable so pages render for search engines; private parts are not.
                .andExpect(content().string(not(containsString("Disallow: /api/\n"))))
                .andExpect(content().string(containsString("Disallow: /api/v1/admin/")))
                .andExpect(content().string(containsString("Disallow: /api/v1/account")))
                .andExpect(content().string(containsString("Sitemap: http://localhost/sitemap.xml")));
        // API answers are never indexed themselves, errors included.
        mockMvc.perform(get("/api/v1/schools")).andExpect(header().string("X-Robots-Tag", "noindex"));
        mockMvc.perform(get("/api/v1/schools/slug/no-such-school")).andExpect(status().isNotFound())
                .andExpect(header().string("X-Robots-Tag", "noindex"));
        mockMvc.perform(get("/robots.txt")).andExpect(header().doesNotExist("X-Robots-Tag"));

        mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/pages.xml</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/places.xml</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/exams.xml</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/blog.xml</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/schools-1.xml</loc>")));

        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/schools</loc>")))
                // Board pages only for boards that have schools.
                .andExpect(content().string(containsString("<loc>http://localhost/boards/CBSE</loc>")))
                .andExpect(content().string(not(containsString("/boards/IB<"))))
                .andExpect(content().string(not(containsString("/states/bihar<"))));

        mockMvc.perform(get("/sitemaps/places.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/states/bihar</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/states/bihar/patna</loc>")))
                // A district with a single school is not a page worth indexing yet.
                .andExpect(content().string(not(containsString("/states/bihar/buxar<"))))
                .andExpect(content().string(not(containsString("/states/uttar-pradesh<"))));
        mockMvc.perform(get("/sitemaps/blog.xml")).andExpect(status().isOk())
                .andExpect(content().string(containsString("<urlset")));

        mockMvc.perform(get("/sitemaps/schools-1.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/schools/sitemap-public-school</loc><lastmod>")))
                // A bare board listing is noindex, so it is not offered either.
                .andExpect(content().string(not(containsString("sitemap-second-school"))))
                .andExpect(content().string(not(containsString("sitemap-hidden-school"))));
        mockMvc.perform(get("/sitemaps/schools-2.xml")).andExpect(status().isNotFound());
    }
}
