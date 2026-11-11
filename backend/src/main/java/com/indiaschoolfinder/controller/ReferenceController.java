package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.reference.DataSourceDto;
import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.dto.reference.SiteStatsDto;
import com.indiaschoolfinder.service.ProfileScoreService;
import com.indiaschoolfinder.service.ReferenceDataService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@Tag(name = "Reference data", description = "Boards, class levels, localities, data sources and site statistics")
@RestController
@RequestMapping("/api/v1")
public class ReferenceController {

    /** Reference lists change rarely and are fetched on every page load, so browsers may keep them briefly. */
    public static final CacheControl REFERENCE_CACHE = CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();

    private final ReferenceDataService referenceData;

    public ReferenceController(ReferenceDataService referenceData) {
        this.referenceData = referenceData;
    }

    @GetMapping("/boards")
    public ResponseEntity<List<EducationBoardDto>> boards() {
        return ResponseEntity.ok().cacheControl(REFERENCE_CACHE).body(referenceData.boards());
    }

    @GetMapping("/classes")
    public ResponseEntity<List<SchoolClassDto>> classes() {
        return ResponseEntity.ok().cacheControl(REFERENCE_CACHE).body(referenceData.classes());
    }

    @GetMapping("/localities")
    public List<String> localities() {
        return referenceData.localities();
    }

    @GetMapping("/data-sources")
    public List<DataSourceDto> dataSources() {
        return referenceData.dataSources();
    }

    @GetMapping("/stats")
    public ResponseEntity<SiteStatsDto> stats() {
        return ResponseEntity.ok().cacheControl(REFERENCE_CACHE).body(referenceData.stats());
    }

    /** How the directory's default "recommended" order is computed (documentation, not a quality ranking). */
    @GetMapping("/directory/order-rules")
    public ResponseEntity<List<ProfileScoreService.Rule>> orderRules() {
        return ResponseEntity.ok().cacheControl(REFERENCE_CACHE).body(ProfileScoreService.RULES);
    }
}
