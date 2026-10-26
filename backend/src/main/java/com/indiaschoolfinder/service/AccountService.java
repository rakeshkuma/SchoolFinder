package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.account.AccountDto;
import com.indiaschoolfinder.dto.account.ProfileUpdateRequest;
import com.indiaschoolfinder.dto.account.RegisterRequest;
import com.indiaschoolfinder.entity.AccountToken;
import com.indiaschoolfinder.entity.UserAccount;
import com.indiaschoolfinder.exception.AccountException;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.repository.AccountTokenRepository;
import com.indiaschoolfinder.repository.UserAccountRepository;
import com.indiaschoolfinder.security.PasswordPolicy;
import com.indiaschoolfinder.util.InputSanitizer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Member accounts: registration with email verification, sign-in checks with lockout, profile, password change and
 * reset, and deletion. Responses never reveal whether an email address is registered: registration, resending a
 * verification link and requesting a reset all answer the same way, and any notice goes to the mailbox owner only.
 * Session handling (sign-in, sign-out, revoking sessions) lives in {@link MemberSessions}.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class AccountService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserAccountRepository accounts;
    private final AccountTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final MailService mail;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;
    /** A real hash at the same cost, compared against when the email is unknown, so sign-in takes as long either way. */
    private final String dummyHash;

    public AccountService(UserAccountRepository accounts, AccountTokenRepository tokens, PasswordEncoder passwordEncoder,
                          MailService mail, AuditService auditService, AppProperties properties, Clock clock) {
        byte[] random = new byte[24];
        RANDOM.nextBytes(random);
        this.dummyHash = passwordEncoder.encode(Base64.getEncoder().encodeToString(random));
        this.accounts = accounts;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.mail = mail;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    public static String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    // --- registration and verification -------------------------------------------------------------------------------

    @Transactional
    public void register(RegisterRequest r) {
        String email = normaliseEmail(r.email());
        requireGoodPassword(r.password(), email, "password");
        String name = InputSanitizer.clean(r.displayName());
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("displayName", "enter your name");
        }
        UserAccount existing = accounts.findByEmail(email).orElse(null);
        if (existing != null) {
            // Same answer as a new registration; the mailbox owner learns what happened.
            if (existing.isVerified()) {
                mail.send(email, "Your India School Finder account",
                        "Someone tried to create an India School Finder account with this email address, which already has an "
                                + "account.\n\nIf it was you, sign in at " + link("/signin") + " or reset your password at "
                                + link("/forgot-password") + ".\n\nIf it was not you, you can ignore this email.");
            } else {
                sendVerification(existing);
            }
            return;
        }
        Instant now = Instant.now(clock);
        UserAccount account = new UserAccount();
        account.setEmail(email);
        account.setDisplayName(name.trim());
        account.setPasswordHash(passwordEncoder.encode(r.password()));
        account.setStateCode(r.stateCode());
        account.setCity(blankToNull(InputSanitizer.clean(r.city())));
        account.setTermsAcceptedAt(now);
        account.setTermsVersion(properties.getAccount().getTermsVersion());
        account.setPasswordChangedAt(now);
        account = accounts.saveAndFlush(account);
        sendVerification(account);
        auditService.record("ACCOUNT_REGISTERED", "USER_ACCOUNT", account.getId(), null);
    }

    @Transactional
    public void resendVerification(String rawEmail) {
        accounts.findByEmail(normaliseEmail(rawEmail)).filter(a -> !a.isVerified()).ifPresent(this::sendVerification);
    }

    @Transactional
    public UserAccount verifyEmail(String token) {
        AccountToken t = useToken(token, AccountToken.Purpose.VERIFY_EMAIL,
                "This verification link is invalid or has expired. Request a new one from the sign-in page.");
        UserAccount account = accounts.findById(t.getUserId()).orElseThrow(this::invalidLink);
        if (!account.isVerified()) {
            account.setEmailVerifiedAt(Instant.now(clock));
            auditService.record("ACCOUNT_EMAIL_VERIFIED", "USER_ACCOUNT", account.getId(), null);
        }
        return account;
    }

    private void sendVerification(UserAccount account) {
        String token = issueToken(account.getId(), AccountToken.Purpose.VERIFY_EMAIL, properties.getAccount().getVerificationTtl());
        mail.send(account.getEmail(), "Confirm your email for India School Finder",
                "Hello " + account.getDisplayName() + ",\n\nPlease confirm your email address to finish creating your India "
                        + "School Finder account:\n\n" + link("/verify-email?token=" + token) + "\n\nThis link works once and "
                        + "expires in " + hours(properties.getAccount().getVerificationTtl()) + ". If you did not create an "
                        + "account, you can ignore this email.");
    }

    // --- sign-in -------------------------------------------------------------------------------------------------------

    /**
     * Checks credentials. Unknown email and wrong password give the same answer. A locked or unverified account is
     * only reported once the password is right, so those states do not reveal who has an account.
     */
    @Transactional(noRollbackFor = AccountException.class)
    public UserAccount authenticate(String rawEmail, String password) {
        UserAccount account = accounts.findByEmail(normaliseEmail(rawEmail)).orElse(null);
        if (account == null) {
            passwordEncoder.matches(password, dummyHash);
            throw badCredentials();
        }
        Instant now = Instant.now(clock);
        boolean locked = account.getLockedUntil() != null && account.getLockedUntil().isAfter(now);
        // Members who signed up with Google have no password: same answer and timing as a wrong password.
        boolean matches;
        if (account.getPasswordHash() == null) {
            passwordEncoder.matches(password, dummyHash);
            matches = false;
        } else {
            matches = passwordEncoder.matches(password, account.getPasswordHash());
        }
        if (!matches) {
            if (!locked) {
                int failures = account.getFailedLoginCount() + 1;
                if (failures >= properties.getAccount().getMaxFailedLogins()) {
                    account.setLockedUntil(now.plus(properties.getAccount().getLockDuration()));
                    account.setFailedLoginCount(0);
                    auditService.record("ACCOUNT_LOCKED", "USER_ACCOUNT", account.getId(), null);
                } else {
                    account.setFailedLoginCount(failures);
                }
            }
            throw badCredentials();
        }
        if (locked) {
            throw new AccountException(HttpStatus.LOCKED, "ACCOUNT_LOCKED", "Too many unsuccessful attempts. Please try again in "
                    + minutes(properties.getAccount().getLockDuration()) + ", or reset your password.");
        }
        if (!account.isVerified()) {
            throw new AccountException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                    "Please confirm your email address first. We can send you a new link.");
        }
        account.setFailedLoginCount(0);
        account.setLockedUntil(null);
        account.setLastLoginAt(now);
        return account;
    }

    /**
     * Sign-in with a Google account whose identity Spring Security has already verified (signed ID token from Google,
     * matching state and nonce). Only email addresses Google reports as verified are accepted.
     * <ul>
     *   <li>An account already linked to this Google subject signs in.</li>
     *   <li>An account with the same email is linked. If its email was never confirmed, whoever created it never proved
     *   they own the mailbox, so its password is removed (the Google user now proves ownership).</li>
     *   <li>Otherwise a new account is created with a confirmed email and no password.</li>
     * </ul>
     */
    @Transactional
    public UserAccount signInWithGoogle(String subject, String rawEmail, Boolean emailVerified, String name) {
        if (subject == null || subject.isBlank()) {
            throw googleFailed();
        }
        Instant now = Instant.now(clock);
        UserAccount linked = accounts.findByGoogleSubject(subject).orElse(null);
        if (linked != null) {
            linked.setLastLoginAt(now);
            return linked;
        }
        String email = normaliseEmail(rawEmail);
        if (!Boolean.TRUE.equals(emailVerified) || email.isEmpty()) {
            throw new AccountException(HttpStatus.FORBIDDEN, "GOOGLE_EMAIL_UNVERIFIED",
                    "Google has not verified the email address of that Google account.");
        }
        UserAccount account = accounts.findByEmail(email).orElse(null);
        if (account != null) {
            if (account.getGoogleSubject() != null) {
                // The email belongs to an account linked to a different Google account.
                throw new AccountException(HttpStatus.CONFLICT, "GOOGLE_ACCOUNT_MISMATCH",
                        "This email address is already linked to a different Google account.");
            }
            if (!account.isVerified()) {
                account.setPasswordHash(null);
                account.setEmailVerifiedAt(now);
                tokens.retireUnused(account.getId(), AccountToken.Purpose.VERIFY_EMAIL, now);
                auditService.record("ACCOUNT_UNVERIFIED_PASSWORD_REMOVED", "USER_ACCOUNT", account.getId(), null);
            }
            account.setGoogleSubject(subject);
            account.setLastLoginAt(now);
            account = accounts.saveAndFlush(account);
            auditService.record("ACCOUNT_GOOGLE_LINKED", "USER_ACCOUNT", account.getId(), null);
            mail.send(email, "Google sign-in was added to your India School Finder account",
                    "You can now sign in to your India School Finder account with Google. If this was not you, reset your "
                            + "password at " + link("/forgot-password") + " and secure your Google account.");
            return account;
        }
        account = new UserAccount();
        account.setEmail(email);
        String display = InputSanitizer.clean(name);
        if (display == null || display.isBlank()) {
            display = email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length());
        }
        account.setDisplayName(display.trim().length() > 80 ? display.trim().substring(0, 80) : display.trim());
        account.setGoogleSubject(subject);
        account.setEmailVerifiedAt(now);
        // The Google button is shown with the notice that continuing accepts the Terms and Privacy Policy.
        account.setTermsAcceptedAt(now);
        account.setTermsVersion(properties.getAccount().getTermsVersion());
        account.setPasswordChangedAt(now);
        account.setLastLoginAt(now);
        account = accounts.saveAndFlush(account);
        auditService.record("ACCOUNT_REGISTERED_GOOGLE", "USER_ACCOUNT", account.getId(), null);
        return account;
    }

    private static AccountException googleFailed() {
        return new AccountException(HttpStatus.UNAUTHORIZED, "GOOGLE_FAILED", "Google sign-in did not complete.");
    }

    // --- profile -------------------------------------------------------------------------------------------------------

    public AccountDto me(long accountId) {
        return toDto(require(accountId));
    }

    @Transactional
    public AccountDto updateProfile(long accountId, ProfileUpdateRequest r) {
        UserAccount account = require(accountId);
        String name = InputSanitizer.clean(r.displayName());
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("displayName", "enter your name");
        }
        account.setDisplayName(name.trim());
        account.setStateCode(r.stateCode());
        account.setCity(blankToNull(InputSanitizer.clean(r.city())));
        return toDto(accounts.saveAndFlush(account));
    }

    // --- passwords -----------------------------------------------------------------------------------------------------

    @Transactional
    public void changePassword(long accountId, String current, String next) {
        UserAccount account = require(accountId);
        if (account.getPasswordHash() == null) {
            // Setting a first password goes through an emailed link, so a stolen session alone cannot add one.
            throw new BusinessValidationException("currentPassword",
                    "this account has no password yet; use \"Set a password\" to get a link by email");
        }
        if (!passwordEncoder.matches(current, account.getPasswordHash())) {
            throw new BusinessValidationException("currentPassword", "your current password is not correct");
        }
        requireGoodPassword(next, account.getEmail(), "newPassword");
        setPassword(account, next);
        auditService.record("ACCOUNT_PASSWORD_CHANGED", "USER_ACCOUNT", accountId, null);
        mail.send(account.getEmail(), "Your India School Finder password was changed",
                "The password for your India School Finder account was changed. If this was not you, reset your password at "
                        + link("/forgot-password") + ".");
    }

    @Transactional
    public void requestPasswordReset(String rawEmail) {
        accounts.findByEmail(normaliseEmail(rawEmail)).ifPresent(account -> {
            String token = issueToken(account.getId(), AccountToken.Purpose.RESET_PASSWORD, properties.getAccount().getResetTtl());
            mail.send(account.getEmail(), "Reset your India School Finder password",
                    "We received a request to reset the password for your India School Finder account.\n\nChoose a new "
                            + "password here:\n\n" + link("/reset-password?token=" + token) + "\n\nThis link works once and "
                            + "expires in " + minutes(properties.getAccount().getResetTtl()) + ". If you did not ask for this, "
                            + "you can ignore this email; your password stays the same.");
        });
    }

    /** Sets the new password; the caller then signs the member out of every session. Returns the account id. */
    @Transactional
    public long resetPassword(String token, String next) {
        AccountToken t = tokens.findByTokenHash(hash(token)).orElseThrow(this::invalidLink);
        UserAccount account = accounts.findById(t.getUserId()).orElseThrow(this::invalidLink);
        requireGoodPassword(next, account.getEmail(), "newPassword"); // checked before the link is spent
        useToken(token, AccountToken.Purpose.RESET_PASSWORD, "This reset link is invalid or has expired. Request a new one.");
        setPassword(account, next);
        account.setFailedLoginCount(0);
        account.setLockedUntil(null);
        // The link proves control of the mailbox, so an unverified address becomes verified.
        if (!account.isVerified()) {
            account.setEmailVerifiedAt(Instant.now(clock));
        }
        auditService.record("ACCOUNT_PASSWORD_RESET", "USER_ACCOUNT", account.getId(), null);
        mail.send(account.getEmail(), "Your India School Finder password was reset",
                "Your password was reset and you were signed out everywhere. If this was not you, reset it again at "
                        + link("/forgot-password") + ".");
        return account.getId();
    }

    // --- deletion ------------------------------------------------------------------------------------------------------

    /**
     * Deletes the account and its tokens after re-authentication; the caller ends all of its sessions. With a password
     * the password is required. Without one (Google sign-up) the email address must be typed and the session must
     * have signed in within {@code app.account.recent-sign-in}.
     */
    @Transactional
    public void deleteAccount(long accountId, String password, String confirmEmail, Instant signedInAt) {
        UserAccount account = require(accountId);
        if (account.getPasswordHash() != null) {
            if (password == null || !passwordEncoder.matches(password, account.getPasswordHash())) {
                throw new BusinessValidationException("password", "the password is not correct");
            }
        } else {
            if (!account.getEmail().equals(normaliseEmail(confirmEmail))) {
                throw new BusinessValidationException("confirmEmail", "type the email address of this account");
            }
            Instant cutoff = Instant.now(clock).minus(properties.getAccount().getRecentSignIn());
            if (signedInAt == null || signedInAt.isBefore(cutoff)) {
                throw new AccountException(HttpStatus.FORBIDDEN, "REAUTH_REQUIRED", "For your security, sign in with Google "
                        + "again, then delete the account within " + minutes(properties.getAccount().getRecentSignIn()) + ".");
            }
        }
        String email = account.getEmail();
        accounts.delete(account); // account_token rows go with it (ON DELETE CASCADE)
        auditService.record("ACCOUNT_DELETED", "USER_ACCOUNT", accountId, null);
        mail.send(email, "Your India School Finder account was deleted",
                "Your India School Finder account and the information saved with it have been deleted.");
    }

    @Transactional
    @Scheduled(cron = "0 17 3 * * *")
    public void purgeExpiredTokens() {
        int removed = tokens.deleteExpiredBefore(Instant.now(clock).minus(Duration.ofDays(7)));
        if (removed > 0) {
            log.info("Removed {} expired account tokens", removed);
        }
    }

    // --- helpers -------------------------------------------------------------------------------------------------------

    private UserAccount require(long accountId) {
        return accounts.findById(accountId).orElseThrow(() ->
                new AccountException(HttpStatus.UNAUTHORIZED, "NOT_SIGNED_IN", "Please sign in again."));
    }

    private void setPassword(UserAccount account, String password) {
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setPasswordChangedAt(Instant.now(clock));
        accounts.saveAndFlush(account);
    }

    private static void requireGoodPassword(String password, String email, String field) {
        PasswordPolicy.problem(password, email).ifPresent(problem -> {
            throw new BusinessValidationException(field, problem);
        });
    }

    /** A new random token; earlier unused tokens of the same purpose stop working. Only its hash is stored. */
    private String issueToken(long userId, AccountToken.Purpose purpose, Duration ttl) {
        Instant now = Instant.now(clock);
        tokens.retireUnused(userId, purpose, now);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        AccountToken t = new AccountToken();
        t.setUserId(userId);
        t.setPurpose(purpose);
        t.setTokenHash(hash(token));
        t.setCreatedAt(now);
        t.setExpiresAt(now.plus(ttl));
        tokens.save(t);
        return token;
    }

    private AccountToken useToken(String token, AccountToken.Purpose purpose, String message) {
        AccountToken t = tokens.findByTokenHash(hash(token)).orElse(null);
        Instant now = Instant.now(clock);
        if (t == null || t.getPurpose() != purpose || t.getUsedAt() != null || !t.getExpiresAt().isAfter(now)) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "INVALID_LINK", message);
        }
        t.setUsedAt(now);
        return t;
    }

    private AccountException invalidLink() {
        return new AccountException(HttpStatus.BAD_REQUEST, "INVALID_LINK", "This link is invalid or has expired.");
    }

    private static AccountException badCredentials() {
        return new AccountException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "The email or password is not correct.");
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((token == null ? "" : token).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private String link(String path) {
        String base = properties.getAccount().getLinkBaseUrl();
        if (base == null || base.isBlank()) {
            base = properties.getPublicSiteUrl();
        }
        if (base == null || base.isBlank()) {
            throw new IllegalStateException("Set app.account.link-base-url (or PUBLIC_SITE_URL) so emailed links work");
        }
        return base.trim().replaceAll("/+$", "") + path;
    }

    private static AccountDto toDto(UserAccount a) {
        return new AccountDto(a.getEmail(), a.getDisplayName(), a.isVerified(), a.getStateCode(), a.getCity(),
                a.getCreatedAt(), a.getTermsVersion(), a.getPasswordHash() != null, a.getGoogleSubject() != null);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String hours(Duration d) {
        long h = d.toHours();
        return h == 1 ? "1 hour" : h + " hours";
    }

    private static String minutes(Duration d) {
        long m = d.toMinutes();
        return m == 1 ? "1 minute" : m + " minutes";
    }
}
