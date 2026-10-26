package com.indiaschoolfinder.util;

import java.text.Normalizer;
import java.util.Locale;

public final class SlugUtil {

    private static final int MAX_LENGTH = 200;

    private SlugUtil() {
    }

    public static String toSlug(String... parts) {
        StringBuilder joined = new StringBuilder();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                joined.append(part).append(' ');
            }
        }
        String normalized = Normalizer.normalize(joined.toString(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace("&", " and ")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (normalized.length() > MAX_LENGTH) {
            normalized = normalized.substring(0, MAX_LENGTH).replaceAll("-+$", "");
        }
        return normalized.isEmpty() ? "school" : normalized;
    }
}
