package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.account.AccountConfigDto;
import com.indiaschoolfinder.dto.account.AccountDto;
import com.indiaschoolfinder.dto.account.ChangePasswordRequest;
import com.indiaschoolfinder.dto.account.DeleteAccountRequest;
import com.indiaschoolfinder.dto.account.EmailRequest;
import com.indiaschoolfinder.dto.account.LoginRequest;
import com.indiaschoolfinder.dto.account.ProfileUpdateRequest;
import com.indiaschoolfinder.dto.account.RegisterRequest;
import com.indiaschoolfinder.dto.account.ResetPasswordRequest;
import com.indiaschoolfinder.dto.account.TokenRequest;
import com.indiaschoolfinder.entity.UserAccount;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.security.MemberSessions;
import com.indiaschoolfinder.security.PasswordPolicy;
import com.indiaschoolfinder.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Member accounts with server-side sessions. Every state-changing request needs the CSRF token (cookie
 * XSRF-TOKEN echoed in the X-XSRF-TOKEN header). Responses that could reveal whether an email is registered are
 * identical either way (202 "check your email").
 */
@Tag(name = "Account", description = "Member sign-up, sign-in, sign-out, verification, password recovery and profile")
@RestController
@RequestMapping("/api/v1/account")
public class AccountController {

    private static final Map<String, String> CHECK_EMAIL = Map.of("status", "check-email");

    private final AccountService accountService;
    private final MemberSessions sessions;
    private final MailService mail;
    private final AppProperties properties;

    private final boolean googleSignIn;

    public AccountController(AccountService accountService, MemberSessions sessions, MailService mail, AppProperties properties,
                             ObjectProvider<ClientRegistrationRepository> googleClient) {
        this.accountService = accountService;
        this.sessions = sessions;
        this.mail = mail;
        this.properties = properties;
        this.googleSignIn = googleClient.getIfAvailable() != null;
    }

    @Operation(summary = "CSRF token for the next state-changing request (also set as the XSRF-TOKEN cookie)")
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @GetMapping("/config")
    public AccountConfigDto config() {
        return new AccountConfigDto(mail.deliveryConfigured(), mail.mode(), googleSignIn, PasswordPolicy.DESCRIPTION,
                properties.getAccount().getTermsVersion());
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        accountService.register(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(CHECK_EMAIL);
    }

    @PostMapping("/verify-email")
    public Map<String, String> verifyEmail(@Valid @RequestBody TokenRequest request) {
        accountService.verifyEmail(request.token());
        return Map.of("status", "verified");
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resend(@Valid @RequestBody EmailRequest request) {
        accountService.resendVerification(request.email());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(CHECK_EMAIL);
    }

    @PostMapping("/login")
    public AccountDto login(@Valid @RequestBody LoginRequest request, HttpServletRequest http, HttpServletResponse response) {
        UserAccount account = accountService.authenticate(request.email(), request.password());
        sessions.signIn(http, response, account.getId(), request.rememberMe());
        return accountService.me(account.getId());
    }

    @Operation(summary = "End this session and expire its cookie (always succeeds)")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest http, HttpServletResponse response) {
        sessions.signOut(http, response);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody EmailRequest request) {
        accountService.requestPasswordReset(request.email());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(CHECK_EMAIL);
    }

    @Operation(summary = "Set a new password with an emailed link; ends every session of the account")
    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest http,
                                     HttpServletResponse response) {
        long accountId = accountService.resetPassword(request.token(), request.newPassword());
        sessions.revokeAll(accountId, null);
        sessions.signOut(http, response);
        return Map.of("status", "password-reset");
    }

    @GetMapping("/me")
    public AccountDto me(@AuthenticationPrincipal MemberPrincipal member) {
        return accountService.me(member.accountId());
    }

    @PatchMapping("/me")
    public AccountDto update(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody ProfileUpdateRequest request) {
        return accountService.updateProfile(member.accountId(), request);
    }

    @Operation(summary = "Change password (current password required); other sessions are signed out")
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal MemberPrincipal member,
                                               @Valid @RequestBody ChangePasswordRequest request, HttpServletRequest http) {
        accountService.changePassword(member.accountId(), request.currentPassword(), request.newPassword());
        // Revoke the others while the stored id still matches this session, then give this one a new id.
        sessions.revokeAll(member.accountId(), http.getSession().getId());
        sessions.rotate(http);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Delete the account (password, or for Google-only accounts the email and a recent sign-in); every session ends")
    @DeleteMapping("/me")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody DeleteAccountRequest request,
                                       HttpServletRequest http, HttpServletResponse response) {
        accountService.deleteAccount(member.accountId(), request.password(), request.confirmEmail(), sessions.signedInAt(http));
        sessions.revokeAll(member.accountId(), null);
        sessions.signOut(http, response);
        return ResponseEntity.noContent().build();
    }
}
