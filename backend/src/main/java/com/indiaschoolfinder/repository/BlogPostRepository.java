package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** "Visible" means what the public may see: status PUBLISHED and a publication time that has passed. */
public interface BlogPostRepository extends JpaRepository<BlogPost, Long>, JpaSpecificationExecutor<BlogPost> {

    String VISIBLE = "p.status = com.indiaschoolfinder.entity.BlogPost.Status.PUBLISHED AND p.publishedAt <= :now";

    @Query("SELECT p FROM BlogPost p WHERE p.slug = :slug AND " + VISIBLE)
    Optional<BlogPost> findVisibleBySlug(@Param("slug") String slug, @Param("now") Instant now);

    @Query("SELECT p FROM BlogPost p WHERE " + VISIBLE + " ORDER BY p.publishedAt DESC, p.id DESC")
    List<BlogPost> findVisible(@Param("now") Instant now);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Page<BlogPost> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
