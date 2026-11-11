package com.indiaschoolfinder.support;

import com.indiaschoolfinder.security.MemberSessions;
import com.indiaschoolfinder.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tests only: signs a member in as Google sign-in would (same account rules, same server-side session), without the
 * redirect to Google. GoogleSignInIT covers the real redirect flow end to end.
 */
@Profile("test")
@RestController
public class TestMemberSignIn {

    private final AccountService accounts;
    private final MemberSessions sessions;

    public TestMemberSignIn(AccountService accounts, MemberSessions sessions) {
        this.accounts = accounts;
        this.sessions = sessions;
    }

    @PostMapping("/api/v1/dev/test-member")
    public ResponseEntity<Void> signIn(@RequestParam String email, @RequestParam(defaultValue = "Asha Verma") String name,
                                       HttpServletRequest request, HttpServletResponse response) {
        var result = accounts.signInWithGoogle("test-" + email, email, true, name, null);
        sessions.signIn(request, response, result.account().getId(), false);
        return ResponseEntity.noContent().build();
    }
}
