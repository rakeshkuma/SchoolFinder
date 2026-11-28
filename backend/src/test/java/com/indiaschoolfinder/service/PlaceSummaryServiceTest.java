package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.location.PlaceSummaryDto.Count;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.Faq;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.SchoolLink;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** The place summary's sentences: written only from the counts, with the right number and article. */
class PlaceSummaryServiceTest {

    private static PlaceSummaryService.Facts facts(long total, List<Count> boards, List<Count> types, List<Count> networks,
                                                   List<Count> genders, List<SchoolLink> oldest, List<SchoolLink> government) {
        return new PlaceSummaryService.Facts("Dholpur", "Dholpur, Rajasthan", total, boards, types, networks, genders, 0, 0, 0,
                oldest, government);
    }

    private static String answer(List<Faq> faqs, String questionStart) {
        return faqs.stream().filter(f -> f.question().startsWith(questionStart)).map(Faq::answer).findFirst().orElse(null);
    }

    @Test
    void aBoardWithoutAMajorityIsTheLargestGroupNotMost() {
        var f = facts(10, List.of(new Count("CBSE", "CBSE", 4), new Count("STATE", "State board", 3), new Count("CISCE", "ICSE/ISC", 3)),
                List.of(new Count("PRIVATE", "Private (unaided)", 10)), List.of(), List.of(), List.of(), List.of());
        assertThat(answer(PlaceSummaryService.faqs(f), "Which boards"))
                .isEqualTo("The largest group follows CBSE (4 of 10). The others: State board 3 and ICSE/ISC 3.");
        assertThat(PlaceSummaryService.intro(f)).contains("By board: CBSE 4, State board 3 and ICSE/ISC 3.")
                .contains("All are private (unaided) schools.");
    }

    @Test
    void oneSchoolIsDescribedInTheSingular() {
        var f = facts(1, List.of(new Count("CBSE", "CBSE", 1)), List.of(new Count("INTERNATIONAL", "International", 1)), List.of(),
                List.of(), List.of(new SchoolLink("Lone School", "lone-school", 1990)), List.of());
        assertThat(PlaceSummaryService.intro(f)).isEqualTo("SchoolDhundo lists 1 school in Dholpur, Rajasthan, linked to an official"
                + " source such as its board's affiliation record. It is affiliated to CBSE. It is an international school."
                + " It was established in 1990.");
        // No "oldest" question for a single school, and no government school is claimed.
        assertThat(answer(PlaceSummaryService.faqs(f), "Which is the oldest")).isNull();
        assertThat(answer(PlaceSummaryService.faqs(f), "Are there government"))
                .startsWith("No government school in Dholpur is listed on SchoolDhundo yet.");
    }

    @Test
    void governmentSchoolsAreNamedInFullOnlyWhenAllAreShown() {
        var examples = List.of(new SchoolLink("A Govt School", "a", null), new SchoolLink("B Govt School", "b", null),
                new SchoolLink("C Govt School", "c", null));
        var f = facts(20, List.of(new Count("CBSE", "CBSE", 20)),
                List.of(new Count("PRIVATE", "Private (unaided)", 15), new Count("GOVERNMENT", "Government", 5)),
                List.of(new Count("JAWAHAR_NAVODAYA_VIDYALAYA", "Jawahar Navodaya Vidyalaya", 1)), List.of(), List.of(), examples);
        List<Faq> faqs = PlaceSummaryService.faqs(f);
        assertThat(answer(faqs, "Are there government")).isEqualTo("Yes. 5 of the 20 listed schools are government schools, including"
                + " A Govt School, B Govt School and C Govt School. The list includes 1 Jawahar Navodaya Vidyalaya.");
        assertThat(answer(faqs, "How do I apply")).contains("Jawahar Navodaya Vidyalayas admit to Class 6 through the JNVST entrance test.")
                .doesNotContain("Kendriya");
        assertThat(PlaceSummaryService.related(f)).extracting(l -> l.href()).contains("/exams/jnvst").doesNotContain("/exams/aissee");
        // Gender is unknown for these schools: nothing is said about girls' or boys' schools.
        assertThat(answer(faqs, "Are there girls'")).isNull();
    }

    @Test
    void joinWritesListsTheWayASentenceDoes() {
        assertThat(PlaceSummaryService.join(List.of("a"))).isEqualTo("a");
        assertThat(PlaceSummaryService.join(List.of("a", "b"))).isEqualTo("a and b");
        assertThat(PlaceSummaryService.join(List.of("a", "b", "c"))).isEqualTo("a, b and c");
    }
}
