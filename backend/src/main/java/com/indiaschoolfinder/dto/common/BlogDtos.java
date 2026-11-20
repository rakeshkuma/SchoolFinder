package com.indiaschoolfinder.dto.common;

import com.indiaschoolfinder.entity.BlogPost;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Blog posts: cards for the list, the full article, and what staff send and see. */
public final class BlogDtos {

    private BlogDtos() {
    }

    public record Card(String slug, String title, String excerpt, BlogPost.Category category, String coverImageUrl, String coverImageAlt,
                       String authorName, Instant publishedAt, int minutesToRead, List<String> tags, boolean featured, boolean sponsored,
                       LocalDate lastReviewedOn) {
    }

    public record Source(@NotBlank @Size(max = 200) String title,
                         @NotBlank @Size(max = 500) @Pattern(regexp = "https?://\\S+", message = "use a web address") String url,
                         LocalDate checkedOn) {
    }

    public record Faq(@NotBlank @Size(max = 300) String question, @NotBlank @Size(max = 2000) String answer) {
    }

    /** The full article, with the articles just before and after it (by publication date) for reading on. */
    public record Article(Card card, String body, String authorBio, Instant updatedAt, List<Card> related, List<Source> sources,
                          List<Faq> faqs, Card previous, Card next) {
    }

    /** A topic (tag) and how many published articles carry it. */
    public record Topic(String tag, long articles) {
    }

    public record AdminPost(long id, String slug, String title, String excerpt, String body, BlogPost.Category category, String coverImageUrl,
                            String coverImageAlt, String authorName, String authorBio, String metaTitle, String metaDescription,
                            boolean published, Instant publishedAt, Instant updatedAt, BlogPost.Status status, boolean featured,
                            boolean sponsored, List<String> tags, LocalDate lastReviewedOn, List<Source> sources, List<Faq> faqs) {
    }

    /**
     * A blank slug is made from the title. A cover image must be an https address or a path on this site. {@code status}
     * is the workflow step; when it is absent, {@code published} keeps its old meaning (published now, or a draft).
     * {@code publishAt} schedules a PUBLISHED post for later; blank publishes it now.
     */
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
                              boolean published,
                              BlogPost.Status status,
                              Instant publishAt,
                              Boolean featured,
                              Boolean sponsored,
                              @Size(max = 12) List<@NotBlank @Size(max = 40) String> tags,
                              LocalDate lastReviewedOn,
                              @Size(max = 30) List<@Valid Source> sources,
                              @Size(max = 20) List<@Valid Faq> faqs) {
    }
}
