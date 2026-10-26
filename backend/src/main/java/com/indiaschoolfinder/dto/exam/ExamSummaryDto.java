package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.ExamBoarding;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamMode;
import com.indiaschoolfinder.enums.ExamSchoolType;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.enums.ExamVerificationStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * An exam in lists. {@code status}, {@code applicationDeadline}, {@code examDate} and {@code nextDate} come from the
 * confirmed dates of the current cycle only; {@code currentDates} lists that cycle's dates, tentative ones included.
 */
public record ExamSummaryDto(
        String slug,
        String shortName,
        String name,
        ExamKind kind,
        String conductingAuthority,
        ExamScope scope,
        List<String> stateCodes,
        List<ExamSchoolType> schoolTypes,
        List<Integer> entryClasses,
        String entryClassText,
        ExamBoarding boarding,
        Boolean applicationFree,
        ExamMode examMode,
        String currentCycle,
        String academicSession,
        String summary,
        ExamStatus status,
        LocalDate applicationDeadline,
        LocalDate examDate,
        ExamDateDto nextDate,
        List<ExamDateDto> currentDates,
        int officialPaperCount,
        LocalDate lastVerifiedOn,
        ExamVerificationStatus verificationStatus) {
}
