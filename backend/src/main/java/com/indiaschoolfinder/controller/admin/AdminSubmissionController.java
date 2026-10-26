package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.submission.SubmissionReviewRequest;
import com.indiaschoolfinder.dto.submission.UpdateSubmissionDto;
import com.indiaschoolfinder.enums.SubmissionStatus;
import com.indiaschoolfinder.service.UpdateSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Admin: suggested updates", description = "Queue of updates suggested by schools and parents (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/update-submissions")
public class AdminSubmissionController {

    private final UpdateSubmissionService service;

    public AdminSubmissionController(UpdateSubmissionService service) {
        this.service = service;
    }

    @Operation(summary = "Submissions with the given status, oldest first")
    @GetMapping
    public PageResponse<UpdateSubmissionDto> list(@RequestParam(defaultValue = "NEW") SubmissionStatus status,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(status, page, size);
    }

    @GetMapping("/count")
    public Map<String, Long> countNew() {
        return Map.of("new", service.countNew());
    }

    @Operation(summary = "Close a submission (ACCEPTED after applying the change with the admin tools, or REJECTED); "
            + "the reply e-mail is erased")
    @PatchMapping("/{id}")
    public UpdateSubmissionDto review(@PathVariable Long id, @Valid @RequestBody SubmissionReviewRequest request) {
        return service.review(id, request);
    }
}
