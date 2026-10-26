package com.indiaschoolfinder.dto.reference;

import com.indiaschoolfinder.enums.DataSourceType;

import java.time.LocalDate;

public record DataSourceDto(String name, String url, DataSourceType sourceType, String publisher,
                            String description, LocalDate lastCheckedDate) {
}
