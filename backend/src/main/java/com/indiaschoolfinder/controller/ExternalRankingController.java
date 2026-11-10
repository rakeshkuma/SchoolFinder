package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.ExternalRankingListItemDto;
import com.indiaschoolfinder.dto.ranking.RankingPublisherDto;
import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.service.ExternalRankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import com.indiaschoolfinder.dto.ranking.RankingCatalogDtos;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Published rankings", description = "Rankings published by others, checked against the publisher's page")
@RestController
@RequestMapping("/api/v1/rankings")
public class ExternalRankingController {

    private final ExternalRankingService service;

    private final com.indiaschoolfinder.service.RankingCatalogService catalog;

    private final com.indiaschoolfinder.service.BestPlacesService bestPlaces;

    public ExternalRankingController(ExternalRankingService service, com.indiaschoolfinder.service.RankingCatalogService catalog,
                                     com.indiaschoolfinder.service.BestPlacesService bestPlaces) {
        this.service = service;
        this.catalog = catalog;
        this.bestPlaces = bestPlaces;
    }

    @Operation(summary = "States and cities with ranked or listed schools, for the \"best schools in\" pages")
    @GetMapping("/best")
    public List<com.indiaschoolfinder.service.BestPlacesService.Related> bestPlaces() {
        return bestPlaces.all();
    }

    @Operation(summary = "One state or city: schools ranked and listed there, the latest ranking, and related places")
    @GetMapping("/best/{slug}")
    public com.indiaschoolfinder.service.BestPlacesService.Place bestPlace(@PathVariable @Pattern(regexp = "[a-z0-9-]{1,80}") String slug) {
        return bestPlaces.place(slug);
    }

    @Operation(summary = "Published lists with entries to show, with their sources and evaluation parameters")
    @GetMapping("/editions")
    public List<RankingCatalogDtos.Edition> editions() {
        return catalog.editions();
    }

    @Operation(summary = "Which ranking pages have verified data behind them")
    @GetMapping("/sections")
    public RankingCatalogDtos.Sections sections() {
        return catalog.sections();
    }

    @Operation(summary = "One published list, filtered without renumbering; every rank shown is the publisher's own")
    @GetMapping("/table")
    public PageResponse<RankingCatalogDtos.Row> table(@RequestParam long edition,
                                                      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{2}") String state,
                                                      @RequestParam(required = false) @Size(max = 120) String district,
                                                      @RequestParam(required = false) @Size(max = 120) String city,
                                                      @RequestParam(required = false) @Size(max = 20) String board,
                                                      @RequestParam(required = false) @Pattern(regexp = "GOVERNMENT|PRIVATE|AIDED|INTERNATIONAL") String schoolType,
                                                      @RequestParam(required = false) @Pattern(regexp = "BOYS|GIRLS|CO_ED") String gender,
                                                      @RequestParam(required = false) @Pattern(regexp = "DAY|BOARDING|DAY_CUM_BOARDING") String residence,
                                                      @RequestParam(required = false) @Pattern(regexp = "GREEN|YELLOW|ORANGE|RED") String rating,
                                                      @RequestParam(required = false) @Size(max = 100) String q,
                                                      @RequestParam(required = false) @Min(1) Integer maxRank,
                                                      @RequestParam(required = false) @Pattern(regexp = "CENTRAL|STATE|KV|JNV|SAINIK|OTHER") String government,
                                                      @RequestParam(required = false) @Pattern(regexp = "ANY|BOYS|GIRLS|CO_ED|DAY_CUM_BOARDING|OTHER") String boarding,
                                                      @RequestParam(required = false) @Pattern(regexp = "RANK|NAME|STATE|CITY") String sort,
                                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                                      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return catalog.table(new RankingCatalogDtos.Query(edition, state, district, city, board, schoolType, gender, residence, rating,
                q == null || q.isBlank() ? null : q, maxRank, government, boarding), page, size, sort);
    }

    @Operation(summary = "States, cities, districts, boards and school groups that have entries in a published list")
    @GetMapping("/places")
    public RankingCatalogDtos.Places places(@RequestParam long edition) {
        return catalog.places(edition);
    }

    @Operation(summary = "Publishers of school rankings, surveys, awards and green-school ratings")
    @GetMapping("/publishers")
    public List<RankingPublisherDto> publishers() {
        return service.publishers(false);
    }

    @Operation(summary = "Verified entries from published rankings, grouped by list and in each list's rank order. "
            + "Sponsored listings are never included.")
    @GetMapping("/external")
    public PageResponse<ExternalRankingListItemDto> external(@RequestParam(required = false) @Size(max = 40) String publisher,
                                                             @RequestParam(required = false) RankingPublisherKind kind,
                                                             @RequestParam(required = false) @Size(max = 20) String year,
                                                             @RequestParam(required = false) @Size(max = 200) String category,
                                                             @RequestParam(required = false) RankingScope scope,
                                                             @RequestParam(required = false) @Size(max = 100) String region,
                                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                                             @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return service.publicList(new ExternalRankingService.Filter(publisher, kind, year, category, scope, region, null,
                false, null), page, size);
    }

    @GetMapping("/external/facets")
    public ExternalRankingService.Facets facets() {
        return service.facets();
    }
}
