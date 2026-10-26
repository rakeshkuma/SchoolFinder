package com.indiaschoolfinder.security;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Member password rules (NIST SP 800-63B style: length over composition rules). 10–64 characters and at most 72
 * bytes, because BCrypt ignores anything beyond 72 bytes; not a commonly used password; not containing the email
 * name. Applied on the server for registration, change and reset; the UI shows the same rules.
 */
public final class PasswordPolicy {

    public static final String DESCRIPTION = "10 to 64 characters, not a common password, and not containing your email name. "
            + "A short sentence you will remember works well.";
    public static final int MIN = 10;
    public static final int MAX = 64;

    private static final Set<String> COMMON = Set.of(
            "password123", "password1234", "qwerty12345", "qwertyuiop", "1234567890", "12345678910", "123456789a",
            "iloveyou123", "admin12345", "welcome123", "abcdefghij", "abc1234567", "letmein123", "password@123",
            "india12345", "india@1234", "qwerty@123", "passw0rd123", "1q2w3e4r5t", "zaq12wsxcde", "aaaaaaaaaa",
            "0987654321", "1111111111", "sunshine123", "princess123", "football123", "monkey12345", "dragon12345");

    private PasswordPolicy() {
    }

    /** The reason the password is not acceptable, or empty when it is. */
    public static Optional<String> problem(String password, String email) {
        if (password == null || password.length() < MIN) {
            return Optional.of("Use at least " + MIN + " characters.");
        }
        if (password.length() > MAX || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return Optional.of("Use at most " + MAX + " characters.");
        }
        if (password.isBlank() || password.chars().distinct().count() < 4) {
            return Optional.of("Use a less repetitive password.");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (COMMON.contains(lower)) {
            return Optional.of("This password is too common. Choose something less predictable.");
        }
        if (email != null) {
            String name = email.split("@", 2)[0].toLowerCase(Locale.ROOT);
            if (name.length() >= 4 && lower.contains(name)) {
                return Optional.of("Do not use your email name in your password.");
            }
        }
        return Optional.empty();
    }
}
