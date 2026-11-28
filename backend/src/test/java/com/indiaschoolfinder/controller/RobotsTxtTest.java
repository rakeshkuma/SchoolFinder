package com.indiaschoolfinder.controller;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** robots.txt keeps search and answer engines and AI-training crawlers under separate control. */
class RobotsTxtTest {

    @Test
    void byDefaultEveryCrawlerFollowsTheGeneralRules() {
        String robots = SitemapController.robotsTxt("https://schooldhundo.in", true);
        assertThat(robots).startsWith("User-agent: *\nAllow: /\nDisallow: /admin\n")
                .contains("Disallow: /exams/practice/progress\n")
                .endsWith("Disallow: /exams/challenges\n\nSitemap: https://schooldhundo.in/sitemap.xml\n")
                .doesNotContain("GPTBot").doesNotContain("Disallow: /\n");
    }

    @Test
    void queryStringCopiesThatOnlyCostCrawlingAreKeptOut() {
        String robots = SitemapController.robotsTxt("https://schooldhundo.in", true);
        // The claim form's per-school copies and old profile-section addresses are not crawled ...
        assertThat(robots).contains("Disallow: /claim-school?\n").contains("Disallow: /schools/*?tab=\n");
        // ... while the plain pages they copy stay open: the claim page, every profile and the contact page.
        assertThat(robots).doesNotContain("Disallow: /claim-school\n").doesNotContain("Disallow: /schools\n")
                .doesNotContain("Disallow: /schools/\n").doesNotContain("Disallow: /contact");
    }

    @Test
    void trainingCrawlersCanBeShutOutWithoutTouchingSearchAndAnswerEngines() {
        String robots = SitemapController.robotsTxt("https://schooldhundo.in", false);
        // The general group, which Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User and PerplexityBot follow, is unchanged.
        assertThat(robots).startsWith(SitemapController.robotsTxt("https://schooldhundo.in", true)
                .replace("\nSitemap: https://schooldhundo.in/sitemap.xml\n", ""));
        assertThat(robots).contains("User-agent: GPTBot\n").contains("User-agent: ClaudeBot\n").contains("User-agent: CCBot\n")
                .contains("User-agent: Bytespider\nDisallow: /\n")
                .endsWith("\nSitemap: https://schooldhundo.in/sitemap.xml\n");
        // Search and answer crawlers are never named, so they keep the general rules; Google-Extended stays allowed
        // because it also decides whether Gemini apps may ground their answers in these pages.
        for (String engine : new String[]{"Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Google-Extended"}) {
            assertThat(robots).doesNotContain("User-agent: " + engine);
        }
    }
}
