package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeSet;

import java.util.List;

/** A practice set in lists: no questions. */
public record PracticeSetSummaryDto(String slug, String examSlug, String title, PracticeSet.Kind kind, String level,
                                    String description, Integer durationMinutes, int questionCount, List<String> sections) {
}
