package com.indiaschoolfinder.util;

import com.indiaschoolfinder.validation.HttpUrlValidator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class UtilTest {

    @Test
    void academicYearStartsInApril() {
        assertThat(AcademicYears.of(LocalDate.of(2026, 3, 31))).isEqualTo("2025-26");
        assertThat(AcademicYears.of(LocalDate.of(2026, 4, 1))).isEqualTo("2026-27");
        assertThat(AcademicYears.of(LocalDate.of(2099, 12, 1))).isEqualTo("2099-00");
    }

    @Test
    void academicYearValidationRequiresConsecutiveYears() {
        assertThat(AcademicYears.isValid("2026-27")).isTrue();
        assertThat(AcademicYears.isValid("2026-28")).isFalse();
        assertThat(AcademicYears.isValid("2026/27")).isFalse();
        assertThat(AcademicYears.isValid(null)).isFalse();
    }

    @Test
    void slugsAreLowercaseAsciiAndHyphenated() {
        assertThat(SlugUtil.toSlug("Delhi Public School R. K. Puram")).isEqualTo("delhi-public-school-r-k-puram");
        assertThat(SlugUtil.toSlug("St. Mary's & Co-Ed School", "Safdarjung")).isEqualTo("st-mary-s-and-co-ed-school-safdarjung");
        assertThat(SlugUtil.toSlug("केंद्रीय")).isEqualTo("school");
    }

    @Test
    void sanitizerStripsMarkupAndKeepsUnknownAsNull() {
        assertThat(InputSanitizer.clean("<script>alert(1)</script>Great <b>teachers</b> & staff")).isEqualTo("Great teachers & staff");
        assertThat(InputSanitizer.clean("   ")).isNull();
        assertThat(InputSanitizer.clean(null)).isNull();
    }

    @Test
    void urlValidatorAcceptsOnlyAbsoluteHttpUrls() {
        assertThat(HttpUrlValidator.isValid("https://www.cbse.gov.in/")).isTrue();
        assertThat(HttpUrlValidator.isValid("javascript:alert(1)")).isFalse();
        assertThat(HttpUrlValidator.isValid("ftp://example.org")).isFalse();
        assertThat(HttpUrlValidator.isValid("/relative/path")).isFalse();
        assertThat(HttpUrlValidator.isValid(null)).isTrue();
    }

    @Test
    void haversineDistanceIsAccurate() {
        // Connaught Place to India Gate is roughly 2.4 km.
        double km = GeoUtil.haversineKm(28.6315, 77.2167, 28.6129, 77.2295);
        assertThat(km).isBetween(2.2, 2.6);
    }
}
