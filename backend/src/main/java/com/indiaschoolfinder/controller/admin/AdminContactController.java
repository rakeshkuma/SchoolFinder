package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.ContactDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.ContactMessage;
import com.indiaschoolfinder.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: contact messages", description = "Messages from the contact form (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/contact-messages")
public class AdminContactController {

    private final ContactService contact;

    public AdminContactController(ContactService contact) {
        this.contact = contact;
    }

    @GetMapping
    public PageResponse<ContactDtos.ContactRow> list(@RequestParam(defaultValue = "OPEN") ContactMessage.Status status,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return contact.list(status, page, size);
    }

    @Operation(summary = "Mark a message handled; the sender's name and email are removed")
    @PostMapping("/{id}/handled")
    public ContactDtos.ContactRow handled(@PathVariable long id) {
        return contact.handle(id);
    }
}
