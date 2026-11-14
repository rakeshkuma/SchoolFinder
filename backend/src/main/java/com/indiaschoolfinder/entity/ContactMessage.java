package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/** A message from the contact form. Name and email are removed once it has been handled. */
@Getter
@Setter
@Entity
@Table(name = "contact_message")
@EntityListeners(AuditingEntityListener.class)
public class ContactMessage {

    public enum Topic { FEEDBACK, CORRECTION, LISTING, RANKING, TECHNICAL, CLAIM, ADVERTISING }

    public enum Status { OPEN, HANDLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Topic topic;

    @Column(length = 100)
    private String name;

    @Column(length = 254)
    private String email;

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status = Status.OPEN;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant handledAt;

    @Column(length = 100)
    private String handledBy;
}
