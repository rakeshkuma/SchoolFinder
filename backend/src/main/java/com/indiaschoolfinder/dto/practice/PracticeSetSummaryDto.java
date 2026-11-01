package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeSet;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * A practice set in lists: no questions. {@code hindi} is true when every question (and passage) has a Hindi version;
 * {@code chapters} lists the textbook chapters its questions are tagged with.
 */
public record PracticeSetSummaryDto(String slug, String examSlug, String title, PracticeSet.Kind kind, String level,
                                    String description, Integer durationMinutes, int questionCount, List<String> sections,
                                    LocalDate reviewedOn, PracticeSet.Category category, BigDecimal marksPerQuestion,
                                    BigDecimal negativeMarks, boolean hindi, List<String> chapters) {
}
