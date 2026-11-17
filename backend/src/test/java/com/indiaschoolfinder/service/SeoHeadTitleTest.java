package com.indiaschoolfinder.service;

import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Title length (Google shows about 60 characters) and the network page addresses. */
class SeoHeadTitleTest {

    @Test
    void keepsTheSiteNameOnlyWhileTheTitleFitsInSixtyCharacters() {
        assertThat(SeoHeadService.fitTitle("Schools in Bihar | SchoolDhundo")).isEqualTo("Schools in Bihar | SchoolDhundo");
        // 66 characters with the suffix: Ubersuggest flagged these as too long; the place and topic are what matter.
        assertThat(SeoHeadService.fitTitle("Best Schools in Dehradun: Rankings & School Lists | SchoolDhundo"))
                .isEqualTo("Best Schools in Dehradun: Rankings & School Lists");
        // A title without the suffix is never cut.
        String long_ = "A".repeat(80);
        assertThat(SeoHeadService.fitTitle(long_)).isEqualTo(long_);
        assertThat(SeoHeadService.DEFAULT_TITLE.length()).isLessThanOrEqualTo(SeoHeadService.TITLE_MAX);
    }

    @Test
    void profileTitlesFitBySheddingTheSchemePrefixThenTheTopicThenNetworkWords() {
        String admissions = ": Admissions & Details";
        // Short enough as it is: unchanged, with the site name.
        assertThat(SeoHeadService.schoolTitle("Delhi Public School R. K. Puram", null, "", ": Fees, Admissions & Details"))
                .isEqualTo("Delhi Public School R. K. Puram: Fees, Admissions & Details | SchoolDhundo");
        assertThat(SeoHeadService.schoolTitle("Sainik School Amethi", "Amethi", "", admissions))
                .isEqualTo("Sainik School Amethi: Admissions & Details | SchoolDhundo");
        // "PM SHRI School" goes first (the record and the heading keep it), then the topic.
        assertThat(SeoHeadService.schoolTitle("PM SHRI School Jawahar Navodaya Vidyalaya Sukma", "Sukma", "", admissions))
                .isEqualTo("Jawahar Navodaya Vidyalaya Sukma: Admissions & Details | SchoolDhundo");
        assertThat(SeoHeadService.schoolTitle("PM SHRI School Jawahar Navodaya Vidyalaya, Birauli, Samastipur", "Samastipur", "", admissions))
                .isEqualTo("Jawahar Navodaya Vidyalaya, Birauli, Samastipur | SchoolDhundo");
        assertThat(SeoHeadService.schoolTitle("Jawahar Navodaya Vidyalaya, Chendayad", "Kannur", "", admissions))
                .isEqualTo("Jawahar Navodaya Vidyalaya, Chendayad, Kannur | SchoolDhundo");
        // Only a name still too long is shortened to the initials people search by (fitTitle then drops the site name).
        assertThat(SeoHeadService.schoolTitle("PM SHRI School Jawahar Navodaya Vidyalaya, Pilla Salki Dam Site Tudipaju. Phulbani, Kandhamal",
                "Kandhamal", "", admissions)).isEqualTo("JNV Pilla Salki Dam Site Tudipaju. Phulbani, Kandhamal | SchoolDhundo");
        assertThat(SeoHeadService.schoolTitle("PM SHRI Kendriya Vidyalaya No. 2 Air Force Station Hindan Ghaziabad Uttar Pradesh",
                "Ghaziabad", "", admissions)).isEqualTo("KV No. 2 Air Force Station Hindan Ghaziabad Uttar Pradesh | SchoolDhundo");
        // The PIN code that tells namesakes apart is always kept; the topic gives way to it.
        assertThat(SeoHeadService.schoolTitle("Calcutta Public School", "Kolkata", " (700159)", ": ICSE/ISC School Details"))
                .isEqualTo("Calcutta Public School, Kolkata (700159) | SchoolDhundo");
        assertThat(SeoHeadService.fitTitle(SeoHeadService.schoolTitle(
                "PM SHRI School Jawahar Navodaya Vidyalaya, Pilla Salki Dam Site Tudipaju. Phulbani, Kandhamal", "Kandhamal", "", admissions)))
                .hasSizeLessThanOrEqualTo(SeoHeadService.TITLE_MAX);
    }

    @Test
    void networkWordsAndTheSchemePrefixAreRecognisedAsRecorded() {
        assertThat(SeoHeadService.withoutSchemePrefix("PM SHRI Kendriya Vidyalaya Andrews Ganj")).isEqualTo("Kendriya Vidyalaya Andrews Ganj");
        assertThat(SeoHeadService.withoutSchemePrefix("PM Shri School Jawahar Navodaya Vidyalaya, Roopvel")).isEqualTo("Jawahar Navodaya Vidyalaya, Roopvel");
        assertThat(SeoHeadService.withoutSchemePrefix("PM SHRI School")).isEqualTo("PM SHRI School");
        assertThat(SeoHeadService.withoutSchemePrefix("Shri Ram School")).isEqualTo("Shri Ram School");
        assertThat(SeoHeadService.networkInitials("Jawahar Navodaya Vidyalaya, Chendayad")).isEqualTo("JNV Chendayad");
        assertThat(SeoHeadService.networkInitials("Jaawahar Navodaya Vidyalaya Mandi")).isEqualTo("JNV Mandi");
        assertThat(SeoHeadService.networkInitials("Jawahar Navodaya Vidayalaya, Amipur")).isEqualTo("JNV Amipur");
        assertThat(SeoHeadService.networkInitials("Kendriya Vidyalaya No. 1 Jammu")).isEqualTo("KV No. 1 Jammu");
        assertThat(SeoHeadService.networkInitials("Kenriya Vidyalaya Ziro")).isEqualTo("KV Ziro");
        assertThat(SeoHeadService.networkInitials("Delhi Public School")).isEqualTo("Delhi Public School");
    }

    @Test
    void districtPagesSayDistrict() {
        assertThat(SeoHeadService.districtName("Patna")).isEqualTo("Patna District");
        assertThat(SeoHeadService.districtName("Mumbai Suburban")).isEqualTo("Mumbai Suburban District");
        assertThat(SeoHeadService.districtName("Leh District")).isEqualTo("Leh District");
    }

    @Test
    void olympiadAddresses() {
        assertThat(OlympiadPages.classNumber("Class V")).isEqualTo(5);
        assertThat(OlympiadPages.classNumber("Class X")).isEqualTo(10);
        assertThat(OlympiadPages.classNumber("Class V–VI")).isZero();
        assertThat(OlympiadPages.classNumber(null)).isZero();
        // The old address, /exams/practice?category=OLYMPIAD with an optional class=5, stands for the new page.
        assertThat(OlympiadPages.addressFor("5")).isEqualTo("/exams/olympiad/class-5");
        assertThat(OlympiadPages.addressFor(null)).isEqualTo("/exams/olympiad");
        assertThat(OlympiadPages.addressFor("13")).isEqualTo("/exams/olympiad");
        assertThat(OlympiadPages.addressFor("5; drop")).isEqualTo("/exams/olympiad");
        var page = new OlympiadPages.ClassPage(9, java.util.List.of(), 40, java.util.List.of("Maths", "Science", "English", "Reasoning", "IOQM-style Maths"));
        assertThat(page.title()).isEqualTo("Class 9 Olympiad Preparation: Maths, Science & English").hasSizeLessThanOrEqualTo(SeoHeadService.TITLE_MAX);
        assertThat(page.description()).isEqualTo("Class 9 Olympiad practice: 40 original questions in Maths, Science, English, Reasoning and "
                + "IOQM-style Maths, with timed mock tests and explained answers.").hasSizeLessThanOrEqualTo(160);
        assertThat(new OlympiadPages.ClassPage(1, java.util.List.of(), 6, java.util.List.of("Reasoning")).description())
                .isEqualTo("Class 1 Olympiad practice: 6 original questions in Reasoning, with explained answers.");
        assertThat(new OlympiadPages.ClassPage(1, java.util.List.of(), 6, java.util.List.of("Reasoning")).title())
                .isEqualTo("Class 1 Olympiad Preparation: Practice Tests");
    }

    @Test
    void descriptionsFitBingsLimitByLeavingOffWholeSentencesFirst() {
        // The home page's own description, which Bing Webmaster Tools flagged at 179 characters, now fits.
        assertThat(SeoHeadService.DEFAULT_DESCRIPTION.length()).isLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        assertThat(SeoHeadService.DEFAULT_TITLE.length()).isLessThanOrEqualTo(50);
        // Short enough: unchanged.
        assertThat(SeoHeadService.fitDescription("Schools in Bihar.")).isEqualTo("Schools in Bihar.");
        // Too long: the last sentence goes, so what remains still ends a sentence.
        String profile = "PM SHRI School Jawahar Navodaya Vidyalaya, Birauli, Samastipur, Samastipur district, Bihar. CBSE school, "
                + "Class VI to Class XII. See admission dates, affiliation number and contact details, with official sources, on SchoolDhundo.";
        assertThat(SeoHeadService.fitDescription(profile)).isEqualTo("PM SHRI School Jawahar Navodaya Vidyalaya, Birauli, Samastipur, "
                + "Samastipur district, Bihar. CBSE school, Class VI to Class XII.");
        // One sentence that is too long by itself is cut at a word, never mid-word.
        String one = "A ".repeat(70) + "sentence with no full stop until the very end of it.";
        String cut = SeoHeadService.fitDescription(one);
        assertThat(cut).hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX).endsWith("…").doesNotContain(" …");
        assertThat(SeoHeadService.fitDescription(null)).isNull();
        // Initials are not sentence ends: a long opening with "R. K." is cut at a word instead of after "R. K.".
        String initials = "Delhi Public School R. K. Puram, " + "Sector 12, ".repeat(15) + "New Delhi. CBSE school.";
        assertThat(SeoHeadService.fitDescription(initials)).startsWith("Delhi Public School R. K. Puram, Sector 12,").endsWith("…")
                .hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
    }

    @Test
    void aBylineIsAPersonWithAJobTitle() {
        var author = SeoHeadService.author("Rakesh Kumar, Editor", "https://schooldhundo.in");
        assertThat(author).containsEntry("@type", "Person").containsEntry("name", "Rakesh Kumar").containsEntry("jobTitle", "Editor")
                .containsEntry("url", "https://schooldhundo.in/about");
        assertThat(SeoHeadService.author("Test Author", "https://schooldhundo.in")).containsEntry("name", "Test Author")
                .doesNotContainKey("jobTitle");
    }

    @Test
    void networkSlugsAreTheEnumNamesInKebabCase() {
        assertThat(SeoHeadService.network("sainik-school")).isEqualTo(SchoolNetwork.SAINIK_SCHOOL);
        assertThat(SeoHeadService.network("jawahar-navodaya-vidyalaya")).isEqualTo(SchoolNetwork.JAWAHAR_NAVODAYA_VIDYALAYA);
        assertThat(SeoHeadService.network("eklavya-model-residential-school")).isEqualTo(SchoolNetwork.EKLAVYA_MODEL_RESIDENTIAL_SCHOOL);
        assertThatThrownBy(() -> SeoHeadService.network("no-such-network")).isInstanceOf(ResourceNotFoundException.class);
        assertThat(SeoHeadService.networkCriteria(SchoolNetwork.KENDRIYA_VIDYALAYA, 5).network()).isEqualTo(SchoolNetwork.KENDRIYA_VIDYALAYA);
        assertThat(SeoHeadService.networkCriteria(SchoolNetwork.KENDRIYA_VIDYALAYA, 5).sortBy()).isEqualTo("recommended");
    }
}
