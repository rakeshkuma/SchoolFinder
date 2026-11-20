package com.indiaschoolfinder.notifications.opportunity;

import com.indiaschoolfinder.entity.SiteUpdate;

import java.time.LocalDate;

/**
 * Where an admission or job opening stands today, worked out on every request from the dates the official source gave
 * (never stored, so it is never stale). Admissions read OPEN as "Applications open" and OPENING_SOON as "Opening soon";
 * jobs read them as "Apply now" and "Upcoming".
 *
 * <p>A notice whose source gave no last date is DATE_NOT_ANNOUNCED: it is neither assumed open nor assumed closed.
 * Later steps of a recruitment or admission (results, admit cards, schedules, corrigenda) have no status of their own.
 */
public enum ApplicationStatus {
    OPEN, OPENING_SOON, CLOSING_SOON, CLOSED, DATE_NOT_ANNOUNCED;

    /** Days before the last date when an opening is "closing soon" (the same window as the feed's badge). */
    public static final int CLOSING_SOON_DAYS = 14;

    public static ApplicationStatus of(SiteUpdate.Category category, SiteUpdate.NoticeType type, LocalDate opensOn,
                                       LocalDate closesOn, LocalDate today) {
        if (category != SiteUpdate.Category.ADMISSION && category != SiteUpdate.Category.JOB) {
            return null;
        }
        if (type != null && type != SiteUpdate.NoticeType.OPENING && type != SiteUpdate.NoticeType.EXTENSION) {
            return null;
        }
        if (closesOn != null && closesOn.isBefore(today)) {
            return CLOSED;
        }
        if (opensOn != null && opensOn.isAfter(today)) {
            return OPENING_SOON;
        }
        if (closesOn != null) {
            return closesOn.isAfter(today.plusDays(CLOSING_SOON_DAYS)) ? OPEN : CLOSING_SOON;
        }
        return DATE_NOT_ANNOUNCED;
    }

    public static ApplicationStatus of(SiteUpdate u, LocalDate today) {
        return of(u.getCategory(), u.getNoticeType(), u.getOpensOn(), u.getClosesOn(), today);
    }

    /** True while applications can still be made, as far as the official dates say. */
    public boolean active() {
        return this == OPEN || this == CLOSING_SOON || this == OPENING_SOON;
    }

    /** The words the site shows for this status. */
    public String label(SiteUpdate.Category category) {
        boolean job = category == SiteUpdate.Category.JOB;
        return switch (this) {
            case OPEN -> job ? "Apply now" : "Applications open";
            case OPENING_SOON -> job ? "Upcoming" : "Opening soon";
            case CLOSING_SOON -> "Closing soon";
            case CLOSED -> job ? "Closed" : "Closed";
            case DATE_NOT_ANNOUNCED -> "Last date not announced";
        };
    }
}
