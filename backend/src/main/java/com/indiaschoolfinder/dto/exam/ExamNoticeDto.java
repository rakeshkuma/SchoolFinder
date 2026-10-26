package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.ExamNoticeKind;

import java.time.LocalDate;

public record ExamNoticeDto(String examSlug, String examShortName, String cycle, ExamNoticeKind kind, String title,
                            LocalDate publishedOn, String url) {
}
