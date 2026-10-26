package com.indiaschoolfinder.entity;

import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamDateKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/** One dated step of an exam cycle. {@code confirmed} means an official notice states it; otherwise it is tentative. */
@Getter
@Setter
@Entity
@Table(name = "exam_date")
public class ExamDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long examId;

    @Column(nullable = false, length = 40)
    private String cycle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExamDateKind kind;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false)
    private LocalDate startsOn;

    private LocalDate endsOn;

    @Enumerated(EnumType.STRING)
    @Column(name = "date_precision", nullable = false, length = 10)
    private DatePrecision precision = DatePrecision.DAY;

    @Column(nullable = false)
    private boolean confirmed;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Column(nullable = false)
    private int sortOrder;

    /** The last day of the step: the end of a range, otherwise the date itself. */
    public LocalDate lastDay() {
        return endsOn != null ? endsOn : startsOn;
    }

    /** Only confirmed, day-precise dates may drive statuses, countdowns and reminders. */
    public boolean isFirm() {
        return confirmed && precision == DatePrecision.DAY;
    }
}
