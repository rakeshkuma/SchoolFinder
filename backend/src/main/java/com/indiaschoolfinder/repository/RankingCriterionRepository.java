package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingCriterion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RankingCriterionRepository extends JpaRepository<RankingCriterion, Long> {

    List<RankingCriterion> findAllByOrderByDisplayOrderAsc();

    List<RankingCriterion> findByActiveTrueOrderByDisplayOrderAsc();

    Optional<RankingCriterion> findByCode(String code);
}
