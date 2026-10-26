package com.indiaschoolfinder.util;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class SchoolNamesTest {

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', value = {
            // Real names produced by the SARAS import (with the address appended).
            "Jawahar Navodaya Vidyalaya, Chendayad .|Jawahar Navodaya Vidyalaya, Chendayad",
            "Global Public School, & Phugana|Global Public School, Phugana",
            "Abhinav Vidyalaya, - Parikshitgarh|Abhinav Vidyalaya, Parikshitgarh",
            "Gurukul Public School, & . Kutesra Distric|Gurukul Public School, Kutesra Distric",
            "A.s.m. Convent School ,sukhpura|A.s.m. Convent School, Sukhpura",
            "Army School, Solmara Tezpur Dt-|Army School, Solmara Tezpur",
            "Army Public School, Missamari Dt|Army Public School, Missamari",
            "Jawahar Navodaya Vidyalaya, - Diphu Dt- Karbi Anglong|Jawahar Navodaya Vidyalaya, Diphu Karbi Anglong",
            "Adwaita Mission High School, Mandar Vidyapith Mandar Vidyapith .|Adwaita Mission High School, Mandar Vidyapith",
            "Atomic Energy Central School, Narwapahar Narwapahar Via Sundernagar|Atomic Energy Central School, Narwapahar Via Sundernagar",
            "Adhya Shankarachary Shiksha Sansthan Junior High School.|Adhya Shankarachary Shiksha Sansthan Junior High School",
            "Jawahar Navodaya Vidyalaya, Palair- Vil.paleru Khammam|Jawahar Navodaya Vidyalaya, Palair- Vil.paleru Khammam",
            "Govt Sec School, Melli Bazar Melli Bazar|Govt Sec School, Melli Bazar",
            "Sanskar The Rising School,basna|Sanskar The Rising School, Basna",
    })
    void tidiesAddressArtifacts(String raw, String expected) {
        assertThat(SchoolNames.tidy(raw)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', value = {
            "Adarsh Vidyalalya, Adarsh Nagar, Mowa, Raipur, C.g.",  // abbreviation keeps its dot
            "Dr. Rajendra Prasad Kendriya Vidyalaya, President's Estate",
            "St. Xavier's High School, Patna",
            "Vivekananda Kendra Vidyalaya (NEEPCO)",
            "Atal Utkrasth Vidhyalaya G.i.c. Pabau",                // spelling is never corrected
            "Sainik School Kunjpura",
            "District Public School, Dt Road",                       // 'District' as a word is not a marker
            "PM SHRI Kendriya Vidyalaya No. 2 Delhi Cantt",
            "P P Savani School Of Excellence",                       // repeated initials are part of the name
            "S S Public School, Babatpur",
            "Ess Ess Convent School",                               // a repeated word in the name itself is kept
            "Kendriya Vidyalaya, I I T Campus Tamil Nadu",
            "Lotus National School, Hyderguda Rajendra Nagar .& Xd", // unclear junk is left, not glued on
    })
    void leavesTidyNamesUnchanged(String name) {
        assertThat(SchoolNames.tidy(name)).isEqualTo(name);
    }
}
