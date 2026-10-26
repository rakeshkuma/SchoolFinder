package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.ExamVerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Records that an editor re-checked the exam against its official sources on {@code checkedOn}. */
public record ExamVerifyRequest(@NotNull ExamVerificationStatus status, @NotNull @PastOrPresent LocalDate checkedOn,
                                @Size(max = 500) String note) {
}
