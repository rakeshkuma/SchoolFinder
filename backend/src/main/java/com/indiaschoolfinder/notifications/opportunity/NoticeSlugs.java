package com.indiaschoolfinder.notifications.opportunity;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Addresses for admission and job notices: /jobs/{slug} and /admissions/{slug}. A slug is made once, from the notice's
 * displayed title (with the institution when the title does not name it), and never changes afterwards, so a link to
 * a notice keeps working even if its title is corrected. Titles in Hindi or another script, which give too few Latin
 * words, get the institution, the kind of notice and the date instead.
 */
public final class NoticeSlugs {

    private NoticeSlugs() {
    }

    /** Pages under /admissions that are not notices (AdmissionsPages): a notice never takes one of these addresses. */
    public static final Set<String> RESERVED = Set.of("notifications", "guide", "notice", "past", "jobs", "new", "edit");
    private static final int MAX = 90;

    /**
     * @param taken true when a slug is already used by another notice
     */
    public static String make(String title, String institution, String kind, LocalDate publishedOn, Predicate<String> taken) {
        String base = words(title, 12);
        if (base.length() < 16 && institution != null) {
            base = words(institution + " " + kind + " " + (publishedOn == null ? "" : publishedOn), 14);
        } else if (institution != null && !mentions(base, institution)) {
            base = words(institution, 5) + "-" + base;
        }
        base = cut(base.isEmpty() ? "notice" : base);
        String slug = base;
        for (int n = 2; RESERVED.contains(slug) || taken.test(slug); n++) {
            slug = cut(base.length() > MAX - 4 ? base.substring(0, MAX - 4) : base) + "-" + n;
        }
        return slug;
    }

    /** Latin letters and digits of the text as lower-case words joined by hyphens, at most {@code max} words. */
    public static String words(String text, int max) {
        if (text == null) {
            return "";
        }
        String ascii = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .replace("&", " and ").toLowerCase(Locale.ROOT);
        List<String> out = new ArrayList<>();
        for (String w : ascii.split("[^a-z0-9]+")) {
            if (!w.isEmpty() && out.size() < max) {
                out.add(w);
            }
        }
        return String.join("-", out);
    }

    /** Whether the slug already carries the institution's distinctive words ("korukonda" for Sainik School Korukonda). */
    private static boolean mentions(String slug, String institution) {
        String[] parts = words(institution, 8).split("-");
        for (String p : parts) {
            if (p.length() >= 4 && !Set.of("school", "schools", "public", "college", "international", "residential", "sainik", "vidyalaya",
                    "board", "society", "india", "national", "the").contains(p) && slug.contains(p)) {
                return true;
            }
        }
        return false;
    }

    private static String cut(String slug) {
        if (slug.length() <= MAX) {
            return slug;
        }
        int at = slug.lastIndexOf('-', MAX);
        return slug.substring(0, at > 30 ? at : MAX);
    }
}
