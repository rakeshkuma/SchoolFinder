package com.indiaschoolfinder.notifications.opportunity;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Dates as Indian notices write them: "16.11.2026", "05/08/2026", "16-11-2026" (day first), "16 November 2026",
 * "16th Nov, 2026", "November 16, 2026", in Latin or Indian digits (Devanagari, Odia, Bengali and the other scripts are
 * read as the same digits). Only real calendar dates are returned; nothing is guessed from a partial date.
 */
public final class DateText {

    private DateText() {
    }

    /** A date and where it was found in the (digit-normalised) text. */
    public record Found(LocalDate date, int start, int end) {
    }

    private static final String MONTHS = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?"
            + "|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
    private static final Pattern NUMERIC = Pattern.compile("(?<![\\d.])(\\d{1,2})\\s?[./-]\\s?(\\d{1,2})\\s?[./-]\\s?(\\d{4})(?!\\d)");
    private static final Pattern DAY_MONTH = Pattern.compile("(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?[-\\s]?" + MONTHS
            + "\\.?[,\\s-]*(\\d{4})(?!\\d)", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTH_DAY = Pattern.compile("(?<![a-z])" + MONTHS + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})(?!\\d)",
            Pattern.CASE_INSENSITIVE);
    private static final Map<String, Integer> MONTH = Map.ofEntries(Map.entry("jan", 1), Map.entry("feb", 2), Map.entry("mar", 3),
            Map.entry("apr", 4), Map.entry("may", 5), Map.entry("jun", 6), Map.entry("jul", 7), Map.entry("aug", 8),
            Map.entry("sep", 9), Map.entry("oct", 10), Map.entry("nov", 11), Map.entry("dec", 12));

    /** The text with every Unicode decimal digit (०-९, ୦-୯, ০-৯ ...) written as 0-9. */
    public static String normaliseDigits(String s) {
        if (s == null) {
            return null;
        }
        StringBuilder b = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); ) {
            int cp = s.codePointAt(i);
            if (Character.isDigit(cp) && (cp < '0' || cp > '9')) {
                b.append((char) ('0' + Character.digit(cp, 10)));
            } else {
                b.appendCodePoint(cp);
            }
            i += Character.charCount(cp);
        }
        return b.toString();
    }

    /** Every date in the text, in order (the text should already have normalised digits). */
    public static List<Found> all(String text) {
        List<Found> out = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return out;
        }
        Matcher m = NUMERIC.matcher(text);
        while (m.find()) {
            add(out, of(Integer.parseInt(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1))), m);
        }
        m = DAY_MONTH.matcher(text);
        while (m.find()) {
            add(out, of(Integer.parseInt(m.group(3)), month(m.group(2)), Integer.parseInt(m.group(1))), m);
        }
        m = MONTH_DAY.matcher(text);
        while (m.find()) {
            add(out, of(Integer.parseInt(m.group(3)), month(m.group(1)), Integer.parseInt(m.group(2))), m);
        }
        out.sort((a, b) -> Integer.compare(a.start(), b.start()));
        return out;
    }

    /** The first date that starts at or after {@code from}, or null. */
    public static Found firstAfter(List<Found> dates, int from) {
        for (Found f : dates) {
            if (f.start() >= from) {
                return f;
            }
        }
        return null;
    }

    /** One date written alone ("05/11/2026", "16 Nov 2026"), or null. */
    public static LocalDate parse(String s) {
        List<Found> found = all(normaliseDigits(s == null ? null : s.trim()));
        return found.isEmpty() ? null : found.get(0).date();
    }

    private static void add(List<Found> out, LocalDate d, Matcher m) {
        if (d == null) {
            return;
        }
        for (Found f : out) {
            if (m.start() < f.end() && f.start() < m.end()) {
                return; // the same words matched by another format
            }
        }
        out.add(new Found(d, m.start(), m.end()));
    }

    private static int month(String name) {
        return MONTH.getOrDefault(name.substring(0, 3).toLowerCase(Locale.ROOT), 0);
    }

    private static LocalDate of(int year, int month, int day) {
        if (year < 2015 || year > 2100 || month < 1) {
            return null;
        }
        try {
            return LocalDate.of(year, month, day);
        } catch (DateTimeException e) {
            return null;
        }
    }
}
