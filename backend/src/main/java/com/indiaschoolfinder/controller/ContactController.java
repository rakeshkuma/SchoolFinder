package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.ContactDtos;
import com.indiaschoolfinder.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Contact")
@RestController
@RequestMapping("/api/v1/contact")
public class ContactController {

    private final ContactService contact;

    public ContactController(ContactService contact) {
        this.contact = contact;
    }

    @Operation(summary = "Send a message to the site's staff; 202 means it has been saved")
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void send(@Valid @RequestBody ContactDtos.ContactRequest request) {
        contact.submit(request);
    }
}
