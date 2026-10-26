package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.PracticeSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PracticeSetRepository extends JpaRepository<PracticeSet, Long> {

    Optional<PracticeSet> findBySlug(String slug);

    Optional<PracticeSet> findBySlugAndPublishedTrue(String slug);

    List<PracticeSet> findByPublishedTrueOrderByDisplayOrderAscTitleAsc();
}
