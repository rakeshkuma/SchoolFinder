package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.admission.EnquiryDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.AdmissionEnquiry;
import com.indiaschoolfinder.service.EnquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: admission enquiries", description = "Parents' enquiries from school profiles (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/enquiries")
public class AdminEnquiryController {

    private final EnquiryService enquiries;

    public AdminEnquiryController(EnquiryService enquiries) {
        this.enquiries = enquiries;
    }

    @GetMapping
    public PageResponse<EnquiryDtos.EnquiryRow> list(@RequestParam(defaultValue = "NEW") AdmissionEnquiry.Status status,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return enquiries.list(status, page, size);
    }

    @Operation(summary = "Mark forwarded to the school, or closed (closing removes the parent's contact details)")
    @PostMapping("/{id}/status")
    public EnquiryDtos.EnquiryRow status(@PathVariable long id, @Valid @RequestBody EnquiryDtos.StatusChange change) {
        return enquiries.changeStatus(id, change);
    }
}
