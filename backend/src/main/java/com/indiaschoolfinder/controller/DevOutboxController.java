package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.mail.DevOutboxMailService;
import com.indiaschoolfinder.mail.MailService;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Development only (app.mail.dev-outbox=true, refused under the prod profile): shows account email that would have
 * been sent, so verification and reset links can be followed locally without an SMTP server.
 */
@Hidden
@RestController
@RequestMapping("/api/v1/dev/outbox")
@ConditionalOnProperty(prefix = "app.mail", name = "dev-outbox", havingValue = "true")
public class DevOutboxController {

    private final MailService mail;

    public DevOutboxController(MailService mail) {
        this.mail = mail;
    }

    @GetMapping
    public List<DevOutboxMailService.Message> messages() {
        return mail instanceof DevOutboxMailService outbox ? outbox.messages() : List.of();
    }

    @DeleteMapping
    public void clear() {
        if (mail instanceof DevOutboxMailService outbox) {
            outbox.clear();
        }
    }
}
