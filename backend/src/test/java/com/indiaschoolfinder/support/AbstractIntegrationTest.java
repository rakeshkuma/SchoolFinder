package com.indiaschoolfinder.support;

import com.indiaschoolfinder.entity.AdminUser;
import com.indiaschoolfinder.enums.AdminRole;
import com.indiaschoolfinder.repository.AdminUserRepository;
import com.indiaschoolfinder.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    protected static final String ADMIN = "test-admin";
    protected static final String EDITOR = "test-editor";
    protected static final String PASSWORD = "correct-horse-battery-staple";
    protected static final String SOURCE = "https://www.edudel.nic.in/";

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected JwtService jwtService;
    @Autowired protected AdminUserRepository adminUserRepository;
    @Autowired protected PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        TestDatabase.Connection db = TestDatabase.get();
        registry.add("spring.datasource.url", db::url);
        registry.add("spring.datasource.username", db::username);
        registry.add("spring.datasource.password", db::password);
    }

    @BeforeEach
    void resetData() {
        jdbc.execute("TRUNCATE school, district, verification_history, admin_audit_log RESTART IDENTITY CASCADE");
        jdbc.update("UPDATE ranking_criterion SET active = TRUE, weight = CASE code "
                + "WHEN 'ACADEMIC_PERFORMANCE' THEN 25 WHEN 'TEACHING_QUALITY' THEN 20 WHEN 'INFRASTRUCTURE' THEN 15 "
                + "WHEN 'SAFETY_WELLBEING' THEN 15 WHEN 'SPORTS_EXTRACURRICULAR' THEN 10 WHEN 'PARENT_FEEDBACK' THEN 10 "
                + "WHEN 'ACCESSIBILITY_TRANSPORT' THEN 5 END");
        ensureAdmin(ADMIN, AdminRole.ADMIN);
        ensureAdmin(EDITOR, AdminRole.EDITOR);
    }

    private void ensureAdmin(String username, AdminRole role) {
        if (!adminUserRepository.existsByUsernameIgnoreCase(username)) {
            AdminUser user = new AdminUser();
            user.setUsername(username);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setRole(role);
            adminUserRepository.save(user);
        }
    }

    protected String adminToken() {
        return "Bearer " + jwtService.issue(ADMIN, AdminRole.ADMIN).value();
    }

    protected String editorToken() {
        return "Bearer " + jwtService.issue(EDITOR, AdminRole.EDITOR).value();
    }

    protected String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    protected JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    /** Minimal valid school; override fields via the map. */
    protected Map<String, Object> school(String name, Map<String, Object> overrides) {
        Map<String, Object> s = new java.util.HashMap<>(Map.of(
                "name", name,
                "schoolType", "PRIVATE",
                "stateCode", "DL",
                "sourceUrl", SOURCE));
        s.putAll(overrides);
        return s;
    }

    protected long createSchool(Map<String, Object> request) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/schools")
                        .header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return body(result).get("id").asLong();
    }
}
