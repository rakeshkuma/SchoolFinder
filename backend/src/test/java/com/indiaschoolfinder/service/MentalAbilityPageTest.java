package com.indiaschoolfinder.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The JNVST Mental Ability page's content (tools/practice/jnvst/mental-ability-page.mjs): the app and the server read the
 * same file, every shown answer is the one its rule gives, and no example is a practice-bank question, whose answers
 * stay on the server until a test is submitted.
 */
class MentalAbilityPageTest {

    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();
    private static final MentalAbilityPage.Content PAGE = MentalAbilityPage.load(MAPPER);

    @Test
    void theAppAndTheServerReadTheSameContent() throws Exception {
        String server = new ClassPathResource(MentalAbilityPage.RESOURCE).getContentAsString(StandardCharsets.UTF_8);
        String app = Files.readString(Path.of("..", "frontend", "src", "content", "jnvstMentalAbility.json"), StandardCharsets.UTF_8);
        assertThat(app.replace("\r\n", "\n")).as("re-run node tools/practice/jnvst/mental-ability-page.mjs")
                .isEqualTo(server.replace("\r\n", "\n"));
    }

    @Test
    void fivePartsEachWithAWorkedExampleAndBilingualText() {
        assertThat(PAGE.parts()).extracting(MentalAbilityPage.Part::part).containsExactly("I", "II", "III", "IV", "V");
        assertThat(PAGE.title().length()).isLessThanOrEqualTo(SeoHeadService.TITLE_MAX);
        assertThat(PAGE.description().length()).isLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        for (MentalAbilityPage.Part part : PAGE.parts()) {
            assertThat(PAGE.examples()).as("Part " + part.part()).anyMatch(e -> e.part().equals(part.part()));
            assertThat(List.of(part.name(), part.task(), part.tip())).allMatch(MentalAbilityPageTest::bilingual);
        }
        // Part IV covers both kinds of image.
        assertThat(PAGE.examples()).extracting(MentalAbilityPage.Example::topic).contains("Mirror image", "Water image");
        for (MentalAbilityPage.Example e : PAGE.examples()) {
            assertThat(e.optionFigures()).hasSize(4);
            assertThat(e.answer()).isBetween(0, 3);
            // The explanation names the figure the key gives, in both languages.
            assertThat(e.explanation().en()).containsIgnoringCase("figure " + e.answerLetter());
            assertThat(e.explanation().hi()).contains("आकृति " + e.answerLetter());
            assertThat(bilingual(e.prompt())).isTrue();
        }
        assertThat(PAGE.faq()).hasSizeGreaterThanOrEqualTo(5)
                .allMatch(f -> bilingual(f.q()) && bilingual(f.a()));
    }

    @Test
    void theShownMirrorWaterAndEmbeddedAnswersFollowTheirRule() {
        for (MentalAbilityPage.Example e : PAGE.examples()) {
            List<MentalAbilityPage.Shape> problem = e.figure().get(0).shapes();
            List<MentalAbilityPage.Shape> answer = e.optionFigures().get(e.answer()).shapes();
            switch (e.topic()) {
                // A mirror on the right edge swaps left and right; still water below swaps top and bottom.
                case "Mirror image" -> assertThat(answer).containsExactlyElementsOf(problem.stream().map(s -> flip(s, true)).toList());
                case "Water image" -> assertThat(answer).containsExactlyElementsOf(problem.stream().map(s -> flip(s, false)).toList());
                // The answer figure holds the problem figure unchanged, among other lines.
                case "Embedded figure" -> assertThat(answer).containsAll(problem);
                default -> {
                }
            }
            // Exactly one option is that figure.
            assertThat(e.optionFigures().stream().filter(f -> f.shapes().equals(answer)).count()).isEqualTo(1);
        }
    }

    @Test
    void noExampleIsAPracticeBankQuestion() throws Exception {
        JsonNode bank = MAPPER.readTree(new ClassPathResource("seed/practice.json").getInputStream());
        Set<String> inBank = new HashSet<>();
        for (JsonNode set : bank.get("sets")) {
            for (JsonNode q : set.get("content").get("questions")) {
                if (q.hasNonNull("optionFigures")) inBank.add(shapes(q));
            }
        }
        assertThat(inBank).hasSizeGreaterThan(100);
        JsonNode page = MAPPER.readTree(new ClassPathResource(MentalAbilityPage.RESOURCE).getInputStream());
        for (JsonNode example : page.get("examples")) {
            assertThat(inBank).as(example.get("topic").asText()).doesNotContain(shapes(example));
        }
    }

    @Test
    void itsOfficialPapersAreTheOnesTheJnvstGuideLists() throws Exception {
        JsonNode exams = MAPPER.readTree(new ClassPathResource("seed/exams.json").getInputStream()).get("exams");
        JsonNode jnvst = StreamSupport.stream(exams.spliterator(), false).filter(x -> "jnvst".equals(x.get("slug").asText()))
                .findFirst().orElseThrow();
        Set<String> listed = new HashSet<>();
        jnvst.get("content").get("papers").forEach(p -> listed.add(p.get("url").asText()));
        assertThat(PAGE.officialPapers()).extracting(MentalAbilityPage.Paper::url).isNotEmpty().allMatch(listed::contains);
        assertThat(PAGE.sources()).extracting(MentalAbilityPage.Source::url).allMatch(listed::contains);
    }

    private static boolean bilingual(MentalAbilityPage.Bi text) {
        return text != null && text.en() != null && !text.en().isBlank() && text.hi() != null && !text.hi().isBlank();
    }

    /** As mat.mjs draws a mirror (sideways) or water image: positions to a tenth, angles in (-180, 180]. */
    private static MentalAbilityPage.Shape flip(MentalAbilityPage.Shape s, boolean sideways) {
        return sideways
                ? new MentalAbilityPage.Shape(s.kind(), round(100 - s.x()), s.y(), s.size(), norm(-s.rotate()), s.filled())
                : new MentalAbilityPage.Shape(s.kind(), s.x(), round(100 - s.y()), s.size(), norm(180 - s.rotate()), s.filled());
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double norm(double a) {
        double d = ((a % 360) + 360) % 360;
        return d > 180 ? d - 360 : d;
    }

    /** A question by its shapes alone (the options in any order), as the page builder compares them. */
    private static String shapes(JsonNode q) {
        List<String> problem = StreamSupport.stream(q.get("figure").spliterator(), false).map(f -> f.get("shapes").toString()).toList();
        List<String> options = StreamSupport.stream(q.get("optionFigures").spliterator(), false).map(f -> f.get("shapes").toString())
                .sorted().toList();
        return problem + "|" + options;
    }
}
