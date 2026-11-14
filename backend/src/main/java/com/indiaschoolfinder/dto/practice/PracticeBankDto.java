package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeSet;

import java.util.List;

/**
 * What the question bank holds, without any question text or answers: enough for the practice centre to offer only
 * filter combinations that have questions. Question ids are "set-slug/question-id".
 */
public record PracticeBankDto(int questionCount, List<QuestionMeta> questions) {

    public record QuestionMeta(String id, String setSlug, String examSlug, String level, String section, String topic,
                               String difficulty, PracticeSet.Category category, String chapter, boolean hindi) {
    }
}
