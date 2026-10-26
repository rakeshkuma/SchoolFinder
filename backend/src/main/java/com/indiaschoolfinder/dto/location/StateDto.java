package com.indiaschoolfinder.dto.location;

import com.indiaschoolfinder.enums.StateKind;

/** A state or union territory with its number of active (published) schools. */
public record StateDto(String code, String name, String slug, StateKind kind, long schoolCount) {
}
