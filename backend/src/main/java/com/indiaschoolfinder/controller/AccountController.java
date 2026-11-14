package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.account.AccountConfigDto;
import com.indiaschoolfinder.dto.account.AccountDto;
import com.indiaschoolfinder.dto.account.DeleteAccountRequest;
import com.indiaschoolfinder.dto.account.ProfileUpdateRequest;
import com.indiaschoolfinder.security.MemberPrincipal;
import com.indiaschoolfinder.security.MemberSessions;
import com.indiaschoolfinder.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
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
 * Member accounts with server-side sessions. Members sign in with Google only (the redirect flow under
 * /api/v1/account/oauth2); this controller covers the session, the profile and deletion. Every state-changing request
 * needs the CSRF token (cookie XSRF-TOKEN echoed in the X-XSRF-TOKEN header).
 */
@Tag(name = "Account", description = "Member session, profile and deletion; sign-in is with Google")
@RestController
@RequestMapping("/api/v1/account")
public class AccountController {

    private final AccountService accountService;
    private final MemberSessions sessions;
    private final AppProperties properties;

    private final boolean googleSignIn;

    public AccountController(AccountService accountService, MemberSessions sessions, AppProperties properties,
                             ObjectProvider<ClientRegistrationRepository> googleClient) {
        this.accountService = accountService;
        this.sessions = sessions;
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
        return new AccountConfigDto(googleSignIn, properties.getAccount().getTermsVersion());
    }

    @Operation(summary = "End this session and expire its cookie (always succeeds)")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest http, HttpServletResponse response) {
        sessions.signOut(http, response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public AccountDto me(@AuthenticationPrincipal MemberPrincipal member) {
        return accountService.me(member.accountId());
    }

    @PatchMapping("/me")
    public AccountDto update(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody ProfileUpdateRequest request) {
        return accountService.updateProfile(member.accountId(), request);
    }

    @Operation(summary = "Delete the account (its email typed, after a recent Google sign-in); every session ends")
    @DeleteMapping("/me")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal MemberPrincipal member, @Valid @RequestBody DeleteAccountRequest request,
                                       HttpServletRequest http, HttpServletResponse response) {
        accountService.deleteAccount(member.accountId(), request.confirmEmail(), sessions.signedInAt(http));
        sessions.revokeAll(member.accountId(), null);
        sessions.signOut(http, response);
        return ResponseEntity.noContent().build();
    }
}
