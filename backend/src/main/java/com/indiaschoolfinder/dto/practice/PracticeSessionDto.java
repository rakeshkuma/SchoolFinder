package com.indiaschoolfinder.dto.practice;

import java.util.List;

/**
 * Questions drawn from the bank for one sitting, without answers. {@code suggestedMinutes} is a time limit the
 * visitor may switch on (about 1.2 minutes a question, close to the AISSEE pace); null for untimed modes.
 */
public record PracticeSessionDto(PracticeMode mode, String title, String description, Integer suggestedMinutes,
                                 List<PracticeContent.Passage> passages, List<PracticeSetDto.QuestionDto> questions) {
}
