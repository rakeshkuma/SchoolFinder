package com.indiaschoolfinder.notifications.source;

import com.indiaschoolfinder.notifications.fetch.UrlPolicy;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Small text helpers shared by the adapters. */
public final class NoticeText {

    private NoticeText() {
    }

    /** Collapses whitespace (including no-break spaces) and trims; null stays null. */
    public static String clean(String s) {
        if (s == null) {
            return null;
        }
        String t = s.replace(' ', ' ').replace('​', ' ').replaceAll("\\s+", " ").trim();
        return t.isEmpty() ? null : t;
    }

    /** A date only if it is real and plausible for a current notice (not before 2015, not after tomorrow). */
    public static LocalDate plausible(int year, int month, int day, LocalDate today) {
        try {
            LocalDate d = LocalDate.of(year, month, day);
            return d.getYear() >= 2015 && !d.isAfter(today.plusDays(1)) ? d : null;
        } catch (DateTimeException e) {
            return null;
        }
    }

    private static final Pattern DMY = Pattern.compile("(\\d{1,2})[./-](\\d{1,2})[./-](\\d{4})");

    /** "05/11/2026", "24-09-2026" or "05.11.2026" (day first, as Indian notices write it). */
    public static LocalDate dayMonthYear(String s, LocalDate today) {
        if (s == null) {
            return null;
        }
        Matcher m = DMY.matcher(s.trim());
        if (!m.matches()) {
            return null;
        }
        return plausible(Integer.parseInt(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)), today);
    }

    /** Canonical absolute address, or null. */
    public static String url(String s) {
        return UrlPolicy.canonical(s);
    }

    public static boolean has(String text, Pattern p) {
        return text != null && p.matcher(text).find();
    }
}
