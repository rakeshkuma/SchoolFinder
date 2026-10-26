package com.indiaschoolfinder.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tidies display names built from postal addresses (CBSE SARAS imports append a place to generic names): stray
 * punctuation, district markers and repeated words. Purely mechanical: words and spellings are never changed (the exact
 * official name is kept in the profile description), and an already tidy name is returned unchanged.
 */
public final class SchoolNames {

    /** " ," always; " ." only when the dot ends a word group (" .& Xd" is left alone rather than glued on). */
    private static final Pattern SPACE_BEFORE_PUNCT = Pattern.compile("\\s+(,|\\.(?=\\s|,|$))");
    private static final Pattern COMMA_JUNK = Pattern.compile(",(?:\\s*[&.\\-])+(?=\\s|$)");
    private static final Pattern NO_SPACE_AFTER_COMMA = Pattern.compile(",(?=[^\\s,])");
    private static final Pattern REPEATED_COMMAS = Pattern.compile(",(\\s*,)+");
    /**
     * District markers: "Dt-" or "Distt." (with a dot or hyphen) anywhere; a bare "Dt"/"Distt" only at the end of the
     * name or before a comma, so a word that merely reads "Dt" inside a name is kept.
     */
    private static final Pattern DISTRICT_MARKER = Pattern.compile(
            "(?i)(?<=\\s|^)(?:(?:dt|distt?)(?:\\.-?|-)(?=\\s|,|$)|(?:dt|distt?)(?=\\s*(?:,|$)))");
    /**
     * The same one to four words twice in a row ("Narwapahar Narwapahar", "Mandar Vidyapith Mandar Vidyapith"). Words
     * need three or more letters, so initials such as "P P Savani" or "I I T Campus" are never collapsed.
     */
    private static final Pattern REPEATED_PHRASE = Pattern.compile("(?i)\\b(\\p{L}{3,}(?:\\s+\\p{L}{3,}){0,3})(?:\\s+\\1)+\\b");
    private static final Pattern TRAILING_JUNK = Pattern.compile("[\\s,&\\-]+$");
    /** A final dot after a plain word ("High School.") but not after an abbreviation ("Raipur, C.g."). */
    private static final Pattern TRAILING_DOT = Pattern.compile("(?<=\\s|^)([\\p{L}\\d]+)\\.$");
    private static final Pattern LOWER_AFTER_COMMA = Pattern.compile(", (\\p{Ll})");

    private SchoolNames() {
    }

    public static String tidy(String name) {
        if (name == null) {
            return null;
        }
        String s = name.trim().replaceAll("\\s+", " ");
        String previous;
        do {
            previous = s;
            s = DISTRICT_MARKER.matcher(s).replaceAll("");
            s = SPACE_BEFORE_PUNCT.matcher(s).replaceAll("$1");
            s = COMMA_JUNK.matcher(s).replaceAll(",");
            s = REPEATED_COMMAS.matcher(s).replaceAll(",");
            s = NO_SPACE_AFTER_COMMA.matcher(s).replaceAll(", ");
            // Repeats are collapsed only in the place appended after the first comma, never in the school's own name
            // ("Ess Ess Convent School" is a name; "Bagrakot Bagrakot" is an address read twice).
            int comma = s.indexOf(", ");
            if (comma >= 0) {
                s = s.substring(0, comma + 2) + REPEATED_PHRASE.matcher(s.substring(comma + 2)).replaceAll("$1");
            }
            s = TRAILING_JUNK.matcher(s).replaceAll("");
            s = TRAILING_DOT.matcher(s).replaceAll("$1");
            s = s.replaceAll("\\s+", " ").trim();
        } while (!s.equals(previous));
        Matcher lower = LOWER_AFTER_COMMA.matcher(s);
        StringBuilder out = new StringBuilder();
        while (lower.find()) {
            lower.appendReplacement(out, ", " + lower.group(1).toUpperCase(java.util.Locale.ROOT));
        }
        lower.appendTail(out);
        return out.isEmpty() ? name.trim() : out.toString();
    }
}
