package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.AccountToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface AccountTokenRepository extends JpaRepository<AccountToken, Long> {

    Optional<AccountToken> findByTokenHash(String tokenHash);

    /** Retires earlier unused tokens of the same purpose, so only the newest link works. */
    @Modifying
    @Query("UPDATE AccountToken t SET t.usedAt = :now WHERE t.userId = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    int retireUnused(Long userId, AccountToken.Purpose purpose, Instant now);

    @Modifying
    @Query("DELETE FROM AccountToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(Instant cutoff);
}
