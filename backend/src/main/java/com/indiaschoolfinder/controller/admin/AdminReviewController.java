package com.indiaschoolfinder.controller.admin;

import com.indiaschoolfinder.config.OpenApiConfig;
import com.indiaschoolfinder.dto.common.ApiError;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.document.DocumentDtos.Detail;
import com.indiaschoolfinder.dto.document.DocumentDtos.ReviewRequest;
import com.indiaschoolfinder.dto.document.DocumentDtos.Summary;
import com.indiaschoolfinder.dto.document.DocumentDtos.UploadRequest;
import com.indiaschoolfinder.enums.DocumentStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.service.DocumentReviewService;
import com.indiaschoolfinder.service.DuplicateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Admin: document review and duplicates", description = "Requires ADMIN or EDITOR")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RestController
@RequestMapping("/api/v1/admin")
public class AdminReviewController {

    public record DismissRequest(@NotEmpty @Size(min = 2, max = 10) List<Long> schoolIds, @Size(max = 500) String note) {
    }

    private final DocumentReviewService documents;
    private final DuplicateService duplicates;
    private final Validator validator;

    public AdminReviewController(DocumentReviewService documents, DuplicateService duplicates, Validator validator) {
        this.documents = documents;
        this.duplicates = duplicates;
        this.validator = validator;
    }

    @Operation(summary = "Upload an official notice (PDF, PNG or JPEG, up to 15 MB) for review. Part 'file' is the "
            + "document; part 'metadata' is JSON with title, sourceUrl (where it is published), schoolId, examSlug, publishedOn.")
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Detail upload(@RequestPart("file") MultipartFile file, @RequestPart("metadata") UploadRequest metadata) {
        List<ConstraintViolation<UploadRequest>> violations = List.copyOf(validator.validate(metadata));
        if (!violations.isEmpty()) {
            throw new BusinessValidationException("Validation failed", violations.stream()
                    .map(v -> new ApiError.FieldViolation(v.getPropertyPath().toString(), v.getMessage())).toList());
        }
        return documents.upload(file, metadata);
    }

    @GetMapping("/documents")
    public PageResponse<Summary> list(@RequestParam(required = false) DocumentStatus status,
                                      @RequestParam(required = false) Long schoolId,
                                      @RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return documents.list(status, schoolId, page, size);
    }

    @GetMapping("/documents/{id}")
    public Detail get(@PathVariable Long id) {
        return documents.get(id);
    }

    @Operation(summary = "One page of the document as a PNG image, for checking the text against it")
    @GetMapping(value = "/documents/{id}/pages/{page}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> page(@PathVariable Long id, @PathVariable @Min(1) int page) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG)
                .body(documents.page(id, page).png());
    }

    @Operation(summary = "Save the checked text and the decision (VERIFIED needs the text, REJECTED needs a reason)")
    @PutMapping("/documents/{id}/review")
    public Detail review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return documents.review(id, request);
    }

    @Operation(summary = "Run OCR again on the stored file (only when an OCR engine is configured)")
    @PostMapping("/documents/{id}/ocr")
    public Detail ocr(@PathVariable Long id) {
        return documents.rerunOcr(id);
    }

    @DeleteMapping("/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        documents.delete(id);
    }

    @Operation(summary = "Groups of active schools that may be the same school (same name in a district, phone, map "
            + "position or photo). Suggestions only; pairs dismissed as different are left out.")
    @GetMapping("/duplicates")
    public DuplicateService.Report duplicates() {
        return duplicates.report();
    }

    @Operation(summary = "Record that these schools were checked and are different schools")
    @PostMapping("/duplicates/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismiss(@Valid @RequestBody DismissRequest request) {
        duplicates.dismiss(request.schoolIds(), request.note());
    }
}
