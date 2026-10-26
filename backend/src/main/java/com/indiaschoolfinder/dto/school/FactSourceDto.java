package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.SchoolFact;

import java.time.LocalDate;

/** The source of one profile fact that came from somewhere other than the profile's main source. */
public record FactSourceDto(SchoolFact fact, String sourceUrl, LocalDate sourceRetrievedDate, String note) {
}
