package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.PracticeAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PracticeAttemptRepository extends JpaRepository<PracticeAttempt, Long> {

    Optional<PracticeAttempt> findByAccountIdAndClientId(Long accountId, UUID clientId);

    /** Only ever looked up together with the owner, so one member can never read another's attempt. */
    Optional<PracticeAttempt> findByIdAndAccountId(Long id, Long accountId);

    /** The member's attempts they may see now: not those whose challenge has yet to release its results. */
    @Query("""
            SELECT a FROM PracticeAttempt a WHERE a.accountId = :accountId
            AND (a.resultsHiddenUntil IS NULL OR a.resultsHiddenUntil <= :now) ORDER BY a.createdAt DESC, a.id DESC""")
    Page<PracticeAttempt> findVisible(@Param("accountId") Long accountId, @Param("now") java.time.Instant now, Pageable pageable);

    List<PracticeAttempt> findTop200ByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);

    Optional<PracticeAttempt> findByParticipantIdAndClientId(Long participantId, UUID clientId);

    /** As {@link #findByIdAndAccountId}, for a guest: only ever looked up together with the owner. */
    Optional<PracticeAttempt> findByIdAndParticipantId(Long id, Long participantId);

    List<PracticeAttempt> findTop200ByParticipantIdOrderByCreatedAtDescIdDesc(Long participantId);

    boolean existsByParticipantIdAndDailyDate(Long participantId, java.time.LocalDate dailyDate);

    /** A member's attempts saved before they had a participant, oldest first, to be counted when one is created. */
    List<PracticeAttempt> findByAccountIdAndParticipantIdIsNullOrderByCreatedAtAscIdAsc(Long accountId);

    List<PracticeAttempt> findByParticipantIdOrderByCreatedAtAscIdAsc(Long participantId);
}
