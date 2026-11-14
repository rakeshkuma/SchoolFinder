package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.PracticeSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PracticeSetRepository extends JpaRepository<PracticeSet, Long> {

    Optional<PracticeSet> findBySlug(String slug);

    Optional<PracticeSet> findBySlugAndPublishedTrue(String slug);

    List<PracticeSet> findByPublishedTrueOrderByDisplayOrderAscTitleAsc();

    /** Published sets without their questions (slug, title, kind, minutes, last update): for links and the sitemap. */
    @Query("select p.slug, p.title, p.kind, p.durationMinutes, p.updatedAt from PracticeSet p where p.published = true"
            + " order by p.displayOrder, p.title")
    List<Object[]> findPublishedOutline();

    /** The same for one exam. */
    @Query("select p.slug, p.title, p.kind, p.durationMinutes, p.updatedAt from PracticeSet p where p.published = true"
            + " and p.examSlug = :exam order by p.displayOrder, p.title")
    List<Object[]> findPublishedOutlineByExam(@Param("exam") String exam);
}
