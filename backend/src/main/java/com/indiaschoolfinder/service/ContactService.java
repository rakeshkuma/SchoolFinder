package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.common.ContactDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.ContactMessage;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.repository.ContactMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * The contact form. A message is saved first, so the visitor is told it arrived only when it has; an email to the site's
 * inbox is a convenience that may fail or not be configured. The sender's details are removed once it has been handled.
 */
@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    private final ContactMessageRepository messages;
    private final MailService mail;
    private final AuditService audit;
    private final AppProperties properties;
    private final Clock clock;

    public ContactService(ContactMessageRepository messages, MailService mail, AuditService audit, AppProperties properties, Clock clock) {
        this.messages = messages;
        this.mail = mail;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    /** A filled honeypot is accepted silently and discarded. */
    public void submit(ContactDtos.ContactRequest r) {
        if (r.website() != null && !r.website().isBlank()) {
            log.info("Discarded a contact message (honeypot filled)");
            return;
        }
        ContactMessage m = new ContactMessage();
        m.setTopic(r.topic());
        m.setName(r.name().strip());
        m.setEmail(r.email().strip());
        m.setSubject(r.subject().strip());
        m.setMessage(r.message().strip());
        m = messages.save(m);
        notifyInbox(m);
    }

    private void notifyInbox(ContactMessage m) {
        String inbox = properties.getContactInbox();
        if (inbox == null || inbox.isBlank() || !mail.deliveryConfigured()) return;
        try {
            mail.send(inbox, "[SchoolDhundo] " + m.getTopic() + ": " + m.getSubject().replaceAll("[\\r\\n]+", " "),
                    "From: " + m.getName() + " <" + m.getEmail() + ">\n\n" + m.getMessage());
        } catch (RuntimeException e) {
            log.warn("Could not email contact message {}; it is saved for staff", m.getId());
        }
    }

    public PageResponse<ContactDtos.ContactRow> list(ContactMessage.Status status, int page, int size) {
        Page<ContactMessage> p = messages.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size));
        return PageResponse.of(p, ContactService::row);
    }

    @Transactional
    public ContactDtos.ContactRow handle(long id) {
        ContactMessage m = messages.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contact message", id));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        m.setStatus(ContactMessage.Status.HANDLED);
        m.setHandledAt(Instant.now(clock));
        m.setHandledBy(auth == null ? "system" : auth.getName());
        m.setName(null);
        m.setEmail(null);
        audit.record("CONTACT_MESSAGE_HANDLED", "CONTACT_MESSAGE", id, null);
        return row(m);
    }

    private static ContactDtos.ContactRow row(ContactMessage m) {
        return new ContactDtos.ContactRow(m.getId(), m.getTopic(), m.getName(), m.getEmail(), m.getSubject(), m.getMessage(), m.getStatus(),
                m.getCreatedAt(), m.getHandledAt(), m.getHandledBy());
    }
}
