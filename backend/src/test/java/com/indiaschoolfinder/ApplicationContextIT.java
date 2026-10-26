package com.indiaschoolfinder;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Boots the full application against PostgreSQL: Flyway migrations apply and Hibernate validates the schema. */
class ApplicationContextIT extends AbstractIntegrationTest {

    @Test
    void migrationsApplyAndReferenceDataIsPresent() throws Exception {
        Integer boards = jdbc.queryForObject("select count(*) from education_board", Integer.class);
        Integer weightSum = jdbc.queryForObject("select sum(weight)::int from ranking_criterion where active", Integer.class);
        assertThat(boards).isGreaterThanOrEqualTo(5);
        assertThat(weightSum).isEqualTo(100);

        mockMvc.perform(get("/api/v1/classes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("PRE_NURSERY"))
                .andExpect(jsonPath("$.length()").value(15));
    }

    @Test
    void healthAndOpenApiArePublic() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("India School Finder API"));
    }
}
