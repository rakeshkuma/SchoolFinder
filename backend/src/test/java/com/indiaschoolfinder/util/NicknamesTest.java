package com.indiaschoolfinder.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NicknamesTest {

    @Test
    void acceptsOrdinaryNicknamesInAnyScript() {
        assertThat(Nicknames.problem("Star Learner")).isNull();
        assertThat(Nicknames.problem("तारा_99")).isNull();
        assertThat(Nicknames.problem("Kuttappan")).isNull(); // a real name that contains a word on many slur lists
        assertThat(Nicknames.clean("  Asha   V ")).isEqualTo("Asha V");
    }

    @Test
    void refusesContactDetailsStaffNamesAndSlurs() {
        assertThat(Nicknames.problem("ab")).isNotNull();
        assertThat(Nicknames.problem("call 98765-43210")).contains("phone");
        assertThat(Nicknames.problem("me@mail")).isNotNull();
        assertThat(Nicknames.problem("visit www.site")).contains("web");
        assertThat(Nicknames.problem("The Moderator")).contains("staff");
        assertThat(Nicknames.problem("Ch.utiya")).isNotNull();
    }
}
