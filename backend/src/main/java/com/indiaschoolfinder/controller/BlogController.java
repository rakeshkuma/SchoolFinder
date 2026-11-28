package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.dto.common.BlogDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.BlogPost;
import com.indiaschoolfinder.service.BlogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Blog", description = "Published blog posts")
@Validated
@RestController
@RequestMapping("/api/v1/blog/posts")
public class BlogController {

    private final BlogService blog;

    public BlogController(BlogService blog) {
        this.blog = blog;
    }

    @Operation(summary = "Published posts, newest first, by search text, category, topic or featured")
    @GetMapping
    public PageResponse<BlogDtos.Card> list(@RequestParam(required = false) @Size(max = 100) String q,
                                            @RequestParam(required = false) BlogPost.Category category,
                                            @RequestParam(required = false) @Size(max = 40) String tag,
                                            @RequestParam(required = false) Boolean featured,
                                            @RequestParam(defaultValue = "0") @Min(0) int page,
                                            @RequestParam(defaultValue = "9") @Min(1) @Max(30) int size) {
        return blog.list(q, category, tag, featured, page, size);
    }

    @Operation(summary = "Topics of published posts, most used first")
    @GetMapping("/topics")
    public java.util.List<BlogDtos.Topic> topics(@RequestParam(defaultValue = "12") @Min(1) @Max(50) int limit) {
        return blog.topics(limit);
    }

    @Operation(summary = "Number of published posts per category (categories without posts are left out)")
    @GetMapping("/categories")
    public java.util.Map<BlogPost.Category, Long> categories() {
        return blog.categoryCounts();
    }

    @Operation(summary = "One published post, with related posts from its category")
    @GetMapping("/{slug}")
    public BlogDtos.Article article(@PathVariable String slug) {
        return blog.article(slug);
    }
}
