package com.indiaschoolfinder.enums;

/** Derived from the confirmed, day-precise dates of an exam's current cycle; never set by hand. */
public enum ExamStatus {
    APPLICATIONS_OPEN,
    /** Open, and the last date is within the deadline window. */
    DEADLINE_APPROACHING,
    /** The official application start date is still ahead. */
    APPLICATIONS_OPENING_SOON,
    /** Applications closed and the exam date is ahead. */
    EXAM_DATE_ANNOUNCED,
    APPLICATIONS_CLOSED,
    RESULT_ANNOUNCED,
    /** No confirmed dates have been published for the current cycle. */
    AWAITING_NOTIFICATION
}
