package com.indiaschoolfinder.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * Strips HTML from free text supplied by users or CSV files. React escapes output anyway;
 * this keeps stored data clean for other consumers (exports, emails, admin tools).
 */
public final class InputSanitizer {

    private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

    private InputSanitizer() {
    }

    /** Returns null for null/blank input so "unknown" stays NULL rather than "". */
    public static String clean(String input) {
        if (input == null) {
            return null;
        }
        String cleaned = Jsoup.clean(input, "", Safelist.none(), OUTPUT);
        // Jsoup escapes entities; restore the common ones so text reads naturally.
        cleaned = org.jsoup.parser.Parser.unescapeEntities(cleaned, false)
                .replaceAll("[\\p{Cntrl}&&[^\n\t]]", "")
                .trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
