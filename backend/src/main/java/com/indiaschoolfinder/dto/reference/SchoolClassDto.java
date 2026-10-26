package com.indiaschoolfinder.dto.reference;

import com.indiaschoolfinder.enums.SchoolStage;

public record SchoolClassDto(String code, String name, SchoolStage stage, int sortOrder) {
}
