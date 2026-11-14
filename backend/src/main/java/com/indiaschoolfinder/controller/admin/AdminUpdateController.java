package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.service.SiteUpdateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: updates", description = "Editorial updates for the home page and updates page (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/updates")
public class AdminUpdateController {

    private final SiteUpdateService updates;

    public AdminUpdateController(SiteUpdateService updates) {
        this.updates = updates;
    }

    @GetMapping
    public PageResponse<UpdateDtos.AdminRow> list(@RequestParam(defaultValue = "PUBLISHED") SiteUpdate.Status status,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return updates.list(status, page, size);
    }

    @Operation(summary = "Draft an update (not shown until published); an official source is required except for practice")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UpdateDtos.AdminRow create(@Valid @RequestBody UpdateDtos.UpdateRequest request) {
        return updates.create(request);
    }

    @PutMapping("/{id}")
    public UpdateDtos.AdminRow update(@PathVariable long id, @Valid @RequestBody UpdateDtos.UpdateRequest request) {
        return updates.update(id, request);
    }

    @PostMapping("/{id}/publish")
    public UpdateDtos.AdminRow publish(@PathVariable long id) {
        return updates.setStatus(id, SiteUpdate.Status.PUBLISHED);
    }

    @Operation(summary = "Take an update off the site (it can be published again)")
    @PostMapping("/{id}/archive")
    public UpdateDtos.AdminRow archive(@PathVariable long id) {
        return updates.setStatus(id, SiteUpdate.Status.ARCHIVED);
    }
}
