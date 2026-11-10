package com.indiaschoolfinder.service;

import com.indiaschoolfinder.repository.UserAccountRepository;
import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class GooglePictureIT extends AbstractIntegrationTest {

    @Autowired
    AccountService accountService;
    @Autowired
    UserAccountRepository accounts;

    @Test
    void firstSignInCreatesTheAccountWithItsPhotoAndLaterOnesRefreshIt() {
        var first = accountService.signInWithGoogle("google-sub-photo-1", "Photo.Member@Example.org", true, "Photo Member",
                "https://lh3.googleusercontent.com/a/first=s96-c");
        assertThat(first.created()).isTrue();
        assertThat(accountService.me(first.account().getId()).pictureUrl()).isEqualTo("https://lh3.googleusercontent.com/a/first=s96-c");

        var again = accountService.signInWithGoogle("google-sub-photo-1", "photo.member@example.org", true, "Photo Member",
                "https://lh3.googleusercontent.com/a/second=s96-c");
        assertThat(again.created()).isFalse();
        assertThat(accounts.findById(first.account().getId()).orElseThrow().getPictureUrl())
                .isEqualTo("https://lh3.googleusercontent.com/a/second=s96-c");
    }

    @Test
    void onlyGooglesOwnImageHostIsKept() {
        assertThat(AccountService.googlePicture("https://lh3.googleusercontent.com/a/x=s96-c")).isNotNull();
        assertThat(AccountService.googlePicture("http://lh3.googleusercontent.com/a/x")).isNull();
        assertThat(AccountService.googlePicture("https://evil.example.com/googleusercontent.com/x")).isNull();
        assertThat(AccountService.googlePicture("https://googleusercontent.com.evil.example/x")).isNull();
        assertThat(AccountService.googlePicture("javascript:alert(1)")).isNull();
        assertThat(AccountService.googlePicture("https://lh3.googleusercontent.com/" + "a".repeat(600))).isNull();
        assertThat(AccountService.googlePicture(null)).isNull();
    }
}
