package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Locations", description = "States, union territories, districts and cities with school counts")
@RestController
@RequestMapping("/api/v1")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @Operation(summary = "All 28 states and 8 union territories with active school counts")
    @GetMapping({"/locations/states", "/states"})
    public List<StateDto> states() {
        return locationService.states();
    }

    @Operation(summary = "One state/UT by ISO 3166-2:IN code (UP) or slug (uttar-pradesh)")
    @GetMapping({"/locations/states/{codeOrSlug}", "/states/{codeOrSlug}"})
    public StateDto state(@PathVariable @Size(max = 80) String codeOrSlug) {
        return locationService.state(codeOrSlug);
    }

    @Operation(summary = "Districts of a state that have school records, with active school counts")
    @GetMapping({"/locations/districts", "/districts"})
    public List<DistrictDto> districts(@RequestParam @Size(max = 80) String state) {
        return locationService.districts(state);
    }

    @Operation(summary = "Cities of a state that have active schools, with counts")
    @GetMapping("/locations/cities/all")
    public List<com.indiaschoolfinder.dto.location.IndiaCityDto> citiesAcrossIndia() {
        return locationService.citiesAcrossIndia();
    }

    @GetMapping({"/locations/cities", "/cities"})
    public List<CityDto> cities(@RequestParam @Size(max = 80) String state) {
        return locationService.cities(state);
    }

    @Operation(summary = "Localities with active schools, optionally within one state")
    @GetMapping("/locations/localities")
    public List<String> localities(@RequestParam(required = false) @Size(max = 80) String state) {
        return locationService.localities(state);
    }
}
