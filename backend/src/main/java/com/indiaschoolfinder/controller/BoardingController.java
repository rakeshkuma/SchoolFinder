package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.school.BoardingStatsDto;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.service.BoardingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Boarding directory facets. School lists use the regular school search with its boarding filters. */
@Tag(name = "Boarding schools", description = "Residential-school directory facets")
@RestController
@RequestMapping("/api/v1/boarding")
public class BoardingController {

    private final BoardingService boardingService;

    public BoardingController(BoardingService boardingService) {
        this.boardingService = boardingService;
    }

    @GetMapping("/systems")
    public Map<ResidentialSystem, Long> systems() {
        return boardingService.countsBySystem();
    }

    @Operation(summary = "Active boarding schools by state, by gender (as the sources state it) and by residential system")
    @GetMapping("/stats")
    public BoardingStatsDto stats() {
        return boardingService.stats();
    }
}
