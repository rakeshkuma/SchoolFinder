package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingImportJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RankingImportJobRepository extends JpaRepository<RankingImportJob, Long> {

    Page<RankingImportJob> findAllByOrderByImportedAtDesc(Pageable pageable);
}
