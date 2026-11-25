package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The IndexNow submission contacts an external service, so only an ADMIN may start it; off outside production. */
class AdminSeoIT extends AbstractIntegrationTest {

    @Test
    void onlyAnAdminCanSubmitAndNothingIsSentWhileSwitchedOff() throws Exception {
        mockMvc.perform(post("/api/v1/admin/seo/indexnow")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/seo/indexnow").header("Authorization", editorToken())).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/seo/indexnow").param("all", "true").header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitted").value(0))
                .andExpect(jsonPath("$.message", containsString("switched off")));
    }
}
