package com.indiaschoolfinder.dto.practice;

import java.util.List;

/** A set ready to attempt: questions and options only — answers and explanations stay on the server until scoring. */
public record PracticeSetDto(PracticeSetSummaryDto set, List<PracticeContent.Passage> passages, List<QuestionDto> questions) {

    public record QuestionDto(String id, String section, String topic, String passageId, String prompt, List<String> options,
                              List<PracticeContent.Figure> figure, boolean figureAsksNext,
                              List<PracticeContent.Figure> optionFigures) {
    }
}
