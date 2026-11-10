package com.indiaschoolfinder.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleSignInHandlerTest {

    @Test
    void welcomeFlagGoesIntoTheQueryBeforeAnyFragment() {
        assertThat(GoogleSignInHandler.withWelcome("/account")).isEqualTo("/account?welcome=1");
        assertThat(GoogleSignInHandler.withWelcome("/exams?tab=dates")).isEqualTo("/exams?tab=dates&welcome=1");
        assertThat(GoogleSignInHandler.withWelcome("/privacy#accounts")).isEqualTo("/privacy?welcome=1#accounts");
    }
}
