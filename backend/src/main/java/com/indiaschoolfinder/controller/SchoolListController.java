package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.common.SchoolListDtos;
import com.indiaschoolfinder.service.SchoolListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "School lists", description = "Lists of schools by place, board and kind, A to Z. These are not rankings.")
@Validated
@RestController
@RequestMapping("/api/v1/school-lists")
public class SchoolListController {

    private final SchoolListService lists;

    public SchoolListController(SchoolListService lists) {
        this.lists = lists;
    }

    @GetMapping
    public List<SchoolListDtos.Summary> lists() {
        return lists.lists();
    }

    @Operation(summary = "One list, A to Z, by school name or place")
    @GetMapping("/{key}")
    public PageResponse<SchoolListDtos.Item> items(@PathVariable String key, @RequestParam(required = false) @Size(max = 100) String q,
                                                   @RequestParam(defaultValue = "0") @Min(0) int page,
                                                   @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        return lists.items(key, q == null || q.isBlank() ? null : q, page, size);
    }
}
