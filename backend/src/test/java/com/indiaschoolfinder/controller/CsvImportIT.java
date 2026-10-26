package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CsvImportIT extends AbstractIntegrationTest {

    private static MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "schools.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void bundledSeedFileIsValidAndImportsWithFacilities() throws Exception {
        byte[] seed = new ClassPathResource("seed/delhi-schools.csv").getContentAsByteArray();
        MockMultipartFile file = new MockMultipartFile("file", "delhi-schools.csv", "text/csv", seed);

        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(file).param("mode", "VALIDATE_ONLY")
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errors.length()").value(0))
                .andExpect(jsonPath("$.committed").value(false));

        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(file).header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(80))
                .andExpect(jsonPath("$.committed").value(true));

        mockMvc.perform(get("/api/v1/schools/slug/modern-school-barakhamba-road"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.board.code").value("CBSE"))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.sourceUrl").value("https://www.modernschool.net/contact.php"));
        long id = jdbc.queryForObject("select id from school where slug = 'modern-school-barakhamba-road'", Long.class);
        mockMvc.perform(get("/api/v1/schools/{id}/facilities", id))
                .andExpect(jsonPath("$[0].sourceUrl").value("https://www.modernschool.net/facilities.php"));
    }

    @Test
    void boardingColumnsCreateAValidatedBoardingProfile() throws Exception {
        String json = """
                [
                  {"name": "Fixture Hill School", "school_type": "PRIVATE", "state_code": "UK",
                   "source_url": "https://example.org/hill", "boarding_type": "FULL_BOARDING",
                   "residential_system": "PRIVATE_BOARDING", "entrance_exam": "SCHOOL_TEST", "entry_classes": "V–IX",
                   "boarding_summary": "Fixture boarding school.", "boarding_source_url": "https://example.org/hill/boarding"},
                  {"name": "Fixture Bad Boarding School", "school_type": "PRIVATE", "state_code": "UK",
                   "source_url": "https://example.org/bad", "residential_system": "CASTLE"}
                ]""";
        MockMultipartFile file = new MockMultipartFile("file", "boarding.json", "application/json", json.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/v1/admin/import/json").file(file).param("mode", "VALID_ROWS_ONLY")
                        .header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(1))
                // second record: unknown residential system (boarding type may be left blank: "not stated")
                .andExpect(jsonPath("$.errors[*].field", hasItem("residential_system")))
                .andExpect(jsonPath("$.errors[*].row", hasItem(2)));

        mockMvc.perform(get("/api/v1/schools/search").param("boarding", "true"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].entryClasses").value("V–IX"))
                .andExpect(jsonPath("$.content[0].boardingVerificationStatus").value("UNVERIFIED"));
        long id = jdbc.queryForObject("select id from school where name = 'Fixture Hill School'", Long.class);
        mockMvc.perform(get("/api/v1/schools/{id}", id))
                .andExpect(jsonPath("$.boarding.sourceUrl").value("https://example.org/hill/boarding"))
                .andExpect(jsonPath("$.hasHostel").value(true));
    }

    @Test
    void allOrNothingSavesNothingWhenAnyRowIsInvalid() throws Exception {
        String content = """
                name,school_type,board_code,pin_code,source_url,latitude,has_transport,state_code
                Good School,PRIVATE,CBSE,110001,https://example.org/good,,yes,DL
                Missing Source School,PRIVATE,CBSE,110002,,,,DL
                Bad Values School,SPACESHIP,XYZ,999,https://example.org/bad,abc,maybe,Atlantis
                Good School,PRIVATE,CBSE,110001,https://example.org/dup,,,Delhi
                """;
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.committed").value(false))
                .andExpect(jsonPath("$.validRows").value(1))
                .andExpect(jsonPath("$.errors[*].field", hasItem("source_url")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("school_type")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("board_code")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("pin_code")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("latitude")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("has_transport")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("state_code")))
                // duplicate within the file ("Delhi" and "DL" are the same state)
                .andExpect(jsonPath("$.errors[*].row", hasItem(5)));

        mockMvc.perform(get("/api/v1/schools")).andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).param("mode", "VALID_ROWS_ONLY")
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(1))
                .andExpect(jsonPath("$.committed").value(true));
    }

    @Test
    void existingSchoolsAreOnlyUpdatedWhenRequested() throws Exception {
        String content = "name,school_type,source_url,pin_code,state\nRepeat School,PRIVATE,https://example.org/a,110001,Delhi\n";
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(1));
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).header("Authorization", adminToken()))
                .andExpect(jsonPath("$.committed").value(false))
                .andExpect(jsonPath("$.errors[0].message").value(org.hamcrest.Matchers.containsString("already exists")));
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).param("updateExisting", "true")
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.updated").value(1));

        // Once verified by a person, a file can no longer overwrite the record.
        long id = jdbc.queryForObject("select id from school where name = 'Repeat School'", Long.class);
        mockMvc.perform(post("/api/v1/admin/schools/{id}/verify", id).header("Authorization", adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entityType\":\"SCHOOL\",\"status\":\"VERIFIED\",\"sourceUrl\":\"https://example.org/a\"}"))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).param("updateExisting", "true")
                        .param("mode", "VALID_ROWS_ONLY").header("Authorization", adminToken()))
                .andExpect(jsonPath("$.updated").value(0))
                .andExpect(jsonPath("$.errors[0].message").value(org.hamcrest.Matchers.containsString("is verified")));
    }

    @Test
    void importedNamesAreTidiedAndStillMatchOnReimport() throws Exception {
        // As built from a postal address: stray comma junk, a district marker and a place read twice.
        String content = "name,school_type,source_url,pin_code,state\n"
                + "\"Fixture Public School, - Solmara Solmara Dt-\",PRIVATE,https://example.org/a,784001,Assam\n";
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(1));
        org.assertj.core.api.Assertions.assertThat(
                jdbc.queryForObject("select name from school where pin_code = '784001'", String.class))
                .isEqualTo("Fixture Public School, Solmara");
        // The same messy row matches the tidied record (name + PIN) instead of creating a duplicate.
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv(content)).param("updateExisting", "true")
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(0))
                .andExpect(jsonPath("$.updated").value(1));
    }

    @Test
    void jsonImportUsesTheSameRulesAndReportsRecordPositions() throws Exception {
        String json = """
                {"schools": [
                  {"name": "Patna Json School", "school_type": "PRIVATE", "state_code": "BR", "district": "Patna",
                   "board_code": "CBSE", "class_codes": ["NURSERY", "KG", "I"], "pin_code": "800001",
                   "facilities": ["LIBRARY:Library"], "source_url": "https://example.org/patna", "established_year": 1990},
                  {"name": "No Source School", "school_type": "PRIVATE", "state_code": "BR"}
                ]}
                """;
        MockMultipartFile file = new MockMultipartFile("file", "schools.json", "application/json", json.getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/v1/admin/import/json").file(file).header("Authorization", adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.committed").value(false))
                .andExpect(jsonPath("$.errors[0].row").value(2))
                .andExpect(jsonPath("$.errors[0].field").value("source_url"));
        mockMvc.perform(multipart("/api/v1/admin/import/json").file(file).param("mode", "VALID_ROWS_ONLY")
                        .header("Authorization", adminToken()))
                .andExpect(jsonPath("$.created").value(1));
        mockMvc.perform(get("/api/v1/schools").param("state", "BR").param("facility", "LIBRARY").param("className", "KG"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Patna Json School"));

        mockMvc.perform(multipart("/api/v1/admin/import/json")
                        .file(new MockMultipartFile("file", "x.json", "application/json", "{\"a\":1}".getBytes(StandardCharsets.UTF_8)))
                        .header("Authorization", adminToken()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/api/v1/admin/import/json").file(file).header("Authorization", editorToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void importRequiresAdminRoleAndRequiredColumns() throws Exception {
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv("name\nX\n")).header("Authorization", editorToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/v1/admin/import/csv").file(csv("name,locality\nX,Y\n")).header("Authorization", adminToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("missing required columns")));
    }
}
