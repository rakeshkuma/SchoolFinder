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

/** The contact form: validated, saved for staff, and the sender's details removed once handled. */
class ContactIT extends AbstractIntegrationTest {

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE contact_message RESTART IDENTITY");
    }

    private Map<String, Object> message() {
        Map<String, Object> m = new HashMap<>();
        m.put("topic", "CORRECTION");
        m.put("name", "Asha Rao");
        m.put("email", "asha@example.org");
        m.put("subject", "Wrong phone number");
        m.put("message", "The phone number on this school's page is out of date.");
        return m;
    }

    private org.springframework.test.web.servlet.ResultActions send(Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/contact").contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private int stored() {
        return jdbc.queryForObject("SELECT count(*) FROM contact_message", Integer.class);
    }

    @Test
    void aMessageIsSavedAndOnlyStaffCanReadIt() throws Exception {
        send(message()).andExpect(status().isAccepted());
        mockMvc.perform(get("/api/v1/admin/contact-messages")).andExpect(status().isUnauthorized());
        long id = body(mockMvc.perform(get("/api/v1/admin/contact-messages").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].email").value("asha@example.org"))
                .andExpect(jsonPath("$.content[0].topic").value("CORRECTION")).andReturn()).at("/content/0/id").asLong();
        mockMvc.perform(post("/api/v1/admin/contact-messages/" + id + "/handled").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.status").value("HANDLED")).andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.name").doesNotExist());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM contact_message WHERE email IS NULL AND name IS NULL", Integer.class)).isEqualTo(1);
    }

    @Test
    void badMessagesAreRefusedAndTheHoneypotIsDiscarded() throws Exception {
        for (String[] bad : new String[][]{{"email", "not-an-email"}, {"message", "short"}, {"name", " "}, {"subject", ""}, {"topic", "OTHER"}}) {
            Map<String, Object> m = message();
            m.put(bad[0], bad[1]);
            send(m).andExpect(status().isBadRequest());
        }
        Map<String, Object> spam = message();
        spam.put("website", "http://spam.example");
        send(spam).andExpect(status().isAccepted());
        assertThat(stored()).isZero();
    }
}
