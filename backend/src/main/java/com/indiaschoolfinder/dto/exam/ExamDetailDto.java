package com.indiaschoolfinder.dto.exam;

import java.util.List;

/** Full exam profile: the list fields, the guide content, every recorded date (all cycles) and official notices. */
public record ExamDetailDto(ExamSummaryDto exam, ExamContent content, List<ExamDateDto> dates, List<ExamNoticeDto> notices) {
}
