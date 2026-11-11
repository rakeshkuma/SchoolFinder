package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.account.AccountDto;
import com.indiaschoolfinder.dto.account.ProfileUpdateRequest;
import com.indiaschoolfinder.entity.UserAccount;
import com.indiaschoolfinder.exception.AccountException;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.repository.UserAccountRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

/**
 * Member accounts, signed in with Google only: the Google sign-in itself, the profile, and deletion. Session handling
 * (sign-in, sign-out, revoking sessions) lives in {@link com.indiaschoolfinder.security.MemberSessions}.
 */
@Service
@Transactional(readOnly = true)
public class AccountService {

    private final UserAccountRepository accounts;
    private final MailService mail;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;

    public AccountService(UserAccountRepository accounts, MailService mail, AuditService auditService, AppProperties properties, Clock clock) {
        this.accounts = accounts;
        this.mail = mail;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    public static String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
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
     * The profile photo Google reports is stored (and refreshed at each sign-in) when it is on Google's image host.
     */
    @Transactional
    public GoogleSignInResult signInWithGoogle(String subject, String rawEmail, Boolean emailVerified, String name, String picture) {
        if (subject == null || subject.isBlank()) {
            throw googleFailed();
        }
        Instant now = Instant.now(clock);
        String pictureUrl = googlePicture(picture);
        UserAccount linked = accounts.findByGoogleSubject(subject).orElse(null);
        if (linked != null) {
            linked.setLastLoginAt(now);
            linked.setPictureUrl(pictureUrl);
            return new GoogleSignInResult(linked, false);
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
            // Accounts from the time of email sign-up: Google now proves the mailbox, and the old password is not kept.
            account.setPasswordHash(null);
            if (!account.isVerified()) {
                account.setEmailVerifiedAt(now);
            }
            account.setGoogleSubject(subject);
            account.setPictureUrl(pictureUrl);
            account.setLastLoginAt(now);
            account = accounts.saveAndFlush(account);
            auditService.record("ACCOUNT_GOOGLE_LINKED", "USER_ACCOUNT", account.getId(), null);
            mail.send(email, "Google sign-in was added to your SchoolDhundo account",
                    "You can now sign in to your SchoolDhundo account with Google. If this was not you, secure your "
                            + "Google account and contact SchoolDhundo.");
            return new GoogleSignInResult(account, false);
        }
        account = new UserAccount();
        account.setEmail(email);
        String display = InputSanitizer.clean(name);
        if (display == null || display.isBlank()) {
            display = email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length());
        }
        account.setDisplayName(display.trim().length() > 80 ? display.trim().substring(0, 80) : display.trim());
        account.setGoogleSubject(subject);
        account.setPictureUrl(pictureUrl);
        account.setEmailVerifiedAt(now);
        // The Google button is shown with the notice that continuing accepts the Terms and Privacy Policy.
        account.setTermsAcceptedAt(now);
        account.setTermsVersion(properties.getAccount().getTermsVersion());
        account.setPasswordChangedAt(now);
        account.setLastLoginAt(now);
        account = accounts.saveAndFlush(account);
        auditService.record("ACCOUNT_REGISTERED_GOOGLE", "USER_ACCOUNT", account.getId(), null);
        return new GoogleSignInResult(account, true);
    }

    /** The member who signed in with Google, and whether this sign-in created the account (to greet them). */
    public record GoogleSignInResult(UserAccount account, boolean created) {
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
        account.setMobile(mobileDigits(r.mobile()));
        return toDto(accounts.saveAndFlush(account));
    }

    // --- deletion ------------------------------------------------------------------------------------------------------

    /**
     * Deletes the account after re-authentication; the caller ends all of its sessions. The email address must be typed
     * and the session must have signed in with Google within {@code app.account.recent-sign-in}.
     */
    @Transactional
    public void deleteAccount(long accountId, String confirmEmail, Instant signedInAt) {
        UserAccount account = require(accountId);
        if (!account.getEmail().equals(normaliseEmail(confirmEmail))) {
            throw new BusinessValidationException("confirmEmail", "type the email address of this account");
        }
        Instant cutoff = Instant.now(clock).minus(properties.getAccount().getRecentSignIn());
        if (signedInAt == null || signedInAt.isBefore(cutoff)) {
            throw new AccountException(HttpStatus.FORBIDDEN, "REAUTH_REQUIRED", "For your security, sign in with Google "
                    + "again, then delete the account within " + minutes(properties.getAccount().getRecentSignIn()) + ".");
        }
        String email = account.getEmail();
        accounts.delete(account);
        auditService.record("ACCOUNT_DELETED", "USER_ACCOUNT", accountId, null);
        mail.send(email, "Your SchoolDhundo account was deleted",
                "Your SchoolDhundo account and the information saved with it have been deleted.");
    }

    // --- helpers -------------------------------------------------------------------------------------------------------

    private UserAccount require(long accountId) {
        return accounts.findById(accountId).orElseThrow(() ->
                new AccountException(HttpStatus.UNAUTHORIZED, "NOT_SIGNED_IN", "Please sign in again."));
    }

    private static AccountDto toDto(UserAccount a) {
        return new AccountDto(a.getEmail(), a.getDisplayName(), a.isVerified(), a.getStateCode(), a.getCity(),
                a.getCreatedAt(), a.getTermsVersion(), a.getGoogleSubject() != null, a.getMobile(),
                a.getPictureUrl());
    }

    /** Google's profile photo address, kept only when it is an https address on Google's own image host. */
    static String googlePicture(String url) {
        if (url == null || url.isBlank() || url.length() > 500) {
            return null;
        }
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && host != null && host.endsWith(".googleusercontent.com") ? uri.toString() : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** The ten digits of an already validated number, without a +91 prefix or separators; null when none was given. */
    private static String mobileDigits(String mobile) {
        if (mobile == null || mobile.isBlank()) return null;
        String digits = mobile.replaceAll("\\D", "");
        return digits.substring(digits.length() - 10);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String minutes(Duration d) {
        long m = d.toMinutes();
        return m == 1 ? "1 minute" : m + " minutes";
    }
}
