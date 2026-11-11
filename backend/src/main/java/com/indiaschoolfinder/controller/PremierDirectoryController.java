package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.service.PremierDirectoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * SchoolDhundo's premier and boarding school directory. Under /rankings/directory because GET /rankings is this site's
 * own score table; the directory itself is listed A to Z and is not a ranking.
 */
@Tag(name = "School directory", description = "Premier and boarding schools by category, A to Z. Published ranks are shown with their publisher.")
@Validated
@RestController
@RequestMapping("/api/v1/rankings/directory")
public class PremierDirectoryController {

    private static final String CODE = "^[A-Za-z_]{1,30}$";

    private final PremierDirectoryService directory;

    public PremierDirectoryController(PremierDirectoryService directory) {
        this.directory = directory;
    }

    @Operation(summary = "Counts for the rankings home page and the categories that hold schools")
    @GetMapping("/summary")
    public PremierDirectoryDtos.Summary summary() {
        return directory.summary();
    }

    @GetMapping("/categories")
    public List<PremierDirectoryDtos.Category> categories() {
        return directory.categories();
    }

    @Operation(summary = "Schools in the directory; filter by category, place, board, boarding, gender, section and class")
    @GetMapping
    public PageResponse<PremierDirectoryDtos.School> list(
            @RequestParam(required = false) @Pattern(regexp = "^[a-z-]{1,40}$") String category,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Pattern(regexp = "^[A-Za-z]{2}$") String state,
            @RequestParam(required = false) @Size(max = 80) String city,
            @RequestParam(required = false) @Pattern(regexp = CODE) String board,
            @RequestParam(required = false) @Pattern(regexp = CODE) String residence,
            @RequestParam(required = false) @Pattern(regexp = CODE) String gender,
            @RequestParam(required = false) @Pattern(regexp = CODE) String section,
            @RequestParam(name = "class", required = false) @Min(0) @Max(12) Integer cls,
            @RequestParam(required = false) @Pattern(regexp = "^(?i)(name|state|city|fee)$") String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        return directory.list(new PremierDirectoryDtos.Query(category, blank(q), state, blank(city), board, residence, gender, section, cls, sort), page, size);
    }

    @Operation(summary = "One category's schools (same filters as the list)")
    @GetMapping("/category/{category}")
    public PageResponse<PremierDirectoryDtos.School> category(@PathVariable @Pattern(regexp = "^[a-z-]{1,40}$") String category,
                                                              @RequestParam(required = false) @Size(max = 100) String q,
                                                              @RequestParam(required = false) @Pattern(regexp = "^[A-Za-z]{2}$") String state,
                                                              @RequestParam(defaultValue = "0") @Min(0) int page,
                                                              @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        directory.category(category);
        return directory.list(new PremierDirectoryDtos.Query(category, blank(q), state, null, null, null, null, null, null, null), page, size);
    }

    @GetMapping("/top-premier")
    public PageResponse<PremierDirectoryDtos.School> topPremier(@RequestParam(defaultValue = "0") @Min(0) int page,
                                                                @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        return directory.list(new PremierDirectoryDtos.Query("top-premier-schools", null, null, null, null, null, null, null, null, null), page, size);
    }

    @GetMapping("/boarding")
    public PageResponse<PremierDirectoryDtos.School> boarding(@RequestParam(defaultValue = "0") @Min(0) int page,
                                                              @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        return directory.list(new PremierDirectoryDtos.Query("boarding-schools", null, null, null, null, null, null, null, null, null), page, size);
    }

    @Operation(summary = "Filter choices with counts; only values some school has")
    @GetMapping("/facets")
    public PremierDirectoryDtos.Facets facets(@RequestParam(required = false) @Pattern(regexp = "^[a-z-]{1,40}$") String category) {
        return directory.facets(category);
    }

    @Operation(summary = "States with directory schools, with counts")
    @GetMapping("/states")
    public List<PremierDirectoryDtos.Facet> states() {
        return directory.facets(null).states();
    }

    @Operation(summary = "Boards with directory schools, with counts")
    @GetMapping("/boards")
    public List<PremierDirectoryDtos.Facet> boards() {
        return directory.facets(null).boards();
    }

    @Operation(summary = "A school's directory entry, published rank (if any) and categories, by school profile id")
    @GetMapping("/schools/{schoolId}")
    public PremierDirectoryDtos.SchoolEntry school(@PathVariable @Min(1) long schoolId) {
        return directory.forSchool(schoolId);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
