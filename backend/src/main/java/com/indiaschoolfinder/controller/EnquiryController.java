package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.admission.EnquiryDtos;
import com.indiaschoolfinder.service.EnquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admission enquiries")
@RestController
public class EnquiryController {

    private final EnquiryService enquiries;

    public EnquiryController(EnquiryService enquiries) {
        this.enquiries = enquiries;
    }

    @Operation(summary = "Send an admission enquiry about a school (parent's consent required; rate limited); 202 means it has been saved")
    @PostMapping("/api/v1/schools/{id}/enquiries")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void send(@PathVariable long id, @Valid @RequestBody EnquiryDtos.EnquiryRequest request) {
        enquiries.submit(id, request);
    }
}
