package com.indiaschoolfinder.util;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Rules for public nicknames, which children may choose: letters (any script), digits, spaces and . _ - only; no
 * contact details (an email, a web address or a phone-like run of digits), no posing as site staff, and none of a
 * short list of slurs. Returns the reason a nickname is refused, or null when it is acceptable.
 */
public final class Nicknames {

    private static final Pattern ALLOWED = Pattern.compile("[\\p{L}\\p{M}\\p{N} ._-]{3,24}");
    private static final Pattern PHONE_LIKE = Pattern.compile("\\d{6,}");
    private static final Pattern WEB = Pattern.compile("(?i)(https?|www\\.|\\.com|\\.in\\b)");
    private static final List<String> RESERVED = List.of("admin", "moderator", "indiaschoolfinder", "official", "support");
    /** A deliberately short list; moderators hide anything else (participant.hidden). */
    private static final List<String> BLOCKED = List.of("fuck", "shit", "bitch", "bastard", "chutiya", "madarchod",
            "behenchod", "bhosdi", "gandu", "randi", "harami", "slut", "whore", "nigger", "retard");

    private Nicknames() {
    }

    /** Trims and collapses spaces. */
    public static String clean(String nickname) {
        return nickname == null ? "" : nickname.strip().replaceAll("\\s+", " ");
    }

    public static String problem(String nickname) {
        String n = clean(nickname);
        if (!ALLOWED.matcher(n).matches()) {
            return "use 3 to 24 letters, digits, spaces, dots, dashes or underscores";
        }
        if (PHONE_LIKE.matcher(n.replaceAll("[ ._-]", "")).find() || WEB.matcher(n).find()) {
            return "a nickname must not contain a phone number or web address";
        }
        String folded = Normalizer.normalize(n, Normalizer.Form.NFKD).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if (RESERVED.stream().anyMatch(folded::contains)) {
            return "please choose a nickname that does not look like a staff account";
        }
        if (BLOCKED.stream().anyMatch(folded::contains)) {
            return "please choose a different nickname";
        }
        return null;
    }
}
