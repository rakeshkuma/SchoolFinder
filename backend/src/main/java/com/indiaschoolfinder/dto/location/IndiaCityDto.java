package com.indiaschoolfinder.dto.location;

/** A city with listed schools anywhere in India, with its state, for the all-cities page (/states/{stateSlug}/city/{slug}). */
public record IndiaCityDto(String name, String slug, String stateCode, String stateName, String stateSlug, long schoolCount) {
}
