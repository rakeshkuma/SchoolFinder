package com.indiaschoolfinder.util;

import java.time.LocalDate;
import java.time.Month;
import java.util.regex.Pattern;

/** Indian school academic years run April–March and are written "2026-27". */
public final class AcademicYears {

    public static final String PATTERN = "^\\d{4}-\\d{2}$";
    private static final Pattern COMPILED = Pattern.compile(PATTERN);

    private AcademicYears() {
    }

    public static String of(LocalDate date) {
        int startYear = date.getMonth().compareTo(Month.APRIL) >= 0 ? date.getYear() : date.getYear() - 1;
        return format(startYear);
    }

    public static String format(int startYear) {
        return String.format("%d-%02d", startYear, (startYear + 1) % 100);
    }

    /** True when the string is well formed and the second part follows the first (e.g. 2026-27). */
    public static boolean isValid(String value) {
        if (value == null || !COMPILED.matcher(value).matches()) {
            return false;
        }
        int start = Integer.parseInt(value.substring(0, 4));
        int end = Integer.parseInt(value.substring(5));
        return (start + 1) % 100 == end;
    }
}
