package com.indiaschoolfinder.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AffiliationLevelsTest {

    @Test
    void readsTheHighestClassFromTheCbseLevelInTheDescription() {
        String listed = "Listed by CBSE as \"X\" (affiliation no. 1). ";
        assertThat(AffiliationLevels.highestClass(listed + "CBSE affiliation level: Senior Secondary (up to Class XII).")).isEqualTo("Class XII");
        assertThat(AffiliationLevels.highestClass(listed + "CBSE affiliation level: Secondary (up to Class X).")).isEqualTo("Class X");
        // SARAS spells the middle level "Middle Class"; older imports kept that text.
        assertThat(AffiliationLevels.highestClass(listed + "CBSE affiliation level: Middle Class.")).isEqualTo("Class VIII");
        assertThat(AffiliationLevels.highestClass("A school with no stated level.")).isNull();
        assertThat(AffiliationLevels.highestClass(null)).isNull();
    }
}
