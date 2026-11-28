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

    /** The same for one category, with each set's level last (slug, title, kind, minutes, last update, level). */
    @Query("select p.slug, p.title, p.kind, p.durationMinutes, p.updatedAt, p.level from PracticeSet p where p.published = true"
            + " and p.category = :category order by p.displayOrder, p.title")
    List<Object[]> findPublishedOutlineByCategory(@Param("category") PracticeSet.Category category);

    /**
     * Every published set with what groups it (slug, title, kind, minutes, exam or null, category, level), in display
     * order: for the practice centre's server-rendered list, without loading any questions.
     */
    @Query("select p.slug, p.title, p.kind, p.durationMinutes, p.examSlug, p.category, p.level from PracticeSet p"
            + " where p.published = true order by p.displayOrder, p.title")
    List<Object[]> findPublishedCatalogue();
}
