package com.indiaschoolfinder.dto.common;

import com.indiaschoolfinder.entity.BlogPost;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/** Blog posts: cards for the list, the full article, and what staff send and see. */
public final class BlogDtos {

    private BlogDtos() {
    }

    public record Card(String slug, String title, String excerpt, BlogPost.Category category, String coverImageUrl, String coverImageAlt,
                       String authorName, Instant publishedAt, int minutesToRead) {
    }

    public record Article(Card card, String body, String authorBio, Instant updatedAt, List<Card> related) {
    }

    public record AdminPost(long id, String slug, String title, String excerpt, String body, BlogPost.Category category, String coverImageUrl,
                            String coverImageAlt, String authorName, String authorBio, String metaTitle, String metaDescription,
                            boolean published, Instant publishedAt, Instant updatedAt) {
    }

    /** A blank slug is made from the title. A cover image must be an https address or a path on this site. */
    public record SaveRequest(@NotBlank @Size(max = 160) String title,
                              @Size(max = 160) @Pattern(regexp = "|[a-z0-9]+(-[a-z0-9]+)*", message = "use lower-case letters, numbers and hyphens") String slug,
                              @NotBlank @Size(max = 300) String excerpt,
                              @NotBlank @Size(max = 100000) String body,
                              @NotNull BlogPost.Category category,
                              @Size(max = 500) @Pattern(regexp = "|https://\\S+|/\\S*", message = "use an https address") String coverImageUrl,
                              @Size(max = 200) String coverImageAlt,
                              @NotBlank @Size(max = 100) String authorName,
                              @Size(max = 400) String authorBio,
                              @Size(max = 70) String metaTitle,
                              @Size(max = 170) String metaDescription,
                              boolean published) {
    }
}
