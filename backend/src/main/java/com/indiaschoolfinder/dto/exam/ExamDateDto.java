package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamDateKind;

import java.time.LocalDate;

/** {@code confirmed}: stated in an official notice; tentative dates are shown as such and never counted down. */
public record ExamDateDto(String cycle, ExamDateKind kind, String label, LocalDate startsOn, LocalDate endsOn,
                          DatePrecision precision, boolean confirmed, String note, String sourceUrl) {
}
