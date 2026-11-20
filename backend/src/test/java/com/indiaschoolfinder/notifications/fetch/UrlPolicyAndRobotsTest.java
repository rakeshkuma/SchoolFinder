package com.indiaschoolfinder.notifications.fetch;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;

class UrlPolicyAndRobotsTest {

    @Test
    void canonicalAddressesIgnoreCaseOfHostDefaultPortAndFragment() {
        assertThat(UrlPolicy.canonical("HTTPS://NTA.ac.in:443/Download/Notice/Notice_1.PDF#page=2"))
                .isEqualTo("https://nta.ac.in/Download/Notice/Notice_1.PDF");
        assertThat(UrlPolicy.canonical("https://www.rashtriyamilitaryschools.edu.in/Attachments/List of Documents.pdf"))
                .isEqualTo("https://www.rashtriyamilitaryschools.edu.in/Attachments/List%20of%20Documents.pdf");
        assertThat(UrlPolicy.canonical("https://navodaya.gov.in/api/public/media/342/download?organization_id=100"))
                .endsWith("?organization_id=100");
        assertThat(UrlPolicy.canonical("not a url")).isNull();
    }

    @Test
    void privateAndReservedAddressesAreNotPublic() throws Exception {
        for (String ip : new String[] {"127.0.0.1", "10.1.0.22", "192.168.1.5", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
                "::1", "fd00::1", "::ffff:10.0.0.1"}) {
            assertThat(UrlPolicy.isPublic(InetAddress.getByName(ip))).as(ip).isFalse();
        }
        assertThat(UrlPolicy.isPublic(InetAddress.getByName("164.100.1.1"))).isTrue();
    }

    @Test
    void robotsGroupsPathsAndWildcards() {
        RobotsRules kvs = RobotsRules.parse("User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n", "SchoolDhundoBot");
        assertThat(kvs.allows("/en/interview-notice/")).isTrue();
        assertThat(kvs.allows("/wp-admin/options.php")).isFalse();
        assertThat(kvs.allows("/wp-admin/admin-ajax.php")).isTrue();

        RobotsRules ours = RobotsRules.parse("User-agent: *\nDisallow:\n\nUser-agent: SchoolDhundoBot\nDisallow: /*.pdf$\n", "SchoolDhundoBot");
        assertThat(ours.allows("/notice.pdf")).isFalse();
        assertThat(ours.allows("/notice.pdf?x=1")).isTrue();
        assertThat(ours.allows("/notices/")).isTrue();

        // Navodaya serves its app page in place of robots.txt: no rules.
        assertThat(RobotsRules.parse("<!doctype html><html><body>app</body></html>", "SchoolDhundoBot").allows("/api/x")).isTrue();
        assertThat(RobotsRules.parse("User-agent: *\nDisallow: /\n", "SchoolDhundoBot").allows("/anything")).isFalse();
    }
}
