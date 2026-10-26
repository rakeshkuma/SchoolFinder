package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RankingSourceRepository extends JpaRepository<RankingSource, Long> {

    List<RankingSource> findBySchoolIdOrderByRankingYearDesc(Long schoolId);
}
