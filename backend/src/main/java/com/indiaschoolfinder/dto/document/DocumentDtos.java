package com.indiaschoolfinder.dto.document;

import com.indiaschoolfinder.enums.DocumentStatus;
import com.indiaschoolfinder.enums.ExtractionMethod;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

/** Official notices uploaded for review (PDF or image), their extracted text and the reviewer's decision. */
public final class DocumentDtos {

    private DocumentDtos() {
    }

    /** sourceUrl is the page that publishes the notice; the file is uploaded alongside, never fetched by the server. */
    public record UploadRequest(
            @NotBlank @Size(max = 300) String title,
            @NotBlank @HttpUrl @Size(max = 600) String sourceUrl,
            Long schoolId,
            @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 60) String examSlug,
            @PastOrPresent LocalDate publishedOn) {
    }

    public record Summary(Long id, String title, String sourceUrl, Long schoolId, String schoolName, String examSlug,
                          LocalDate publishedOn, String fileName, String contentType, long sizeBytes, int pageCount,
                          ExtractionMethod extractionMethod, DocumentStatus status, Instant createdAt, String reviewedBy,
                          Instant reviewedAt) {
    }

    /** {@code ocrAvailable} says whether OCR can be run again on this server. */
    public record Detail(Summary document, String extractedText, String reviewedText, String reviewNote, boolean ocrAvailable) {
    }

    /** VERIFIED needs the checked text; REJECTED needs a reason in the note. */
    public record ReviewRequest(@NotNull DocumentStatus status, @Size(max = 100_000) String reviewedText,
                                @Size(max = 1000) String note) {
    }
}
