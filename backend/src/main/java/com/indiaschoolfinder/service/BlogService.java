package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.BlogDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.BlogPost;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.BlogPostRepository;
import com.indiaschoolfinder.util.SlugUtil;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Blog posts. The public sees published posts only; staff write, publish, unpublish and delete them. */
@Service
public class BlogService {

    private static final int WORDS_PER_MINUTE = 200;

    private final BlogPostRepository posts;
    private final AuditService audit;
    private final Clock clock;

    public BlogService(BlogPostRepository posts, AuditService audit, Clock clock) {
        this.posts = posts;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<BlogDtos.Card> list(String q, BlogPost.Category category, int page, int size) {
        Specification<BlogPost> filter = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            all.add(cb.isNotNull(root.get("publishedAt")));
            if (category != null) all.add(cb.equal(root.get("category"), category));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                all.add(cb.or(cb.like(cb.lower(root.get("title")), like, '\\'), cb.like(cb.lower(root.get("excerpt")), like, '\\')));
            }
            return cb.and(all.toArray(Predicate[]::new));
        };
        return PageResponse.of(posts.findAll(filter, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt", "id"))), BlogService::card);
    }

    @Transactional(readOnly = true)
    public BlogDtos.Article article(String slug) {
        BlogPost p = published(slug);
        List<BlogDtos.Card> related = posts.findTop3ByCategoryAndPublishedAtIsNotNullAndIdNotOrderByPublishedAtDesc(p.getCategory(), p.getId())
                .stream().map(BlogService::card).toList();
        return new BlogDtos.Article(card(p), p.getBody(), p.getAuthorBio(), p.getUpdatedAt(), related);
    }

    /** A published post, for the page's search-engine tags. */
    @Transactional(readOnly = true)
    public BlogPost published(String slug) {
        return posts.findBySlugAndPublishedAtIsNotNull(slug).orElseThrow(() -> new ResourceNotFoundException("Blog post", slug));
    }

    @Transactional(readOnly = true)
    public PageResponse<BlogDtos.AdminPost> adminList(int page, int size) {
        return PageResponse.of(posts.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size)), BlogService::admin);
    }

    @Transactional
    public BlogDtos.AdminPost create(BlogDtos.SaveRequest r) {
        BlogPost saved = save(new BlogPost(), r);
        audit.record("BLOG_POST_CREATED", "BLOG_POST", saved.getId(), saved.getSlug());
        return admin(saved);
    }

    @Transactional
    public BlogDtos.AdminPost update(long id, BlogDtos.SaveRequest r) {
        BlogPost saved = save(find(id), r);
        audit.record("BLOG_POST_UPDATED", "BLOG_POST", saved.getId(), saved.getSlug());
        return admin(saved);
    }

    @Transactional
    public void delete(long id) {
        BlogPost p = find(id);
        posts.delete(p);
        audit.record("BLOG_POST_DELETED", "BLOG_POST", id, p.getSlug());
    }

    private BlogPost find(long id) {
        return posts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Blog post", id));
    }

    private BlogPost save(BlogPost p, BlogDtos.SaveRequest r) {
        String slug = blank(r.slug()) ? SlugUtil.toSlug(r.title()) : r.slug();
        if (slug.isEmpty()) throw new BusinessValidationException("slug", "enter an address for this post");
        if (p.getId() == null ? posts.existsBySlug(slug) : posts.existsBySlugAndIdNot(slug, p.getId())) {
            throw new BusinessValidationException("slug", "another post already uses this address");
        }
        p.setSlug(slug);
        p.setTitle(r.title().strip());
        p.setExcerpt(r.excerpt().strip());
        p.setBody(r.body().strip());
        p.setCategory(r.category());
        p.setCoverImageUrl(orNull(r.coverImageUrl()));
        p.setCoverImageAlt(orNull(r.coverImageAlt()));
        p.setAuthorName(r.authorName().strip());
        p.setAuthorBio(orNull(r.authorBio()));
        p.setMetaTitle(orNull(r.metaTitle()));
        p.setMetaDescription(orNull(r.metaDescription()));
        // The first publication sets the date readers see; later edits keep it.
        if (!r.published()) p.setPublishedAt(null);
        else if (p.getPublishedAt() == null) p.setPublishedAt(Instant.now(clock));
        return posts.saveAndFlush(p);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String orNull(String s) {
        return blank(s) ? null : s.strip();
    }

    private static int minutes(String body) {
        int words = body.isBlank() ? 0 : body.strip().split("\\s+").length;
        return Math.max(1, Math.round((float) words / WORDS_PER_MINUTE));
    }

    private static BlogDtos.Card card(BlogPost p) {
        return new BlogDtos.Card(p.getSlug(), p.getTitle(), p.getExcerpt(), p.getCategory(), p.getCoverImageUrl(), p.getCoverImageAlt(),
                p.getAuthorName(), p.getPublishedAt(), minutes(p.getBody()));
    }

    private static BlogDtos.AdminPost admin(BlogPost p) {
        return new BlogDtos.AdminPost(p.getId(), p.getSlug(), p.getTitle(), p.getExcerpt(), p.getBody(), p.getCategory(), p.getCoverImageUrl(),
                p.getCoverImageAlt(), p.getAuthorName(), p.getAuthorBio(), p.getMetaTitle(), p.getMetaDescription(), p.getPublishedAt() != null,
                p.getPublishedAt(), p.getUpdatedAt());
    }
}
