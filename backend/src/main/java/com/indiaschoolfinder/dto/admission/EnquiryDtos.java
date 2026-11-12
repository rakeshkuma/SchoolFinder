package com.indiaschoolfinder.dto.admission;

import com.indiaschoolfinder.entity.AdmissionEnquiry;
import com.indiaschoolfinder.validation.AcademicYear;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class EnquiryDtos {

    private EnquiryDtos() {
    }

    /**
     * An enquiry from a school's profile. {@code consent} must be true: the parent agrees to the details being shared with
     * that school for this enquiry. {@code website} is a honeypot that people never see or fill.
     */
    public record EnquiryRequest(
            @NotBlank @Size(min = 2, max = 100) String parentName,
            /* an Indian mobile number: 10 digits starting 6 to 9, optionally with +91 or 0 in front */
            @NotBlank @Pattern(regexp = "^(?:\\+91|0)?[\\s-]*[6-9](?:[\\s-]*\\d){9}$", message = "must be a 10-digit mobile number") String phone,
            @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9 -]+$") String classCode,
            @AcademicYear String academicYear,
            @Size(max = 1000) String message,
            @NotNull @AssertTrue(message = "please agree to share your details with the school") Boolean consent,
            @Size(max = 200) String website) {
    }

    /** An enquiry as staff see it; contact details are null once it has been closed. */
    public record EnquiryRow(long id, long schoolId, String schoolName, String schoolSlug, String parentName, String phone,
                             String email, String classCode, String academicYear, String message, AdmissionEnquiry.Status status,
                             String staffNote, Instant createdAt, Instant updatedAt, String handledBy) {
    }

    public record StatusChange(@NotNull AdmissionEnquiry.Status status, @Size(max = 500) String note) {
    }
}
