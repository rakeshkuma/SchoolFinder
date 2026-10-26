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
 * A member account (parent or visitor). Staff use {@link AdminUser}. The password is a BCrypt hash and never leaves
 * the server; the email is stored lower-case and must be verified before the account can sign in.
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

    /** Null for members who signed up with Google and have not set a password. */
    @Column(length = 100)
    private String passwordHash;

    /** OpenID Connect subject of the linked Google account, if any. */
    @Column(length = 255)
    private String googleSubject;

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
    private int failedLoginCount;

    private Instant lockedUntil;

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
