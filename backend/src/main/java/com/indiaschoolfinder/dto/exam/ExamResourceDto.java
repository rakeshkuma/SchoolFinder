package com.indiaschoolfinder.dto.exam;

import java.time.LocalDate;
import java.util.List;

/**
 * One learning or official resource of a published exam, derived from its guide. {@code official} is true for files
 * and pages published by the conducting body (linked, never copied); false for this site's own guidance (syllabus and
 * pattern summaries taken from the official notice, preparation plans, checklists, FAQs), which lives on the exam
 * guide at {@code path}. Exactly one of {@code url} (external) and {@code path} (on this site) is set.
 */
public record ExamResourceDto(
        String examSlug,
        String examShortName,
        List<Integer> entryClasses,
        String academicSession,
        Type type,
        String title,
        String detail,
        String year,
        boolean official,
        String url,
        String path,
        LocalDate lastVerifiedOn) {

    public enum Type {
        OFFICIAL_LINK, QUESTION_PAPER, ANSWER_KEY, SAMPLE_PAPER, SYLLABUS, EXAM_PATTERN, PREPARATION_GUIDE,
        DOCUMENT_CHECKLIST, FAQ
    }
}
