package com.indiaschoolfinder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * A member account (parent or visitor). Staff use {@link AdminUser}. Members sign in with Google; the email is stored
 * lower-case.
 */
@Getter
@Setter
@Entity
@Table(name = "user_account")
@EntityListeners(AuditingEntityListener.class)
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 80)
    private String displayName;

    /** A BCrypt hash left from email sign-up, cleared at the first Google sign-in; nothing reads it any more. */
    @Column(length = 100)
    private String passwordHash;

    /** Optional; ten digits, used for nothing without a new, explicit purpose. */
    @Column(length = 10)
    private String mobile;

    /** OpenID Connect subject of the linked Google account, if any. */
    @Column(length = 255)
    private String googleSubject;

    /** Google profile photo address (googleusercontent.com only); null for accounts without Google sign-in. */
    @Column(length = 500)
    private String pictureUrl;

    @Column(nullable = false, length = 20)
    private String role = "USER";

    private Instant emailVerifiedAt;

    @Column(length = 2)
    private String stateCode;

    @Column(length = 80)
    private String city;

    @Column(nullable = false)
    private Instant termsAcceptedAt;

    @Column(nullable = false, length = 20)
    private String termsVersion;


    @Column(nullable = false)
    private Instant passwordChangedAt;

    private Instant lastLoginAt;

    @Version
    private long version;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    public boolean isVerified() {
        return emailVerifiedAt != null;
    }
}
