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

/** An exam a member saved, synced across their devices. */
@Getter
@Setter
@Entity
@Table(name = "member_saved_exam")
@EntityListeners(AuditingEntityListener.class)
public class MemberSavedExam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long accountId;

    @Column(nullable = false, length = 80)
    private String examSlug;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
