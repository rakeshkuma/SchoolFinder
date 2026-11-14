package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admission enquiries: consent required, validated, saved for staff, contact details removed when closed. */
class EnquiryIT extends AbstractIntegrationTest {

    private long schoolId;
    private int sent;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.execute("TRUNCATE admission_enquiry RESTART IDENTITY");
        schoolId = createSchool(school("Fixture Enquiry School", Map.of("stateCode", "BR")));
    }

    private Map<String, Object> enquiry() {
        Map<String, Object> m = new HashMap<>();
        m.put("parentName", "Asha Rao");
        m.put("phone", "+91 98765-43210");
        m.put("email", "asha@example.org");
        m.put("classCode", "VI");
        m.put("academicYear", "2027-28");
        m.put("message", "Is there a hostel for Class VI?");
        m.put("consent", true);
        return m;
    }

    private org.springframework.test.web.servlet.ResultActions send(long id, Map<String, Object> body) throws Exception {
        // A different address each time, so the hourly limit per address (tested elsewhere) does not interfere.
        String address = "10.9.0." + (++sent);
        return mockMvc.perform(post("/api/v1/schools/" + id + "/enquiries").contentType(MediaType.APPLICATION_JSON).content(json(body))
                .with(request -> { request.setRemoteAddr(address); return request; }));
    }

    private int stored() {
        return jdbc.queryForObject("SELECT count(*) FROM admission_enquiry", Integer.class);
    }

    @Test
    void anEnquiryIsSavedForStaffAndClosingItRemovesTheParentsDetails() throws Exception {
        send(schoolId, enquiry()).andExpect(status().isAccepted());
        mockMvc.perform(get("/api/v1/admin/enquiries")).andExpect(status().isUnauthorized());
        long id = body(mockMvc.perform(get("/api/v1/admin/enquiries").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].schoolName").value("Fixture Enquiry School"))
                .andExpect(jsonPath("$.content[0].phone").value("9876543210"))
                .andExpect(jsonPath("$.content[0].classCode").value("VI")).andReturn()).at("/content/0/id").asLong();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admission_enquiry WHERE consented_at IS NOT NULL", Integer.class)).isEqualTo(1);

        mockMvc.perform(post("/api/v1/admin/enquiries/" + id + "/status").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "FORWARDED", "note", "Emailed the office"))))
                .andExpect(jsonPath("$.status").value("FORWARDED")).andExpect(jsonPath("$.phone").value("9876543210"));
        mockMvc.perform(post("/api/v1/admin/enquiries/" + id + "/status").header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "CLOSED"))))
                .andExpect(jsonPath("$.status").value("CLOSED")).andExpect(jsonPath("$.phone").doesNotExist())
                .andExpect(jsonPath("$.parentName").doesNotExist()).andExpect(jsonPath("$.staffNote").value("Emailed the office"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admission_enquiry WHERE phone IS NULL AND email IS NULL AND parent_name IS NULL",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void enquiriesWithoutConsentOrWithBadDetailsAreRefusedAndTheHoneypotIsDiscarded() throws Exception {
        for (Object[] bad : new Object[][]{{"consent", false}, {"phone", "12345"}, {"phone", "5876543210"}, {"email", "nope"},
                {"parentName", " "}, {"classCode", "<b>"}, {"academicYear", "2027"}}) {
            Map<String, Object> m = enquiry();
            m.put((String) bad[0], bad[1]);
            send(schoolId, m).andExpect(status().isBadRequest());
        }
        Map<String, Object> noConsent = enquiry();
        noConsent.remove("consent");
        send(schoolId, noConsent).andExpect(status().isBadRequest());
        send(999_999, enquiry()).andExpect(status().isNotFound());

        Map<String, Object> spam = enquiry();
        spam.put("website", "http://spam.example");
        send(schoolId, spam).andExpect(status().isAccepted());
        assertThat(stored()).isZero();
    }
}
