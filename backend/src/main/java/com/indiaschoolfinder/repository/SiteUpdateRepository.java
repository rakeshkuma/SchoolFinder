package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SiteUpdate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteUpdateRepository extends JpaRepository<SiteUpdate, Long> {

    List<SiteUpdate> findByStatus(SiteUpdate.Status status);

    Page<SiteUpdate> findByStatusOrderByPublishedOnDescIdDesc(SiteUpdate.Status status, Pageable pageable);
}
