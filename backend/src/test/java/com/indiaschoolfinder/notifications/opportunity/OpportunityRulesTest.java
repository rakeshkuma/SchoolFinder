package com.indiaschoolfinder.notifications.opportunity;

import com.indiaschoolfinder.entity.SiteUpdate.Category;
import com.indiaschoolfinder.entity.SiteUpdate.NoticeType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Dates as notices write them, application status from the official dates, and notice page addresses. */
class OpportunityRulesTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 19);

    @Test
    void datesInTheFormatsNoticesUse() {
        assertThat(DateText.parse("05/11/2026")).isEqualTo(LocalDate.of(2026, 11, 5));
        assertThat(DateText.parse("24-09-2026")).isEqualTo(LocalDate.of(2026, 9, 24));
        assertThat(DateText.parse("16.11.2026")).isEqualTo(LocalDate.of(2026, 11, 16));
        assertThat(DateText.parse("16th Nov, 2026")).isEqualTo(LocalDate.of(2026, 11, 16));
        assertThat(DateText.parse("November 16, 2026")).isEqualTo(LocalDate.of(2026, 11, 16));
        assertThat(DateText.parse("१६.११.२०२६")).isEqualTo(LocalDate.of(2026, 11, 16)); // Devanagari digits
        assertThat(DateText.parse("31/02/2026")).isNull(); // not a real date
        assertThat(DateText.parse("Date: 04-06-2026 | 183.82 KB")).isEqualTo(LocalDate.of(2026, 6, 4));
    }

    @Test
    void statusFollowsOnlyTheOfficialDates() {
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, null, TODAY.plusDays(30), TODAY)).isEqualTo(ApplicationStatus.OPEN);
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, null, TODAY.plusDays(14), TODAY)).isEqualTo(ApplicationStatus.CLOSING_SOON);
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, null, TODAY, TODAY)).isEqualTo(ApplicationStatus.CLOSING_SOON);
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, null, TODAY.minusDays(1), TODAY)).isEqualTo(ApplicationStatus.CLOSED);
        assertThat(ApplicationStatus.of(Category.ADMISSION, NoticeType.OPENING, TODAY.plusDays(5), TODAY.plusDays(40), TODAY))
                .isEqualTo(ApplicationStatus.OPENING_SOON);
        // No last date given: neither open nor closed.
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, null, null, TODAY)).isEqualTo(ApplicationStatus.DATE_NOT_ANNOUNCED);
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.OPENING, TODAY.minusDays(3), null, TODAY))
                .isEqualTo(ApplicationStatus.DATE_NOT_ANNOUNCED);
        // A result has no application window; exams and prep are not opportunities.
        assertThat(ApplicationStatus.of(Category.JOB, NoticeType.RESULT, null, TODAY.plusDays(3), TODAY)).isNull();
        assertThat(ApplicationStatus.of(Category.EXAM, NoticeType.OPENING, null, TODAY.plusDays(3), TODAY)).isNull();
        assertThat(ApplicationStatus.OPEN.label(Category.JOB)).isEqualTo("Apply now");
        assertThat(ApplicationStatus.OPEN.label(Category.ADMISSION)).isEqualTo("Applications open");
        assertThat(ApplicationStatus.OPENING_SOON.label(Category.JOB)).isEqualTo("Upcoming");
    }

    @Test
    void pageAddresses() {
        assertThat(NoticeSlugs.make("Final Result for the Post of TGT ( Social Science) on Regular Basis", "Sainik School Korukonda",
                "recruitment", TODAY, s -> false))
                .isEqualTo("sainik-school-korukonda-final-result-for-the-post-of-tgt-social-science-on-regular-basis");
        // The institution is not repeated when the title names it.
        assertThat(NoticeSlugs.make("Sainik School Korukonda: TGT Maths", "Sainik School Korukonda", "recruitment", TODAY, s -> false))
                .isEqualTo("sainik-school-korukonda-tgt-maths");
        // A Hindi title gives no Latin words: the institution, the kind and the date instead.
        assertThat(NoticeSlugs.make("संविदा शिक्षकों के लिए वॉक-इन-इंटरव्यू", "PM SHRI Kendriya Vidyalaya No. 1 Jalandhar", "recruitment",
                TODAY, s -> false)).isEqualTo("pm-shri-kendriya-vidyalaya-no-1-jalandhar-recruitment-2026-11-19");
        // Taken and reserved addresses get a number.
        Set<String> taken = Set.of("tgt-maths-vacancy", "tgt-maths-vacancy-2");
        assertThat(NoticeSlugs.make("TGT Maths vacancy", null, "recruitment", TODAY, taken::contains)).isEqualTo("tgt-maths-vacancy-3");
        assertThat(NoticeSlugs.make("Guide", null, "admission", TODAY, s -> false)).doesNotContain(" ");
        assertThat(NoticeSlugs.RESERVED).contains("guide", "notifications");
        assertThat(NoticeSlugs.make("x".repeat(30) + " " + "word ".repeat(40), null, "recruitment", TODAY, s -> false).length())
                .isLessThanOrEqualTo(90);
    }
}
