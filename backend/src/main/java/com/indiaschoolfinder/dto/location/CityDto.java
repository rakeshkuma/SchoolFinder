package com.indiaschoolfinder.dto.location;

/** A city with listed schools; {@code slug} is its address under the state, e.g. /states/delhi/city/new-delhi. */
public record CityDto(String name, String slug, String stateCode, long schoolCount) {
}
