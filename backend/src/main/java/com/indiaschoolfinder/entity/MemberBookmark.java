package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/** A practice question a member bookmarked, by its bank id ("set-slug/question-id"), synced across their devices. */
@Getter
@Setter
@Entity
@Table(name = "member_bookmark")
@EntityListeners(AuditingEntityListener.class)
public class MemberBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long accountId;

    @Column(nullable = false, length = 170)
    private String questionId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
