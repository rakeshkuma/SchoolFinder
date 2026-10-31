package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Questions bookmarked in the browser before signing in ("set/question" ids), to add to the member's bookmarks. */
public record BookmarksRequest(
        @NotNull @Size(max = 300) List<@NotNull @Pattern(regexp = "[a-z0-9-]+/[a-z0-9-]+") @Size(max = 170) String> questionIds) {
}
