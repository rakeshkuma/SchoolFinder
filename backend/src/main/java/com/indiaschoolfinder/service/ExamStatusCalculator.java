package com.indiaschoolfinder.service;

import com.indiaschoolfinder.entity.ExamDate;
import com.indiaschoolfinder.enums.ExamDateKind;
import com.indiaschoolfinder.enums.ExamStatus;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Derives an exam's status from the dates of its current cycle. Only confirmed, day-precise dates count: a tentative or
 * month-only date never opens applications, starts a countdown or marks a deadline, and a missing date never makes an
 * exam look upcoming.
 */
public final class ExamStatusCalculator {

    /** Open applications whose last date is this many days away or fewer are "deadline approaching". */
    public static final int DEADLINE_WINDOW_DAYS = 7;

    private ExamStatusCalculator() {
    }

    /** The firm dates of one cycle, resolved once. */
    public record Timeline(LocalDate applicationStart, LocalDate applicationEnd, LocalDate lateApplicationEnd,
                           LocalDate exam, LocalDate result) {

        /** The last day applications are accepted at all, including a late-fee window. */
        public LocalDate lastApplicationDay() {
            return lateApplicationEnd != null ? lateApplicationEnd : applicationEnd;
        }
    }

    public static Timeline timeline(List<ExamDate> cycleDates) {
        return new Timeline(firm(cycleDates, ExamDateKind.APPLICATION_START, false),
                firm(cycleDates, ExamDateKind.APPLICATION_END, true),
                firm(cycleDates, ExamDateKind.LATE_APPLICATION_END, true),
                firm(cycleDates, ExamDateKind.EXAM, false),
                firm(cycleDates, ExamDateKind.RESULT, false));
    }

    public static ExamStatus status(List<ExamDate> cycleDates, LocalDate today) {
        Timeline t = timeline(cycleDates);
        if (t.result() != null && !t.result().isAfter(today)) {
            return ExamStatus.RESULT_ANNOUNCED;
        }
        LocalDate lastDay = t.lastApplicationDay();
        if (t.applicationStart() != null && t.applicationStart().isAfter(today)) {
            return ExamStatus.APPLICATIONS_OPENING_SOON;
        }
        // A confirmed last date ahead with no later start date means the form is live: official notices that give
        // only a last date are issued when applications open.
        if (lastDay != null && !lastDay.isBefore(today)) {
            long days = ChronoUnit.DAYS.between(today, lastDay);
            return days <= DEADLINE_WINDOW_DAYS ? ExamStatus.DEADLINE_APPROACHING : ExamStatus.APPLICATIONS_OPEN;
        }
        if (t.exam() != null && !t.exam().isBefore(today)) {
            return ExamStatus.EXAM_DATE_ANNOUNCED;
        }
        if (lastDay != null || t.exam() != null) {
            return ExamStatus.APPLICATIONS_CLOSED;
        }
        return ExamStatus.AWAITING_NOTIFICATION;
    }

    /** The next firm date on or after today, for countdowns; empty when nothing firm lies ahead. */
    public static Optional<ExamDate> nextFirm(List<ExamDate> cycleDates, LocalDate today) {
        return cycleDates.stream()
                .filter(ExamDate::isFirm)
                .filter(d -> !d.lastDay().isBefore(today))
                .min(Comparator.<ExamDate, LocalDate>comparing(d -> d.getStartsOn().isBefore(today) ? d.lastDay() : d.getStartsOn())
                        .thenComparingInt(ExamDate::getSortOrder));
    }

    private static LocalDate firm(List<ExamDate> dates, ExamDateKind kind, boolean useLastDay) {
        return dates.stream()
                .filter(d -> d.getKind() == kind && d.isFirm())
                .map(d -> useLastDay ? d.lastDay() : d.getStartsOn())
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
