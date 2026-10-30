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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Published rankings", description = "Rankings published by others, checked against the publisher's page")
@RestController
@RequestMapping("/api/v1/rankings")
public class ExternalRankingController {

    private final ExternalRankingService service;

    public ExternalRankingController(ExternalRankingService service) {
        this.service = service;
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
