package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingEdition;
import com.indiaschoolfinder.enums.RankingScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RankingEditionRepository extends JpaRepository<RankingEdition, Long> {

    @Query("""
            select e from RankingEdition e where e.publisherId = :publisherId and lower(e.name) = lower(:name)
            and e.rankingYear = :year and lower(coalesce(e.categoryLabel, '')) = lower(:category) and e.scope = :scope
            and lower(coalesce(e.region, '')) = lower(:region)""")
    Optional<RankingEdition> findEdition(@Param("publisherId") Long publisherId, @Param("name") String name, @Param("year") String year,
                                         @Param("category") String category, @Param("scope") RankingScope scope, @Param("region") String region);
}
