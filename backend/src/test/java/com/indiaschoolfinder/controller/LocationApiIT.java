package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** India-wide locations: states/UTs, districts created on first use, location filters and autocomplete. */
class LocationApiIT extends AbstractIntegrationTest {

    private long lucknowSchool(String name, String district, Map<String, Object> extra) throws Exception {
        Map<String, Object> overrides = new java.util.HashMap<>(Map.of("stateCode", "Uttar Pradesh", "district", district,
                "city", "Lucknow", "pinCode", "226001", "latitude", 26.8467, "longitude", 80.9462));
        overrides.putAll(extra);
        return createSchool(school(name, overrides));
    }

    @Test
    void listsAll36StatesAndUnionTerritoriesWithSchoolCounts() throws Exception {
        createSchool(school("Delhi School", Map.of()));

        mockMvc.perform(get("/api/v1/locations/states"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(36))
                .andExpect(jsonPath("$[?(@.kind == 'UNION_TERRITORY')].code", org.hamcrest.Matchers.hasSize(8)))
                .andExpect(jsonPath("$[?(@.code == 'DL')].schoolCount", hasItem(1)))
                .andExpect(jsonPath("$[?(@.code == 'KL')].schoolCount", hasItem(0)));

        mockMvc.perform(get("/api/v1/locations/states/tamil-nadu"))
                .andExpect(jsonPath("$.code").value("TN"));
        mockMvc.perform(get("/api/v1/locations/states/XX")).andExpect(status().isNotFound());
    }

    @Test
    void schoolsAnywhereInIndiaGetStateAndDistrictReferences() throws Exception {
        long id = lucknowSchool("City Montessori Test School", "Lucknow", Map.of("udiseCode", "09270100101",
                "management", "PRIVATE_UNAIDED", "affiliationNumber", "2130001"));
        // Same district written differently: resolved to the existing row, not a new one.
        lucknowSchool("Second Lucknow School", "  lucknow ", Map.of("hasHostel", false));

        mockMvc.perform(get("/api/v1/schools/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stateCode").value("UP"))
                .andExpect(jsonPath("$.stateName").value("Uttar Pradesh"))
                .andExpect(jsonPath("$.stateSlug").value("uttar-pradesh"))
                .andExpect(jsonPath("$.district.name").value("Lucknow"))
                .andExpect(jsonPath("$.district.slug").value("lucknow"))
                .andExpect(jsonPath("$.udiseCode").value("09270100101"))
                .andExpect(jsonPath("$.management").value("PRIVATE_UNAIDED"));

        mockMvc.perform(get("/api/v1/locations/districts").param("state", "UP"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].schoolCount").value(2));
        mockMvc.perform(get("/api/v1/locations/cities").param("state", "uttar-pradesh"))
                .andExpect(jsonPath("$[0].name").value("Lucknow"))
                .andExpect(jsonPath("$[0].schoolCount").value(2));
        // Creating a district is an audited administrative change.
        mockMvc.perform(get("/api/v1/admin/audit-log").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.content[*].action", hasItem("DISTRICT_CREATED")));
    }

    @Test
    void directoryFiltersByStateDistrictCityManagementAndDayOrBoarding() throws Exception {
        lucknowSchool("Lucknow Boarding School", "Lucknow", Map.of("hasHostel", true));
        lucknowSchool("Lucknow Day School", "Lucknow", Map.of("hasHostel", false, "management", "STATE_GOVERNMENT"));
        lucknowSchool("Unknown Hostel School", "Lucknow", Map.of());
        createSchool(school("Kendriya Vidyalaya Test", Map.of("management", "CENTRAL_GOVERNMENT", "network", "KENDRIYA_VIDYALAYA")));

        mockMvc.perform(get("/api/v1/schools").param("state", "UP"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].stateName").value("Uttar Pradesh"))
                .andExpect(jsonPath("$.content[0].districtName").value("Lucknow"));
        mockMvc.perform(get("/api/v1/schools").param("state", "uttar-pradesh").param("district", "lucknow"))
                .andExpect(jsonPath("$.totalElements").value(3));
        mockMvc.perform(get("/api/v1/schools").param("state", "DL").param("district", "lucknow"))
                .andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/schools").param("city", "LUCKNOW"))
                .andExpect(jsonPath("$.totalElements").value(3));
        // Unknown hostel status matches neither boarding nor day.
        mockMvc.perform(get("/api/v1/schools").param("hasHostel", "false"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Lucknow Day School"));
        mockMvc.perform(get("/api/v1/schools").param("hasHostel", "true"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools").param("management", "STATE_GOVERNMENT"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/schools").param("network", "KENDRIYA_VIDYALAYA"))
                .andExpect(jsonPath("$.content[0].name").value("Kendriya Vidyalaya Test"));
        mockMvc.perform(get("/api/v1/schools").param("state", "Narnia"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("state"));
    }

    @Test
    void freeTextSearchMatchesCityAndExactUdiseCode() throws Exception {
        lucknowSchool("Alpha Academy", "Lucknow", Map.of("udiseCode", "09270100555"));
        createSchool(school("Beta Academy", Map.of()));

        mockMvc.perform(get("/api/v1/schools/search").param("q", "academy lucknow"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Alpha Academy"));
        mockMvc.perform(get("/api/v1/schools/search").param("q", "09270100555"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void autocompleteReturnsSchoolsAndPlaces() throws Exception {
        lucknowSchool("Lucknow Public School", "Lucknow", Map.of());

        mockMvc.perform(get("/api/v1/schools/suggest").param("q", "luckn"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schools[0].slug").value("lucknow-public-school"))
                .andExpect(jsonPath("$.places[*].type", hasItem("DISTRICT")))
                .andExpect(jsonPath("$.places[*].type", hasItem("CITY")));
        mockMvc.perform(get("/api/v1/schools/suggest").param("q", "pradesh"))
                .andExpect(jsonPath("$.places[*].label", hasItem("Uttar Pradesh")))
                .andExpect(jsonPath("$.places[*].label", hasItem("Andhra Pradesh")));
        // One character is not enough to search.
        mockMvc.perform(get("/api/v1/schools/suggest").param("q", "l"))
                .andExpect(jsonPath("$.schools.length()").value(0))
                .andExpect(jsonPath("$.places.length()").value(0));
    }

    @Test
    void duplicateUdiseCodeIsRejectedAndCoordinatesMustBeInIndia() throws Exception {
        lucknowSchool("First UDISE School", "Lucknow", Map.of("udiseCode", "09270100777"));
        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(school("Renamed School", Map.of("stateCode", "UP", "udiseCode", "09270100777")))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("UDISE code 09270100777")));

        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(school("London School", Map.of("latitude", 51.5, "longitude", -0.12)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("latitude")))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItem("longitude")));

        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(school("Nowhere School", Map.of("stateCode", "Atlantis")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("stateCode"));
    }

    @Test
    void boardAffiliationNumberIdentifiesSchoolsInImportsAndTheApi() throws Exception {
        // Two different schools may share a generic name and PIN when their affiliation numbers differ.
        String csv = "name,school_type,source_url,pin_code,state_code,board_code,affiliation_number\n"
                + "Govt. Sr. Sec. School,GOVERNMENT,https://saras.cbse.gov.in/a,737101,SK,CBSE,1820003\n"
                + "Govt. Sr. Sec. School,GOVERNMENT,https://saras.cbse.gov.in/b,737101,SK,CBSE,1820005\n";
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/admin/import/csv")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "a.csv", "text/csv", csv.getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(2));
        // Re-importing the same affiliation numbers updates instead of duplicating.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/admin/import/csv")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "a.csv", "text/csv", csv.getBytes()))
                        .param("updateExisting", "true").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.updated").value(2))
                .andExpect(jsonPath("$.created").value(0));

        mockMvc.perform(post("/api/v1/admin/schools").header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(school("Another Name", Map.of("stateCode", "SK", "boardCode", "CBSE", "affiliationNumber", "1820003")))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("affiliation no. 1820003")));
    }

    @Test
    void csvImportAttachesUdiseCodeToAnExistingProfileInsteadOfDuplicatingIt() throws Exception {
        String first = "name,school_type,source_url,pin_code,state_code,district\n"
                + "Village School,GOVERNMENT,https://example.org/a,262001,UP,Pilibhit\n";
        String withCode = "name,school_type,source_url,pin_code,state_code,district,udise_code\n"
                + "Village School,GOVERNMENT,https://example.org/a,262001,UP,Pilibhit,09210100101\n";
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/admin/import/csv")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "a.csv", "text/csv", first.getBytes()))
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(1));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/admin/import/csv")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "b.csv", "text/csv", withCode.getBytes()))
                        .param("updateExisting", "true").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.updated").value(1))
                .andExpect(jsonPath("$.created").value(0));

        mockMvc.perform(get("/api/v1/schools/search").param("q", "09210100101"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].districtName").value("Pilibhit"));
    }
}
