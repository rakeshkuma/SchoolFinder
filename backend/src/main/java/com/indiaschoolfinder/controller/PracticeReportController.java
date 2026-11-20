package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.practice.QuestionReportRequest;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.service.PracticeAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Practice", description = "Report a problem in a practice question")
@Validated
@RestController
public class PracticeReportController {

    private final PracticeAdminService service;

    public PracticeReportController(PracticeAdminService service) {
        this.service = service;
    }

    @Operation(summary = "Report a problem in a practice question (no sign-in needed); reviewed by editors")
    @PostMapping("/api/v1/practice-questions/{setSlug}/{questionId}/reports")
    public ResponseEntity<Void> report(@PathVariable @Pattern(regexp = "[a-z0-9-]{1,80}") String setSlug,
                                       @PathVariable @Pattern(regexp = "[a-z0-9-]{1,80}") String questionId,
                                       @Valid @RequestBody QuestionReportRequest request,
                                       @AuthenticationPrincipal MemberPrincipal member) {
        service.report(setSlug, questionId, request, member == null ? null : member.accountId());
        return ResponseEntity.accepted().build();
    }
}
