package com.indiaschoolfinder.service;

import com.indiaschoolfinder.enums.AdmissionStatus;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class AdmissionStatusResolverTest {

    private final AdmissionStatusResolver resolver = new AdmissionStatusResolver();

    @ParameterizedTest(name = "start={0} end={1} today={2} -> {3}")
    @CsvSource(nullValues = "null", value = {
            "null,       null,       2026-11-01, NOT_ANNOUNCED",
            "2026-11-27, 2026-12-19, 2026-11-01, UPCOMING",
            "2026-11-27, 2026-12-19, 2026-11-27, OPEN",      // start date inclusive
            "2026-11-27, 2026-12-19, 2026-12-19, OPEN",      // end date inclusive
            "2026-11-27, 2026-12-19, 2026-12-20, CLOSED",
            "2026-11-27, null,       2026-12-01, OPEN",      // started, end not yet announced
            "2026-11-27, null,       2026-11-26, UPCOMING",
            "null,       2026-12-19, 2026-12-01, NOT_ANNOUNCED", // cannot claim it is open without a start date
            "null,       2026-12-19, 2026-12-20, CLOSED"
    })
    void derivesStatusFromOfficialDates(LocalDate start, LocalDate end, LocalDate today, AdmissionStatus expected) {
        assertThat(resolver.resolve(start, end, today)).isEqualTo(expected);
    }
}
