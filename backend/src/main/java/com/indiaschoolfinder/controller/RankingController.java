package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.RankingMethodologyDto;
import com.indiaschoolfinder.dto.ranking.SchoolRankingDto;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.service.RankingService;
import com.indiaschoolfinder.validation.AcademicYear;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Rankings", description = "This site's evidence-based ranking (not an official government ranking)")
@RestController
@RequestMapping("/api/v1/rankings")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @Operation(summary = "Rankings within a scope (India, state, district, city, locality, board, type); definitive "
            + "results first, provisional after. scopePosition is the rank within the scope.")
    @GetMapping
    public PageResponse<SchoolRankingDto> rankings(@RequestParam(required = false) @AcademicYear String academicYear,
                                                   @RequestParam(required = false) @Size(max = 80) String state,
                                                   @RequestParam(required = false) @Size(max = 110) String district,
                                                   @RequestParam(required = false) @Size(max = 80) String city,
                                                   @RequestParam(required = false) @Size(max = 120) String locality,
                                                   @RequestParam(required = false) @Size(max = 20) String board,
                                                   @RequestParam(required = false) SchoolType schoolType,
                                                   @RequestParam(defaultValue = "true") boolean includeProvisional,
                                                   @RequestParam(defaultValue = "false") boolean boarding,
                                                   @RequestParam(required = false) @Size(max = 7) List<ResidentialSystem> residentialSystem,
                                                   @RequestParam(defaultValue = "0") @Min(0) int page,
                                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return rankingService.rankings(academicYear, state, district, city, locality, board, schoolType, includeProvisional,
                boarding, residentialSystem, page, size);
    }

    @Operation(summary = "Top schools with a definitive (non-provisional) rank")
    @GetMapping("/top-schools")
    public List<SchoolRankingDto> top(@RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        return rankingService.topSchools(limit);
    }

    @GetMapping("/locality/{locality}")
    public PageResponse<SchoolRankingDto> byLocality(@PathVariable String locality,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return rankingService.rankings(null, null, null, null, locality, null, null, true, page, size);
    }

    @GetMapping("/board/{board}")
    public PageResponse<SchoolRankingDto> byBoard(@PathVariable String board,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return rankingService.rankings(null, null, null, null, null, board, null, true, page, size);
    }

    @Operation(summary = "Scoring methodology, weights, thresholds and data coverage")
    @GetMapping("/methodology")
    public RankingMethodologyDto methodology() {
        return rankingService.methodology();
    }
}
