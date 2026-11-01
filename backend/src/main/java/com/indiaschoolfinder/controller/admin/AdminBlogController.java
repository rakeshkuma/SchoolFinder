package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.BlogDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.service.BlogService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin: blog", description = "Write and publish blog posts (ADMIN or EDITOR)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Validated
@RestController
@RequestMapping("/api/v1/admin/blog/posts")
public class AdminBlogController {

    private final BlogService blog;

    public AdminBlogController(BlogService blog) {
        this.blog = blog;
    }

    @GetMapping
    public PageResponse<BlogDtos.AdminPost> list(@RequestParam(defaultValue = "0") @Min(0) int page,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return blog.adminList(page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BlogDtos.AdminPost create(@Valid @RequestBody BlogDtos.SaveRequest request) {
        return blog.create(request);
    }

    @PutMapping("/{id}")
    public BlogDtos.AdminPost update(@PathVariable long id, @Valid @RequestBody BlogDtos.SaveRequest request) {
        return blog.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        blog.delete(id);
    }
}
