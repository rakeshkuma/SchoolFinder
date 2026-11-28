package com.indiaschoolfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.List;

/**
 * The JNVST Mental Ability page ({@value #PATH}): the test's five question types with a worked example of each, the
 * practice papers, how to use the official NVS paper, and the questions parents ask. Its content is one JSON file built by
 * tools/practice/jnvst/mental-ability-page.mjs, which writes the same file for the app (frontend/src/content/
 * jnvstMentalAbility.json), so the page head, the HTML sent to crawlers and the app say the same thing.
 *
 * <p>Searched as "navodaya mental ability question paper" (22,200 a month in India, SEO difficulty 12), "navodaya mental
 * ability test" (9,900) and "navodaya mental ability questions pdf" (9,900) (Ubersuggest, 27 Nov 2026); Search Console
 * showed the site in none of these searches in the 30 days before.
 */
@Service
public class MentalAbilityPage {

    public static final String PATH = "/exams/jnvst/mental-ability";
    static final String RESOURCE = "content/jnvst-mental-ability.json";

    /** A text in English and Hindi. */
    public record Bi(String en, String hi) {
    }

    public record Fact(Bi label, Bi value) {
    }

    /** One of the five parts: its number in Roman, the practice-bank topics it covers and where it sits in each paper. */
    public record Part(String part, List<String> topics, String questions, String paper2026, Bi name, Bi task, Bi tip) {
    }

    public record Shape(String kind, double x, double y, double size, double rotate, boolean filled) {
    }

    public record Figure(String alt, List<Shape> shapes) {
    }

    /** A worked example, written for this page and not in the practice bank, so its answer can be shown. */
    public record Example(String part, String topic, String difficulty, Bi prompt, List<Figure> figure, boolean figureAsksNext,
                          List<Figure> optionFigures, int answer, Bi explanation) {

        public String answerLetter() {
            return String.valueOf((char) ('A' + answer));
        }
    }

    public record Paper(Bi title, Bi note, String url) {
    }

    public record Dropped(Bi name, String questions) {
    }

    /** How the JNVST 2026 paper, set in the earlier ten-part pattern, maps onto the five parts. */
    public record Paper2026(Bi intro, Bi mirrorNote, Bi droppedIntro, List<Dropped> dropped, Bi answerKey) {
    }

    public record Faq(Bi q, Bi a) {
    }

    public record Source(String label, String url) {
    }

    public record Content(String path, LocalDate checkedOn, String title, String description, Bi heading, Bi intro,
                          Source patternSource, List<Fact> facts, List<Part> parts, Bi numberingNote, List<Example> examples,
                          Bi practiceHelp, Bi mocksHelp, Bi originality, List<Paper> officialPapers, Paper2026 paper2026,
                          List<Faq> faq, List<Source> sources) {
    }

    private final Content content;

    public MentalAbilityPage(ObjectMapper objectMapper) {
        this.content = load(objectMapper);
    }

    static Content load(ObjectMapper objectMapper) {
        Content content;
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            content = objectMapper.readValue(in, Content.class);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + RESOURCE, e);
        }
        if (!PATH.equals(content.path()) || content.parts().size() != 5 || content.faq().isEmpty() || content.checkedOn() == null) {
            throw new IllegalStateException(RESOURCE + " is not the Mental Ability page's content");
        }
        return content;
    }

    public Content content() {
        return content;
    }
}
