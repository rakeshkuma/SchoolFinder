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
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Blog posts. The public sees a post only when it is PUBLISHED and its publication time has come; staff move posts
 * through draft, fact check, editorial review and approval, schedule them, and unpublish or delete them.
 */
@Service
public class BlogService {

    private static final int WORDS_PER_MINUTE = 200;
    /** Addresses the blog uses for its own pages and API (/blog/category/..., /api/v1/blog/posts/topics). */
    private static final java.util.Set<String> RESERVED_SLUGS = java.util.Set.of("topics", "categories", "category");

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
        return list(q, category, null, null, page, size);
    }

    /** Published posts, newest first, optionally of one category, carrying one topic, or featured only. */
    @Transactional(readOnly = true)
    public PageResponse<BlogDtos.Card> list(String q, BlogPost.Category category, String tag, Boolean featured, int page, int size) {
        Instant now = Instant.now(clock);
        Specification<BlogPost> filter = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            all.add(cb.equal(root.get("status"), BlogPost.Status.PUBLISHED));
            all.add(cb.lessThanOrEqualTo(root.get("publishedAt"), now));
            if (category != null) all.add(cb.equal(root.get("category"), category));
            if (Boolean.TRUE.equals(featured)) all.add(cb.isTrue(root.get("featured")));
            if (tag != null && !tag.isBlank()) {
                // Tags are stored as ", "-joined text; match a whole tag, case-insensitively.
                all.add(cb.like(cb.concat(cb.concat(", ", cb.lower(root.get("tags"))), ","),
                        "%, " + escape(tag.strip().toLowerCase(Locale.ROOT)) + ",%", '\\'));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + escape(q.strip().toLowerCase(Locale.ROOT)) + "%";
                all.add(cb.or(cb.like(cb.lower(root.get("title")), like, '\\'), cb.like(cb.lower(root.get("excerpt")), like, '\\'),
                        cb.like(cb.lower(root.get("tags")), like, '\\')));
            }
            return cb.and(all.toArray(Predicate[]::new));
        };
        return PageResponse.of(posts.findAll(filter, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishedAt", "id"))), BlogService::card);
    }

    @Transactional(readOnly = true)
    public BlogDtos.Article article(String slug) {
        BlogPost p = published(slug);
        List<BlogPost> visible = posts.findVisible(Instant.now(clock));
        int at = indexOf(visible, p.getId());
        // Newest first: the next (newer) article is before it, the previous (older) one after it.
        BlogDtos.Card newer = at > 0 ? card(visible.get(at - 1)) : null;
        BlogDtos.Card older = at >= 0 && at < visible.size() - 1 ? card(visible.get(at + 1)) : null;
        return new BlogDtos.Article(card(p), p.getBody(), p.getAuthorBio(), p.getUpdatedAt(), related(p, visible),
                p.getSources().stream().map(s -> new BlogDtos.Source(s.getTitle(), s.getUrl(), s.getCheckedOn())).toList(),
                p.getFaqs().stream().map(f -> new BlogDtos.Faq(f.getQuestion(), f.getAnswer())).toList(), older, newer);
    }

    /** Up to three: same category first, then shared topics, newest first. */
    private static List<BlogDtos.Card> related(BlogPost p, List<BlogPost> visible) {
        List<String> mine = tagsOf(p);
        return visible.stream().filter(o -> !o.getId().equals(p.getId()))
                .sorted(Comparator.comparingInt((BlogPost o) -> -((o.getCategory() == p.getCategory() ? 10 : 0)
                        + (int) tagsOf(o).stream().filter(mine::contains).count())))
                .filter(o -> o.getCategory() == p.getCategory() || tagsOf(o).stream().anyMatch(mine::contains))
                .limit(3).map(BlogService::card).toList();
    }

    private static int indexOf(List<BlogPost> list, Long id) {
        for (int i = 0; i < list.size(); i++) if (list.get(i).getId().equals(id)) return i;
        return -1;
    }

    /** Topics of published articles, most used first (no view counts are kept, so these are not "trending"). */
    @Transactional(readOnly = true)
    public List<BlogDtos.Topic> topics(int limit) {
        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, String> display = new LinkedHashMap<>();
        for (BlogPost p : posts.findVisible(Instant.now(clock))) {
            for (String t : tagsOf(p)) {
                String key = t.toLowerCase(Locale.ROOT);
                counts.merge(key, 1L, Long::sum);
                display.putIfAbsent(key, t);
            }
        }
        return counts.entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit).map(e -> new BlogDtos.Topic(display.get(e.getKey()), e.getValue())).toList();
    }

    /** Published articles per category, for category sections and pages (a category with none has no page). */
    @Transactional(readOnly = true)
    public Map<BlogPost.Category, Long> categoryCounts() {
        Map<BlogPost.Category, Long> out = new LinkedHashMap<>();
        posts.findVisible(Instant.now(clock)).forEach(p -> out.merge(p.getCategory(), 1L, Long::sum));
        return out;
    }

    /** Published posts, newest first (the sitemap). */
    @Transactional(readOnly = true)
    public List<BlogPost> visible() {
        return posts.findVisible(Instant.now(clock));
    }

    /** A published post, for the page's search-engine tags. */
    @Transactional(readOnly = true)
    public BlogPost published(String slug) {
        BlogPost p = posts.findVisibleBySlug(slug, Instant.now(clock)).orElseThrow(() -> new ResourceNotFoundException("Blog post", slug));
        p.getSources().size();
        p.getFaqs().size();
        return p;
    }

    @Transactional(readOnly = true)
    public PageResponse<BlogDtos.AdminPost> adminList(int page, int size) {
        return PageResponse.of(posts.findAllByOrderByUpdatedAtDesc(PageRequest.of(page, size)), BlogService::admin);
    }

    @Transactional
    public BlogDtos.AdminPost create(BlogDtos.SaveRequest r) {
        BlogPost saved = save(new BlogPost(), r);
        audit.record("BLOG_POST_CREATED", "BLOG_POST", saved.getId(), saved.getSlug() + " " + saved.getStatus());
        return admin(saved);
    }

    @Transactional
    public BlogDtos.AdminPost update(long id, BlogDtos.SaveRequest r) {
        BlogPost p = find(id);
        BlogPost.Status before = p.getStatus();
        BlogPost saved = save(p, r);
        audit.record(before == saved.getStatus() ? "BLOG_POST_UPDATED" : "BLOG_POST_STATUS_CHANGED", "BLOG_POST", saved.getId(),
                saved.getSlug() + " " + before + " -> " + saved.getStatus());
        return admin(saved);
    }

    @Transactional
    public void delete(long id) {
        BlogPost p = find(id);
        // A live article must be unpublished first, so a published page cannot vanish with one click.
        if (p.getStatus() == BlogPost.Status.PUBLISHED) {
            throw new BusinessValidationException("status", "unpublish the article before deleting it");
        }
        posts.delete(p);
        audit.record("BLOG_POST_DELETED", "BLOG_POST", id, p.getSlug());
    }

    private BlogPost find(long id) {
        return posts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Blog post", id));
    }

    private BlogPost save(BlogPost p, BlogDtos.SaveRequest r) {
        String slug = blank(r.slug()) ? SlugUtil.toSlug(r.title()) : r.slug();
        if (slug.isEmpty()) throw new BusinessValidationException("slug", "enter an address for this post");
        if (RESERVED_SLUGS.contains(slug)) throw new BusinessValidationException("slug", "this address is used by the blog itself; choose another");
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
        if (r.featured() != null) p.setFeatured(r.featured());
        if (r.sponsored() != null) p.setSponsored(r.sponsored());
        if (r.tags() != null) {
            List<String> tags = r.tags().stream().map(String::strip).filter(t -> !t.isEmpty()).distinct().toList();
            String joined = String.join(", ", tags);
            if (joined.length() > 300) throw new BusinessValidationException("tags", "use fewer or shorter topics");
            p.setTags(joined.isEmpty() ? null : joined);
        }
        p.setLastReviewedOn(r.lastReviewedOn());
        if (r.sources() != null) {
            p.getSources().clear();
            r.sources().forEach(s -> {
                BlogPost.Source src = new BlogPost.Source();
                src.setTitle(s.title().strip());
                src.setUrl(s.url().strip());
                src.setCheckedOn(s.checkedOn());
                p.getSources().add(src);
            });
        }
        if (r.faqs() != null) {
            p.getFaqs().clear();
            r.faqs().forEach(f -> {
                BlogPost.Faq faq = new BlogPost.Faq();
                faq.setQuestion(f.question().strip());
                faq.setAnswer(f.answer().strip());
                p.getFaqs().add(faq);
            });
        }
        BlogPost.Status status = r.status() != null ? r.status() : r.published() ? BlogPost.Status.PUBLISHED : BlogPost.Status.DRAFT;
        if (status == BlogPost.Status.PUBLISHED && p.getSources().isEmpty() && r.status() != null) {
            // The editorial standard: a published article cites what it relies on.
            throw new BusinessValidationException("sources", "add at least one source before publishing");
        }
        p.setStatus(status);
        if (status != BlogPost.Status.PUBLISHED) {
            p.setPublishedAt(null);
        } else if (r.publishAt() != null) {
            p.setPublishedAt(r.publishAt()); // a future time schedules it
        } else if (p.getPublishedAt() == null) {
            // The first publication sets the date readers see; later edits keep it.
            p.setPublishedAt(Instant.now(clock));
        }
        return posts.saveAndFlush(p);
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static List<String> tagsOf(BlogPost p) {
        return p.getTags() == null ? List.of() : Arrays.stream(p.getTags().split(",")).map(String::strip).filter(t -> !t.isEmpty()).toList();
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
                p.getAuthorName(), p.getPublishedAt(), minutes(p.getBody()), tagsOf(p), p.isFeatured(), p.isSponsored(), p.getLastReviewedOn());
    }

    private static BlogDtos.AdminPost admin(BlogPost p) {
        return new BlogDtos.AdminPost(p.getId(), p.getSlug(), p.getTitle(), p.getExcerpt(), p.getBody(), p.getCategory(), p.getCoverImageUrl(),
                p.getCoverImageAlt(), p.getAuthorName(), p.getAuthorBio(), p.getMetaTitle(), p.getMetaDescription(),
                p.getStatus() == BlogPost.Status.PUBLISHED, p.getPublishedAt(), p.getUpdatedAt(), p.getStatus(), p.isFeatured(), p.isSponsored(),
                tagsOf(p), p.getLastReviewedOn(),
                p.getSources().stream().map(s -> new BlogDtos.Source(s.getTitle(), s.getUrl(), s.getCheckedOn())).toList(),
                p.getFaqs().stream().map(f -> new BlogDtos.Faq(f.getQuestion(), f.getAnswer())).toList());
    }
}
