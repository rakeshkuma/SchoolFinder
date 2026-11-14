package com.indiaschoolfinder.notifications.source;

import java.util.List;

/**
 * What one source returned: how many entries its listing had in all (relevant or not) and the relevant notices.
 * {@code ignored} counts entries that were not about schools, admissions, exams or teaching jobs (tenders, for example).
 */
public record SourceListing(int listed, List<FoundNotice> notices, int ignored) {
}
