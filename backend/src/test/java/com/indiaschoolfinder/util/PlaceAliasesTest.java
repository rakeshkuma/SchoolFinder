package com.indiaschoolfinder.util;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceAliasesTest {

    @Test
    void otherSpellingsOfAPlaceAreKnownInBothDirections() {
        assertThat(PlaceAliases.othersOf("Arrah")).containsExactlyInAnyOrder("ara", "aarah");
        assertThat(PlaceAliases.othersOf("ara")).containsExactlyInAnyOrder("arrah", "aarah");
        assertThat(PlaceAliases.othersOf("allahabad")).containsExactly("prayagraj");
        assertThat(PlaceAliases.othersOf("delhi")).isEmpty();
    }

    @Test
    void theSiteSpellingIsPreferred() {
        assertThat(PlaceAliases.preferred("Dhanoi")).isEqualTo("dhansoi");
        assertThat(PlaceAliases.preferred("gurgaon")).isEqualTo("gurugram");
        assertThat(PlaceAliases.preferred("sasaram")).isNull();
        assertThat(PlaceAliases.preferred("patna")).isNull();
    }

    @Test
    void noWordBelongsToTwoGroups() {
        // A word in two groups would silently merge two different places.
        Set<String> seen = new HashSet<>();
        assertThat(PlaceAliases.allWords()).allSatisfy(w -> assertThat(seen.add(w)).isTrue());
    }
}
