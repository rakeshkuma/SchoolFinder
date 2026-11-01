package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingPublisher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RankingPublisherRepository extends JpaRepository<RankingPublisher, Long> {

    Optional<RankingPublisher> findByCodeIgnoreCase(String code);

    Optional<RankingPublisher> findByNameIgnoreCase(String name);

    List<RankingPublisher> findAllByOrderByNameAsc();
}
