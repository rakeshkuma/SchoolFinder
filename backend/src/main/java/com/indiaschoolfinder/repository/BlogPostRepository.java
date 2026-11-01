package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long>, JpaSpecificationExecutor<BlogPost> {

    Optional<BlogPost> findBySlugAndPublishedAtIsNotNull(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByPublishedAtIsNotNull();

    List<BlogPost> findTop3ByCategoryAndPublishedAtIsNotNullAndIdNotOrderByPublishedAtDesc(BlogPost.Category category, Long id);

    List<BlogPost> findByPublishedAtIsNotNullOrderByPublishedAtDesc();

    Page<BlogPost> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
