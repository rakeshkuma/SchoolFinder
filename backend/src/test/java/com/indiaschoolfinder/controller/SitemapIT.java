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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SitemapIT extends AbstractIntegrationTest {

    @Test
    void robotsAndSitemapsListPublicPagesAndActiveSchoolsOnly() throws Exception {
        createSchool(school("Sitemap Public School", Map.of("stateCode", "BR", "district", "Patna", "boardCode", "CBSE")));
        long hidden = createSchool(school("Sitemap Hidden School", Map.of()));
        mockMvc.perform(patch("/api/v1/admin/schools/{id}/status", hidden).header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false,\"reason\":\"closed\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Disallow: /admin")))
                .andExpect(content().string(containsString("Sitemap: http://localhost/sitemap.xml")));

        mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/pages.xml</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/sitemaps/schools-1.xml</loc>")));

        mockMvc.perform(get("/sitemaps/pages.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/schools</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/states/bihar</loc>")))
                .andExpect(content().string(containsString("<loc>http://localhost/states/bihar/patna</loc>")))
                .andExpect(content().string(not(containsString("/states/uttar-pradesh<"))))
                // Board pages only for boards that have schools.
                .andExpect(content().string(containsString("<loc>http://localhost/boards/CBSE</loc>")))
                .andExpect(content().string(not(containsString("/boards/IB<"))));

        mockMvc.perform(get("/sitemaps/schools-1.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<loc>http://localhost/schools/sitemap-public-school</loc><lastmod>")))
                .andExpect(content().string(not(containsString("sitemap-hidden-school"))));
        mockMvc.perform(get("/sitemaps/schools-2.xml")).andExpect(status().isNotFound());
    }
}
