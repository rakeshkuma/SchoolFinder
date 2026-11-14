package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

    Optional<Participant> findByAccountId(Long accountId);

    Optional<Participant> findByGuestTokenHash(String guestTokenHash);

    Optional<Participant> findByPublicId(String publicId);

    boolean existsByPublicId(String publicId);
}
