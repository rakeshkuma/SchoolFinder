package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChallengeRepository extends JpaRepository<Challenge, Long> {

    Optional<Challenge> findBySlugAndPublishedTrue(String slug);

    boolean existsBySlug(String slug);

    List<Challenge> findByPublishedTrueOrderByStartsAtDesc();

    List<Challenge> findAllByOrderByStartsAtDesc();
}
