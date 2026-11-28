package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UDISE+ details on school profiles: the editor's checked link, link safety, and matching an official list. */
class UdiseIT extends AbstractIntegrationTest {

    private static final String LINK = "https://kys.udiseplus.gov.in/#/schooldetail/2823379086/11";

    private long school(String name, String slug, String state, String pin) {
        jdbc.update("""
                INSERT INTO school (name, slug, school_type, city, state_code, pin_code, source_url, active, verification_status, created_at, updated_at)
                VALUES (?, ?, 'PRIVATE', 'Town', ?, ?, 'https://example.org', TRUE, 'UNVERIFIED', now(), now())""", name, slug, state, pin);
        return jdbc.queryForObject("SELECT id FROM school WHERE slug = ?", Long.class, slug);
    }

    private String body(String code, String url, boolean checked) {
        return "{\"udiseCode\":" + (code == null ? "null" : "\"" + code + "\"") + ",\"profileUrl\":" + (url == null ? "null" : "\"" + url + "\"")
                + ",\"checked\":" + checked + "}";
    }

    @Test
    void aSchoolWithoutDetailsStillWorksAndReturnsNullUdiseFields() throws Exception {
        long id = school("Dashmesh Public School", "dashmesh-public-school", "DL", "110096");
        mockMvc.perform(get("/api/v1/schools/slug/dashmesh-public-school"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.udiseCode").doesNotExist())
                .andExpect(jsonPath("$.udiseProfileUrl").doesNotExist())
                .andExpect(jsonPath("$.udiseMatchStatus").doesNotExist());
    }

    @Test
    void anEditorsCheckedCodeAndLinkAppearOnTheProfile() throws Exception {
        long id = school("Dashmesh Public School", "dashmesh-public-school", "DL", "110096");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(body("07040123456", LINK, true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchStatus").value("VERIFIED_MATCH"));
        mockMvc.perform(get("/api/v1/schools/slug/dashmesh-public-school"))
                .andExpect(jsonPath("$.udiseCode").value("07040123456"))
                .andExpect(jsonPath("$.udiseProfileUrl").value(LINK))
                .andExpect(jsonPath("$.udiseMatchStatus").value("VERIFIED_MATCH"))
                .andExpect(jsonPath("$.udiseVerifiedOn").isNotEmpty());
        // Search by code still finds it.
        mockMvc.perform(get("/api/v1/schools").param("q", "07040123456")).andExpect(jsonPath("$.content[0].id").value(id));
        // Code only, no link: the profile offers the portal's search.
        mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", id).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(body("07040123456", null, true))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/schools/slug/dashmesh-public-school")).andExpect(jsonPath("$.udiseProfileUrl").doesNotExist());
    }

    @Test
    void malformedCodesUnsafeLinksAndUncheckedDetailsAreRefused() throws Exception {
        long id = school("Dashmesh Public School", "dashmesh-public-school", "DL", "110096");
        for (String json : new String[] {
                body("0704012345", null, true),                                   // 10 digits
                body("07O40123456", null, true),                                  // a letter
                body(null, "http://kys.udiseplus.gov.in/#/schooldetail/1/1", true), // not https
                body(null, "https://evil.example.com/#/schooldetail/1/1", true),   // another host
                body(null, "https://kys.udiseplus.gov.in.evil.com/#/schooldetail/1/1", true),
                body(null, "javascript:alert(1)", true),
                body(null, "https://kys.udiseplus.gov.in/#/schooldetail/1/1?next=https://evil.example.com", true),
                body("07040123456", LINK, false)}) {                              // not confirmed as checked
            mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", id).header("Authorization", editorToken())
                    .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isBadRequest());
        }
        assertThat(jdbc.queryForObject("SELECT udise_code IS NULL AND udise_profile_url IS NULL FROM school WHERE id = ?", Boolean.class, id)).isTrue();
        // The database refuses an unsafe link even if written directly.
        assertThatThrownBy(() -> jdbc.update("UPDATE school SET udise_profile_url = 'https://evil.example.com/x' WHERE id = ?", id))
                .hasMessageContaining("ck_school_udise_profile_url");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", id).contentType(MediaType.APPLICATION_JSON).content(body("07040123456", null, true)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oneCodeNeverBelongsToTwoSchools() throws Exception {
        long a = school("Government High School", "ghs-leh-a", "LA", "194101");
        long b = school("Government High School", "ghs-leh-b", "LA", "194201");
        mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", a).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(body("37010100101", null, true))).andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/admin/schools/{id}/udise", b).header("Authorization", editorToken())
                .contentType(MediaType.APPLICATION_JSON).content(body("37010100101", null, true))).andExpect(status().isConflict());
    }

    @Test
    void anOfficialListIsADryRunFirstAndOnlyUnambiguousMatchesAreWritten() throws Exception {
        long dashmesh = school("Dashmesh Pub School", "dashmesh-pub-school", "DL", "110096");
        long leh1 = school("Government High School", "ghs-leh-1", "LA", "194101");
        long leh2 = school("Government High School, Leh", "ghs-leh-2", "LA", "194101");
        long elsewhere = school("Dashmesh Public School", "dashmesh-punjab", "PB", "141001");
        String csv = """
                UDISE_CODE,SCHOOL_NAME,STATE,PINCODE,DISTRICT
                07040123456,DASHMESH PUBLIC SCHOOL,Delhi,110096,East
                37010100101,GOVERNMENT HIGH SCHOOL,Ladakh,194101,Leh
                12345,BROKEN ROW,Delhi,110001,East
                """;
        MockMultipartFile file = new MockMultipartFile("file", "list.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/v1/admin/import/udise").file(file).header("Authorization", editorToken())).andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/v1/admin/import/udise").file(file).header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(false))
                .andExpect(jsonPath("$.rowsInvalid").value(1))
                .andExpect(jsonPath("$.verifiedMatches").value(1))
                .andExpect(jsonPath("$.verified[0].schoolId").value(dashmesh))
                .andExpect(jsonPath("$.pendingReview").value(2))
                .andExpect(jsonPath("$.written").value(0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM school WHERE udise_code IS NOT NULL OR udise_match_status IS NOT NULL", Long.class)).isZero();

        mockMvc.perform(multipart("/api/v1/admin/import/udise").file(file).param("apply", "true").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.applied").value(true))
                .andExpect(jsonPath("$.written").value(1));
        assertThat(jdbc.queryForObject("SELECT udise_code FROM school WHERE id = ?", String.class, dashmesh)).isEqualTo("07040123456");
        assertThat(jdbc.queryForObject("SELECT udise_match_status FROM school WHERE id = ?", String.class, leh1)).isEqualTo("PENDING_REVIEW");
        assertThat(jdbc.queryForObject("SELECT udise_code FROM school WHERE id = ?", String.class, leh2)).isNull();
        assertThat(jdbc.queryForObject("SELECT udise_code FROM school WHERE id = ?", String.class, elsewhere)).isNull(); // never by name alone
        assertThat(jdbc.queryForObject("SELECT udise_profile_url FROM school WHERE id = ?", String.class, dashmesh)).isNull(); // no made-up link

        // Running it again changes nothing.
        mockMvc.perform(multipart("/api/v1/admin/import/udise").file(file).param("apply", "true").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.written").value(0))
                .andExpect(jsonPath("$.alreadySet").value(1));
    }
}
