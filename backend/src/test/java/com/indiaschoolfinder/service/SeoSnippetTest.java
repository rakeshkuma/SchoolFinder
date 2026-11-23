package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The snippet fixes of 23 Nov 2026, each made for a page Search Console showed (9-21 Nov 2026): exam guide descriptions,
 * board names, the IB and Cambridge directory views and their explainers, and plain profile links in the feed.
 */
class SeoSnippetTest {

    /** Test fixture shaped like an exam guide; only the fields the description reads matter. */
    private static ExamSummaryDto exam(String shortName, ExamKind kind, String name, String cycle, String authority, ExamStatus status,
                                       LocalDate examDate) {
        return new ExamSummaryDto("fixture-exam", shortName, name, kind, authority, ExamScope.NATIONAL, List.of(), List.of(),
                List.of(6), null, null, true, null, cycle, "2027-28", null, status, null, examDate, null, List.of(), 0, null, null, null);
    }

    private static ExamSummaryDto exam(String name, String cycle, String authority, ExamStatus status, LocalDate examDate) {
        return exam("JNVST", ExamKind.ENTRANCE_TEST, name, cycle, authority, status, examDate);
    }

    private static final String NAME = "Jawahar Navodaya Vidyalaya Selection Test (JNVST) – Class VI";
    private static final String BODY = "Navodaya Vidyalaya Samiti (Ministry of Education)";
    private static final List<String> RULES = List.of("Born between 01.05.2015 and 31.07.2017 (both dates inclusive).");

    @Test
    void examGuideDescriptionOpensWithWhatThePageAnswersAndKeepsTheDate() {
        String d = SeoHeadService.fitDescription(SeoHeadService.examGuideDescription(
                exam(NAME, "JNVST-2027", BODY, ExamStatus.EXAM_DATE_ANNOUNCED, LocalDate.of(2026, 11, 28)), RULES));
        assertThat(d).isEqualTo("JNVST 2027 (Class VI): eligibility, age limit, exam pattern and syllabus from the official notice. "
                + "Exam date: 28 Nov 2026.");
        assertThat(d.length()).isLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        assertThat(d).doesNotContain("…");
    }

    @Test
    void aPassedExamDateIsNeverOfferedAsTheNextOne() {
        ExamSummaryDto held = exam(NAME, "JNVST-2027", BODY, ExamStatus.APPLICATIONS_CLOSED, LocalDate.of(2026, 11, 28));
        assertThat(SeoHeadService.examDateSentence(held, "Selection test")).isEqualTo("Selection test held on 28 Nov 2026.");
        assertThat(SeoHeadService.examDateSentence(exam(NAME, "X", BODY, ExamStatus.RESULT_ANNOUNCED, LocalDate.of(2026, 1, 18)), "Exam"))
                .isEqualTo("Exam held on 18 Jan 2026.");
        assertThat(SeoHeadService.examDateSentence(exam(NAME, "X", BODY, ExamStatus.APPLICATIONS_OPEN, LocalDate.of(2027, 1, 31)), "Exam"))
                .isEqualTo("Exam date: 31 Jan 2027.");
        assertThat(SeoHeadService.examDateSentence(exam(NAME, "X", BODY, ExamStatus.AWAITING_NOTIFICATION, null), "Exam")).isNull();
    }

    @Test
    void examGuideDescriptionSaysAgeLimitOnlyWhereTheRulesSetOne() {
        String noAge = SeoHeadService.examGuideDescription(exam("FX", ExamKind.ENTRANCE_TEST, "Fixture Exam – Class XI", "FX-2027",
                "Fixture Board", ExamStatus.AWAITING_NOTIFICATION, null), List.of("Passed Class 10 from a recognised board."));
        assertThat(noAge).startsWith("FX 2027 (Class XI): eligibility, exam pattern and syllabus from the official notice. "
                + "Dates not announced yet.").doesNotContain("age limit");
        // A cycle label that does not name the exam ("Class IX LEST 2027") lends only its year; the class is not repeated.
        assertThat(SeoHeadService.examGuideDescription(exam("JNV Class IX", ExamKind.ENTRANCE_TEST,
                "Navodaya Vidyalaya Lateral Entry Selection Test – Class IX", "Class IX LEST 2027", "Navodaya Vidyalaya Samiti",
                ExamStatus.EXAM_DATE_ANNOUNCED, LocalDate.of(2027, 4, 10)), List.of("Studying in Class VIII in 2026-27.")))
                .startsWith("JNV Class IX 2027: eligibility, exam pattern and syllabus from the official notice. Exam date: 10 Apr 2027.");
        // An admission process without a test promises no pattern or syllabus.
        assertThat(SeoHeadService.examGuideDescription(exam("KV admission", ExamKind.SELECTION_PROCESS,
                "Kendriya Vidyalaya admission (Class I lottery; Classes II–XI by vacancy, test or marks)", "KVS admission 2027-28",
                "Kendriya Vidyalaya Sangathan", ExamStatus.AWAITING_NOTIFICATION, null), List.of("Class I: at least 6 years old on 31 March.")))
                .startsWith("KV admission 2027-28: eligibility, age limit, dates and admission steps from the official notice.");
        // A long conducting body is the sentence left off, never the date.
        String longBody = SeoHeadService.fitDescription(SeoHeadService.examGuideDescription(exam("AISSEE", ExamKind.ENTRANCE_TEST,
                "All India Sainik Schools Entrance Examination (AISSEE) – Class VI & IX", "AISSEE-2027",
                "National Testing Agency (NTA) for the Sainik Schools Society (Ministry of Defence)", ExamStatus.APPLICATIONS_OPEN,
                LocalDate.of(2027, 1, 31)), List.of("Class VI: 10–12 years as on 31.03.2026.")));
        assertThat(longBody).isEqualTo("AISSEE 2027 (Class VI & IX): eligibility, age limit, exam pattern and syllabus from the official "
                + "notice. Exam date: 31 Jan 2027.");
    }

    @Test
    void boardPagesAreTitledByTheBoardsName() {
        assertThat(SeoHeadService.boardLabel("CAMBRIDGE")).isEqualTo("Cambridge (CAIE)");
        assertThat(SeoHeadService.boardLabel("STATE")).isEqualTo("State board");
        assertThat(SeoHeadService.boardLabel("CISCE")).isEqualTo("ICSE/ISC (CISCE)");
        assertThat(SeoHeadService.boardLabel("CBSE")).isEqualTo("CBSE");
        assertThat(SeoBodyService.shortBoard("CAMBRIDGE")).isEqualTo("Cambridge");
        assertThat(SeoBodyService.shortBoard("IB")).isEqualTo("IB");
    }

    @Test
    void directoryDescriptionsKeepTheirSecondSentence() {
        var ib = new PremierDirectoryDtos.Category("ib-schools", "Best IB Schools",
                "Schools offering International Baccalaureate programmes, such as the IB Diploma.", 31);
        var cambridge = new PremierDirectoryDtos.Category("cambridge-schools", "Best Cambridge Schools",
                "Schools offering Cambridge International qualifications such as IGCSE and A Levels.", 29);
        for (var c : List.of(ib, cambridge)) {
            String d = SeoHeadService.directoryDescription(c);
            assertThat(SeoHeadService.fitDescription(d)).as(c.slug()).isEqualTo(d).contains(c.schools() + " schools with board");
            assertThat(d.length()).as(c.slug()).isLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        }
    }

    @Test
    void guidesCiteOfficialSourcesAndAnswerTheirQuestionsInFull() {
        for (String slug : List.of("ib-schools", "cambridge-schools")) {
            PremierDirectoryDtos.Guide g = DirectoryGuides.forView(slug).orElseThrow();
            assertThat(g.sections()).as(slug).hasSizeGreaterThanOrEqualTo(3);
            assertThat(g.faqs()).as(slug).hasSizeGreaterThanOrEqualTo(3)
                    .allSatisfy(f -> assertThat(f.question()).endsWith("?"))
                    .allSatisfy(f -> assertThat(f.answer()).endsWith("."));
            assertThat(g.sources()).as(slug).isNotEmpty()
                    .allSatisfy(s -> assertThat(s.url()).matches("https://www\\.(ibo|cambridgeinternational)\\.org/.+"));
            assertThat(g.checkedOn()).isEqualTo(LocalDate.of(2026, 11, 23));
            // An explainer, never a rank or a fee figure of SchoolDhundo's.
            String text = g.toString();
            assertThat(text).doesNotContainPattern("₹|Rs\\.? ?\\d|#\\d");
        }
        assertThat(DirectoryGuides.forView("boys-boarding-schools")).isEmpty();
    }

    @Test
    void aProfilesPlaceNamesEachPlaceOnceEvenWhenSpelledTwoWays() {
        assertThat(SeoHeadService.schoolPlace(null, "Hisar", "Hissar", "Haryana")).isEqualTo("Hisar, Haryana");
        assertThat(SeoHeadService.schoolPlace("Sector 5", "BHUJ", "Kachchh", "Gujarat")).isEqualTo("Sector 5, BHUJ, Kachchh, Gujarat");
        assertThat(SeoHeadService.schoolPlace(null, "Bhuj", "BHUJ", "Gujarat")).isEqualTo("Bhuj, Gujarat");
        assertThat(SeoHeadService.schoolPlace("Patna", "Patna", "Patna", "Bihar")).isEqualTo("Patna, Bihar");
        // Different places stay, even when one contains the other.
        assertThat(SeoHeadService.schoolPlace(null, "New Delhi", "South Delhi", "Delhi")).isEqualTo("New Delhi, South Delhi, Delhi");
    }

    @Test
    void feedLinksToAProfileSectionUseThePlainProfileAddress() {
        assertThat(SeoBodyService.plainProfilePath("/schools/dps-rk-puram?tab=admissions")).isEqualTo("/schools/dps-rk-puram");
        assertThat(SeoBodyService.plainProfilePath("/admissions")).isEqualTo("/admissions");
        assertThat(SeoBodyService.plainProfilePath("/exams/jnvst?tab=pattern")).isEqualTo("/exams/jnvst?tab=pattern");
    }
}
