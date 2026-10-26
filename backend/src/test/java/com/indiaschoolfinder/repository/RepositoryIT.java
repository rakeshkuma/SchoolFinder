package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import com.indiaschoolfinder.util.GeoUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RepositoryIT extends AbstractIntegrationTest {

    @Autowired SchoolRepository schoolRepository;

    private School school(String name, String slug, String pin, Double lat, Double lon) {
        School s = new School();
        s.setName(name);
        s.setSlug(slug);
        s.setSchoolType(SchoolType.PRIVATE);
        s.setPinCode(pin);
        s.setLatitude(lat);
        s.setLongitude(lon);
        s.setStateCode("DL");
        s.setSourceUrl("https://example.org");
        return s;
    }

    @Test
    void sameNameAndPinIsAllowedInAnotherStateAndUdiseCodesAreUnique() {
        schoolRepository.saveAndFlush(school("Government Primary School", "gps-1", null, null, null));
        School other = school("Government Primary School", "gps-2", null, null, null);
        other.setStateCode("UP");
        schoolRepository.saveAndFlush(other);

        // With UDISE codes, identical names in one state are distinct schools; the code itself is unique.
        School a = school("Government Primary School", "gps-3", null, null, null);
        a.setUdiseCode("09010100101");
        School b = school("Government Primary School", "gps-4", null, null, null);
        b.setUdiseCode("09010100102");
        schoolRepository.saveAllAndFlush(List.of(a, b));
        School clash = school("Another Name", "gps-5", null, null, null);
        clash.setUdiseCode("09010100101");
        assertThatThrownBy(() -> schoolRepository.saveAndFlush(clash)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseEnforcesUniqueSlugAndUniqueNamePerPinCode() {
        schoolRepository.saveAndFlush(school("Unique School", "unique-school", "110001", null, null));

        assertThatThrownBy(() -> schoolRepository.saveAndFlush(school("Another", "unique-school", "110002", null, null)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> schoolRepository.saveAndFlush(school("UNIQUE SCHOOL", "unique-school-2", "110001", null, null)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsHalfACoordinatePair() {
        assertThatThrownBy(() -> schoolRepository.saveAndFlush(school("Half Coords", "half-coords", null, 28.6, null)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void duplicateLookupIsCaseInsensitiveAndTreatsMissingPinAsEmpty() {
        schoolRepository.saveAndFlush(school("Case School", "case-school", null, null, null));
        assertThat(schoolRepository.findDuplicate("case school", null, "DL")).isPresent();
        assertThat(schoolRepository.findDuplicate("case school", "110001", "DL")).isEmpty();
        assertThat(schoolRepository.findDuplicate("case school", null, "UP")).isEmpty();
    }

    @Test
    void nearbyQueryMatchesJavaHaversine() {
        schoolRepository.saveAndFlush(school("India Gate Side", "ig", "110001", 28.6129, 77.2295));
        schoolRepository.saveAndFlush(school("Connaught Place Side", "cp", "110001", 28.6315, 77.2167));

        GeoUtil.BoundingBox box = GeoUtil.boundingBox(28.6129, 77.2295, 5);
        List<Object[]> rows = schoolRepository.findNearby(28.6129, 77.2295, box.minLat(), box.maxLat(), box.minLon(), box.maxLon(), 5, 10);

        assertThat(rows).hasSize(2);
        double dbDistance = ((Number) rows.get(1)[1]).doubleValue();
        assertThat(dbDistance).isCloseTo(GeoUtil.haversineKm(28.6129, 77.2295, 28.6315, 77.2167), org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void localitiesAreDistinctAndSorted() {
        School a = school("A", "a", null, null, null);
        a.setLocality("Rohini");
        School b = school("B", "b", null, null, null);
        b.setLocality("Dwarka");
        School c = school("C", "c", "110002", null, null);
        c.setLocality("Rohini");
        schoolRepository.saveAllAndFlush(List.of(a, b, c));
        assertThat(schoolRepository.findDistinctLocalities()).containsExactly("Dwarka", "Rohini");
    }
}
