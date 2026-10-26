package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.reference.DataSourceDto;
import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.dto.reference.SiteStatsDto;
import com.indiaschoolfinder.service.ProfileScoreService;
import com.indiaschoolfinder.service.ReferenceDataService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Reference data", description = "Boards, class levels, localities, data sources and site statistics")
@RestController
@RequestMapping("/api/v1")
public class ReferenceController {

    private final ReferenceDataService referenceData;

    public ReferenceController(ReferenceDataService referenceData) {
        this.referenceData = referenceData;
    }

    @GetMapping("/boards")
    public List<EducationBoardDto> boards() {
        return referenceData.boards();
    }

    @GetMapping("/classes")
    public List<SchoolClassDto> classes() {
        return referenceData.classes();
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
    public SiteStatsDto stats() {
        return referenceData.stats();
    }

    /** How the directory's default "recommended" order is computed (documentation, not a quality ranking). */
    @GetMapping("/directory/order-rules")
    public List<ProfileScoreService.Rule> orderRules() {
        return ProfileScoreService.RULES;
    }
}
