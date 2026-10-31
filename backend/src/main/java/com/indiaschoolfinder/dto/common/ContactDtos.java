package com.indiaschoolfinder.dto.common;

import com.indiaschoolfinder.entity.ContactMessage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class ContactDtos {

    private ContactDtos() {
    }

    /** {@code website} is a honeypot that people never see or fill. */
    public record ContactRequest(
            @NotNull ContactMessage.Topic topic,
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 3, max = 150) String subject,
            @NotBlank @Size(min = 10, max = 4000) String message,
            @Size(max = 200) String website) {
    }

    /** A message as staff see it; name and email are null once it has been handled. */
    public record ContactRow(long id, ContactMessage.Topic topic, String name, String email, String subject, String message,
                             ContactMessage.Status status, Instant createdAt, Instant handledAt, String handledBy) {
    }
}
