package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.exam.ExamDateDto;
import com.indiaschoolfinder.dto.exam.ExamSummaryDto;
import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamDateKind;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Snippet fixes of 25 Nov 2026, from the live pages: the three exam preparation pages lost their date (offer and date came
 * to 161-164 characters), and all 115 practice sets had their description cut mid-sentence with "…".
 */
class PrepAndPracticeSnippetTest {

    private static final String AISSEE = "Free AISSEE (Sainik School) Class 6 mock tests in the 125-question pattern, in English and Hindi.";
    private static final String JNVST = "Free JNVST Class 6 mock tests in the 80-question pattern, in English and Hindi.";
    private static final String NETARHAT = "Free Netarhat Vidyalaya Class 6 mock tests (full Paper 1) and practice in Hindi and English.";

    private static ExamSummaryDto exam(String shortName, String cycle, ExamStatus status, LocalDate deadline, LocalDate examDate,
                                       List<ExamDateDto> dates) {
        return new ExamSummaryDto("fixture", shortName, shortName + " – Class VI", ExamKind.ENTRANCE_TEST, "Authority", ExamScope.NATIONAL,
                List.of(), List.of(), List.of(6), null, null, true, null, cycle, "2027-28", null, status, deadline, examDate, null, dates,
                0, null, null, null);
    }

    private static ExamDateDto result(LocalDate on, DatePrecision precision, boolean confirmed) {
        return new ExamDateDto("cycle", ExamDateKind.RESULT, "Result", on, null, precision, confirmed, null, "https://example.org/notice.pdf");
    }

    @Test
    void whileApplicationsAreOpenTheLastDateAndExamDateLead() {
        var aissee = exam("AISSEE", "AISSEE-2027", ExamStatus.APPLICATIONS_OPEN, LocalDate.of(2026, 12, 2), LocalDate.of(2027, 1, 31), List.of());
        String d = SeoHeadService.prepDescription(aissee, AISSEE, "Entrance exam", LocalDate.of(2026, 11, 25));
        assertThat(d).isEqualTo("AISSEE 2027: apply by 2 Dec 2026; exam on 31 Jan 2027. " + AISSEE)
                .hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        // Once the last date has gone by, the exam date takes over even before the status is recomputed.
        assertThat(SeoHeadService.prepDescription(aissee, AISSEE, "Entrance exam", LocalDate.of(2026, 12, 3)))
                .isEqualTo(AISSEE + " Entrance exam date: 31 Jan 2027.");
    }

    @Test
    void theExamDateStaysInTheDescription() {
        var jnvst = exam("JNVST", "JNVST-2027", ExamStatus.EXAM_DATE_ANNOUNCED, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 11, 28),
                List.of(result(LocalDate.of(2027, 3, 1), DatePrecision.MONTH, false)));
        assertThat(SeoHeadService.prepDescription(jnvst, JNVST, "Selection test", LocalDate.of(2026, 11, 25)))
                .isEqualTo(JNVST + " Selection test date: 28 Nov 2026.");
        var netarhat = exam("Netarhat", "Netarhat 2026-27", ExamStatus.EXAM_DATE_ANNOUNCED, LocalDate.of(2026, 10, 8),
                LocalDate.of(2026, 12, 6), List.of());
        assertThat(SeoHeadService.prepDescription(netarhat, NETARHAT, "Entrance exam", LocalDate.of(2026, 11, 25)))
                .isEqualTo(NETARHAT + " Entrance exam date: 6 Dec 2026.");
    }

    @Test
    void afterTheExamTheExpectedResultFollowsUntilItsMonthHasPassed() {
        var held = exam("JNVST", "JNVST-2027", ExamStatus.APPLICATIONS_CLOSED, LocalDate.of(2026, 7, 31), LocalDate.of(2026, 11, 28),
                List.of(result(LocalDate.of(2027, 3, 1), DatePrecision.MONTH, false)));
        assertThat(SeoHeadService.prepDescription(held, JNVST, "Selection test", LocalDate.of(2026, 11, 29)))
                .isEqualTo(JNVST + " Selection test held on 28 Nov 2026; result expected by end of March 2027.")
                .hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        assertThat(SeoHeadService.prepDescription(held, JNVST, "Selection test", LocalDate.of(2027, 4, 1)))
                .isEqualTo(JNVST + " Selection test held on 28 Nov 2026.");
    }

    @Test
    void aDeclaredResultIsReportedAsDeclared() {
        var declared = exam("AISSEE", "AISSEE-2026", ExamStatus.RESULT_ANNOUNCED, LocalDate.of(2025, 10, 30), LocalDate.of(2026, 1, 18),
                List.of(result(LocalDate.of(2026, 2, 27), DatePrecision.DAY, true)));
        assertThat(SeoHeadService.resultPhrase(declared, LocalDate.of(2026, 3, 10))).isEqualTo("result declared on 27 Feb 2026");
    }

    @Test
    void aLongerWordingGivesWayToOneThatFits() {
        String longOffer = "x".repeat(110) + ".";
        var aissee = exam("AISSEE", "AISSEE-2027", ExamStatus.APPLICATIONS_OPEN, LocalDate.of(2026, 12, 2), LocalDate.of(2027, 1, 31), List.of());
        assertThat(SeoHeadService.prepDescription(aissee, longOffer, "Entrance exam", LocalDate.of(2026, 11, 25)))
                .isEqualTo("AISSEE 2027: apply by 2 Dec 2026. " + longOffer);
    }

    /** First sentences of live sets (25 Nov 2026), each of which was cut with "…". */
    @Test
    void practiceDescriptionsEndOnAWholeThought() {
        String mat = SeoHeadService.practiceDescription("jnvst-mat-1", "20 figure-based questions, four from each of the five parts of the "
                + "official Mental Ability section: pattern completion, figure series, geometrical figure completion, mirror and water images "
                + "and embedded figures. Section 1 of the real paper gives 60 minutes for 40 questions.",
                SeoHeadService.practiceFacts(20, "JNVST", List.of("Mental Ability"), "Class V", 30, true));
        assertThat(mat).isEqualTo("Practice set 1: 20 figure-based questions, four from each of the five parts of the official Mental "
                + "Ability section. " + SeoHeadService.PRACTICE_NOTE);
        String figures = SeoHeadService.practiceDescription("jnvst-figures-1", "Figure series, odd one out, mirror and water images and "
                + "figure analogies — the kinds of non-verbal question in the JNVST Mental Ability Test.", null);
        assertThat(figures).isEqualTo("Practice set 1: Figure series, odd one out, mirror and water images and figure analogies. "
                + SeoHeadService.PRACTICE_NOTE);
        // A long list with no clause break in reach: the set's own facts instead of half a list.
        String maths = SeoHeadService.practiceDescription("jnv-class-9-maths-1", "Rational numbers, linear equations, percentages and "
                + "discounts, exponents, factorisation, identities, polygons, mensuration, proportion, cube roots, probability and averages "
                + "— Class VIII mathematics for Class IX entry.",
                SeoHeadService.practiceFacts(25, "JNV Class IX", List.of("Mathematics"), "Class VIII", 30, false));
        assertThat(maths).isEqualTo("Practice set 1: 25 JNV Class IX Mathematics questions for Class VIII with explained answers, 30 minutes. "
                + SeoHeadService.PRACTICE_NOTE);
        for (String d : List.of(mat, figures, maths)) {
            assertThat(d).doesNotContain("…").hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        }
        assertThat(SeoHeadService.practiceFacts(80, "JNVST", List.of("Mental Ability", "Arithmetic", "Language", "EVS"), "Class V", 120, true))
                .first().isEqualTo("80 JNVST questions in 4 sections for Class V with explained answers, 120 minutes, in English and Hindi.");
    }

    /** Olympiad sets of different classes often have the same counts; the class keeps their descriptions apart. */
    @Test
    void setsOfDifferentClassesNeverShareADescription() {
        String long1 = "x".repeat(130) + ".";
        String classThree = SeoHeadService.practiceDescription("olympiad-class3-maths-1", long1,
                SeoHeadService.practiceFacts(22, "Olympiad", List.of("Mathematics"), "Class III", null, true));
        String classFour = SeoHeadService.practiceDescription("olympiad-class4-maths-1", long1,
                SeoHeadService.practiceFacts(22, "Olympiad", List.of("Mathematics"), "Class IV", null, true));
        assertThat(classThree).isNotEqualTo(classFour).contains("for Class III").hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
        // When the full wording does not fit, a shorter one that still names the exam and class is used, not a cut.
        String tight = SeoHeadService.practiceDescription("x-mock-12", long1,
                SeoHeadService.practiceFacts(100, "EMRSST Odisha", List.of("A", "B", "C", "D", "E"), "Class V–VI", 150, true));
        assertThat(tight).doesNotContain("…").contains("EMRSST Odisha").contains("Class V–VI").hasSizeLessThanOrEqualTo(SeoHeadService.DESCRIPTION_MAX);
    }
}
