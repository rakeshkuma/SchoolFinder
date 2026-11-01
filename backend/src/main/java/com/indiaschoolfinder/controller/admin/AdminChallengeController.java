package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.ChallengeDtos;
import com.indiaschoolfinder.service.ChallengeAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Admin: challenges", description = "Challenges and fair-play moderation (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin")
public class AdminChallengeController {

    private final ChallengeAdminService service;

    public AdminChallengeController(ChallengeAdminService service) {
        this.service = service;
    }

    @GetMapping("/challenges")
    public List<ChallengeDtos.AdminRow> challenges() {
        return service.list();
    }

    @PostMapping("/challenges")
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@Valid @RequestBody ChallengeDtos.SaveRequest request) {
        service.create(request);
    }

    @Operation(summary = "Change a challenge; questions, scoring and duration are fixed once a student has started")
    @PutMapping("/challenges/{id}")
    public void update(@PathVariable long id, @Valid @RequestBody ChallengeDtos.SaveRequest request) {
        service.update(id, request);
    }

    @PatchMapping("/challenges/{id}/published")
    public void publish(@PathVariable long id, @Valid @RequestBody ChallengeDtos.PublishRequest request) {
        service.publish(id, request.published());
    }

    @DeleteMapping("/challenges/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @GetMapping("/moderation/overview")
    public ChallengeDtos.Overview overview() {
        return service.overview();
    }

    @Operation(summary = "Attempts flagged as implausibly fast, newest first")
    @GetMapping("/moderation/attempts")
    public PageResponse<ChallengeDtos.ReviewItem> queue(@RequestParam(defaultValue = "0") @Min(0) int page,
                                                        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.reviewQueue(page, size);
    }

    @Operation(summary = "Clear a flagged attempt, or void any attempt; the note goes to the audit log")
    @PatchMapping("/moderation/attempts/{id}")
    public void decide(@PathVariable long id, @Valid @RequestBody ChallengeDtos.ReviewDecision decision) {
        service.decide(id, decision);
    }

    @GetMapping("/moderation/participants")
    public List<ChallengeDtos.ParticipantRow> participants(@RequestParam(required = false) @Size(max = 24) String q) {
        return service.participants(q);
    }

    @Operation(summary = "Hide a student's nickname from every list, or show it again; the note goes to the audit log")
    @PatchMapping("/moderation/participants/{publicId}")
    public void hide(@PathVariable String publicId, @Valid @RequestBody ChallengeDtos.HideRequest request) {
        service.hide(publicId, request);
    }
}
