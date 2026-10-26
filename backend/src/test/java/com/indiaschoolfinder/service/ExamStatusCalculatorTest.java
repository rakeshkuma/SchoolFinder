package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.ExamDate;
import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamDateKind;
import com.indiaschoolfinder.enums.ExamStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ExamStatusCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);

    private static ExamDate date(ExamDateKind kind, LocalDate on, boolean confirmed) {
        ExamDate d = new ExamDate();
        d.setKind(kind);
        d.setStartsOn(on);
        d.setConfirmed(confirmed);
        d.setLabel(kind.name());
        return d;
    }

    @Test
    void noDatesMeansAwaitingNotification() {
        assertThat(ExamStatusCalculator.status(List.of(), TODAY)).isEqualTo(ExamStatus.AWAITING_NOTIFICATION);
        assertThat(ExamStatusCalculator.nextFirm(List.of(), TODAY)).isEmpty();
    }

    @Test
    void tentativeOrMonthOnlyDatesNeverDriveTheStatus() {
        ExamDate tentativeEnd = date(ExamDateKind.APPLICATION_END, TODAY.plusDays(20), false);
        ExamDate monthExam = date(ExamDateKind.EXAM, LocalDate.of(2026, 12, 1), true);
        monthExam.setPrecision(DatePrecision.MONTH);
        List<ExamDate> dates = List.of(tentativeEnd, monthExam);
        assertThat(ExamStatusCalculator.status(dates, TODAY)).isEqualTo(ExamStatus.AWAITING_NOTIFICATION);
        assertThat(ExamStatusCalculator.nextFirm(dates, TODAY)).isEmpty();
    }

    @Test
    void applicationWindowStates() {
        ExamDate start = date(ExamDateKind.APPLICATION_START, TODAY.minusDays(10), true);
        assertThat(ExamStatusCalculator.status(List.of(start, date(ExamDateKind.APPLICATION_END, TODAY.plusDays(20), true)), TODAY))
                .isEqualTo(ExamStatus.APPLICATIONS_OPEN);
        assertThat(ExamStatusCalculator.status(List.of(start, date(ExamDateKind.APPLICATION_END, TODAY.plusDays(7), true)), TODAY))
                .isEqualTo(ExamStatus.DEADLINE_APPROACHING);
        assertThat(ExamStatusCalculator.status(List.of(start, date(ExamDateKind.APPLICATION_END, TODAY, true)), TODAY))
                .isEqualTo(ExamStatus.DEADLINE_APPROACHING);
        assertThat(ExamStatusCalculator.status(List.of(date(ExamDateKind.APPLICATION_START, TODAY.plusDays(3), true),
                date(ExamDateKind.APPLICATION_END, TODAY.plusDays(30), true)), TODAY)).isEqualTo(ExamStatus.APPLICATIONS_OPENING_SOON);
    }

    @Test
    void aLateFeeWindowKeepsApplicationsOpen() {
        ExamDate end = date(ExamDateKind.APPLICATION_END, TODAY.minusDays(2), true);
        ExamDate late = date(ExamDateKind.LATE_APPLICATION_END, TODAY.minusDays(1), true);
        late.setEndsOn(TODAY.plusDays(3));
        assertThat(ExamStatusCalculator.status(List.of(end, late), TODAY)).isEqualTo(ExamStatus.DEADLINE_APPROACHING);
    }

    @Test
    void afterTheDeadlineTheExamDateDecides() {
        ExamDate end = date(ExamDateKind.APPLICATION_END, TODAY.minusDays(30), true);
        ExamDate exam = date(ExamDateKind.EXAM, TODAY.plusDays(40), true);
        assertThat(ExamStatusCalculator.status(List.of(end, exam), TODAY)).isEqualTo(ExamStatus.EXAM_DATE_ANNOUNCED);
        assertThat(ExamStatusCalculator.nextFirm(List.of(end, exam), TODAY)).contains(exam);

        ExamDate pastExam = date(ExamDateKind.EXAM, TODAY.minusDays(1), true);
        assertThat(ExamStatusCalculator.status(List.of(end, pastExam), TODAY)).isEqualTo(ExamStatus.APPLICATIONS_CLOSED);
        // A tentative exam date ahead does not make the exam look scheduled.
        ExamDate tentativeExam = date(ExamDateKind.EXAM, TODAY.plusDays(40), false);
        assertThat(ExamStatusCalculator.status(List.of(end, tentativeExam), TODAY)).isEqualTo(ExamStatus.APPLICATIONS_CLOSED);
    }

    @Test
    void aPublishedResultWins() {
        List<ExamDate> dates = List.of(date(ExamDateKind.APPLICATION_END, TODAY.minusDays(90), true),
                date(ExamDateKind.EXAM, TODAY.minusDays(60), true), date(ExamDateKind.RESULT, TODAY.minusDays(5), true));
        assertThat(ExamStatusCalculator.status(dates, TODAY)).isEqualTo(ExamStatus.RESULT_ANNOUNCED);
    }
}
