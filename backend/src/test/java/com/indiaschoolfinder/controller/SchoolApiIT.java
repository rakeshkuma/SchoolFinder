package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SchoolApiIT extends AbstractIntegrationTest {

    private Map<String, Object> mayurViharCbse() {
        return school("Test Public School", Map.of("boardCode", "CBSE", "locality", "Mayur Vihar Phase I",
                "pinCode", "110091", "latitude", 28.6120, "longitude", 77.2881,
                "classCodes", List.of("NURSERY", "KG", "I", "II")));
    }

    @Test
    void createdSchoolIsReadableByIdAndSlugWithUnknownValuesAsNull() throws Exception {
        long id = createSchool(mayurViharCbse());

        mockMvc.perform(get("/api/v1/schools/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("test-public-school"))
                .andExpect(jsonPath("$.board.code").value("CBSE"))
                .andExpect(jsonPath("$.classesOffered[0].code").value("NURSERY"))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"))
                // Unknown facts are null, never 0 or invented text.
                .andExpect(jsonPath("$.studentTeacherRatio").value(nullValue()))
                .andExpect(jsonPath("$.phone").value(nullValue()))
                .andExpect(jsonPath("$.averageRating").value(nullValue()))
                .andExpect(jsonPath("$.reviewCount").value(0));

        mockMvc.perform(get("/api/v1/schools/slug/test-public-school"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void directoryFiltersByLocalityBoardTypeAndClass() throws Exception {
        createSchool(mayurViharCbse());
        createSchool(school("Other Board School", Map.of("boardCode", "CISCE", "locality", "Mayur Vihar Phase II", "pinCode", "110091")));
        createSchool(school("Government School", Map.of("schoolType", "GOVERNMENT", "boardCode", "CBSE", "locality", "Karol Bagh")));

        mockMvc.perform(get("/api/v1/schools").param("locality", "Mayur Vihar").param("board", "CBSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Test Public School"));

        mockMvc.perform(get("/api/v1/schools").param("schoolType", "GOVERNMENT"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Government School"));

        mockMvc.perform(get("/api/v1/schools").param("className", "KG"))
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/v1/schools").param("stage", "PRE_PRIMARY"))
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/v1/schools/search").param("q", "110091"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void paginationAndSortingWork() throws Exception {
        for (String name : List.of("Alpha School", "Bravo School", "Charlie School", "Delta School", "Echo School")) {
            createSchool(school(name, Map.of()));
        }
        mockMvc.perform(get("/api/v1/schools").param("page", "1").param("size", "2").param("sortBy", "name").param("sortDirection", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Charlie School"))
                .andExpect(jsonPath("$.content[1].name").value("Bravo School"));
    }

    @Test
    void invalidSortFieldAndBadParametersReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/schools").param("sortBy", "passwordHash"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("sortBy"));
        mockMvc.perform(get("/api/v1/schools").param("schoolType", "MARS_BASE"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/schools").param("size", "1000"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/schools").param("minAnnualFee", "5000").param("maxAnnualFee", "100"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nearbyReturnsSchoolsWithinRadiusNearestFirst() throws Exception {
        createSchool(school("Near School", Map.of("latitude", 28.6130, "longitude", 77.2300, "pinCode", "110001")));
        createSchool(school("Far School", Map.of("latitude", 28.7041, "longitude", 77.1025, "pinCode", "110085")));
        createSchool(school("No Coordinates School", Map.of()));

        mockMvc.perform(get("/api/v1/schools/nearby").param("latitude", "28.6129").param("longitude", "77.2295").param("radiusKm", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Near School"))
                .andExpect(jsonPath("$[0].distanceKm").isNumber());

        mockMvc.perform(get("/api/v1/schools").param("latitude", "28.6129").param("longitude", "77.2295").param("radiusKm", "25"))
                .andExpect(jsonPath("$.content[0].name").value("Near School"))
                .andExpect(jsonPath("$.content[1].name").value("Far School"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void duplicateSchoolIsRejectedWith409() throws Exception {
        createSchool(mayurViharCbse());
        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(mayurViharCbse())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    void validationFailuresAreReportedPerField() throws Exception {
        // PIN codes never start with 0; latitude 45 is outside India.
        Map<String, Object> invalid = Map.of("name", "", "schoolType", "PRIVATE", "pinCode", "012345",
                "email", "not-an-email", "latitude", 45.0, "websiteUrl", "javascript:alert(1)");
        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("name")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("sourceUrl")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("stateCode")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("pinCode")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("email")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("latitude")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("websiteUrl")));
    }

    @Test
    void protectedFieldsCannotBeMassAssigned() throws Exception {
        Map<String, Object> request = new java.util.HashMap<>(school("Sneaky School", Map.of()));
        request.put("averageRating", 5);
        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminEndpointsRequireAuthenticationAndRoles() throws Exception {
        mockMvc.perform(post("/api/v1/admin/schools").contentType(MediaType.APPLICATION_JSON).content(json(mayurViharCbse())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());

        long id = createSchool(mayurViharCbse());
        // Editors can edit data but not change a school's public status.
        mockMvc.perform(patch("/api/v1/admin/schools/{id}/status", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("active", false, "reason", "test"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/data-quality").header("Authorization", editorToken()))
                .andExpect(status().isOk());
    }

    @Test
    void deactivatedSchoolDisappearsFromPublicApi() throws Exception {
        long id = createSchool(mayurViharCbse());
        mockMvc.perform(patch("/api/v1/admin/schools/{id}/status", id).header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("active", false, "reason", "Closed permanently"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/v1/schools/{id}", id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/schools")).andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/admin/schools/{id}", id).header("Authorization", adminToken())).andExpect(status().isOk());
    }

    @Test
    void updateUsesOptimisticLockingThroughIfMatch() throws Exception {
        long id = createSchool(mayurViharCbse());
        MvcResult current = mockMvc.perform(get("/api/v1/admin/schools/{id}", id).header("Authorization", adminToken()))
                .andExpect(header().exists("ETag")).andReturn();
        String etag = current.getResponse().getHeader("ETag");

        Map<String, Object> changed = new java.util.HashMap<>(mayurViharCbse());
        changed.put("phone", "011-12345678");
        mockMvc.perform(put("/api/v1/admin/schools/{id}", id).header("Authorization", adminToken()).header("If-Match", etag)
                        .contentType(MediaType.APPLICATION_JSON).content(json(changed)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("011-12345678"));

        // Re-using the old ETag means someone else's change would be overwritten.
        mockMvc.perform(put("/api/v1/admin/schools/{id}", id).header("Authorization", adminToken()).header("If-Match", etag)
                        .contentType(MediaType.APPLICATION_JSON).content(json(mayurViharCbse())))
                .andExpect(status().isConflict());
    }

    @Test
    void unknownSchoolReturnsConsistent404() throws Exception {
        mockMvc.perform(get("/api/v1/schools/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/v1/schools/999999"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void auditLogRecordsAdministrativeChanges() throws Exception {
        createSchool(mayurViharCbse());
        mockMvc.perform(get("/api/v1/admin/audit-log").header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].action").value("SCHOOL_CREATED"))
                .andExpect(jsonPath("$.content[0].actor").value(ADMIN));
    }
}
