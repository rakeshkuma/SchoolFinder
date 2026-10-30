package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.PracticeAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PracticeAttemptRepository extends JpaRepository<PracticeAttempt, Long> {

    Optional<PracticeAttempt> findByAccountIdAndClientId(Long accountId, UUID clientId);

    /** Only ever looked up together with the owner, so one member can never read another's attempt. */
    Optional<PracticeAttempt> findByIdAndAccountId(Long id, Long accountId);

    Page<PracticeAttempt> findByAccountIdOrderByCreatedAtDescIdDesc(Long accountId, Pageable pageable);

    List<PracticeAttempt> findTop200ByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);
}
