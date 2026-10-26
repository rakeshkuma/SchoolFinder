package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.submission.SubmissionReviewRequest;
import com.indiaschoolfinder.dto.submission.UpdateSubmissionDto;
import com.indiaschoolfinder.dto.submission.UpdateSubmissionRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolUpdateSubmission;
import com.indiaschoolfinder.enums.SubmissionStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SchoolUpdateSubmissionRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Suggested updates from schools and parents. Submissions are a queue for editors, not data: nothing is published until
 * an editor has checked the cited official page and applied the change with the sourced admin tools.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class UpdateSubmissionService {

    private final SchoolUpdateSubmissionRepository repository;
    private final SchoolRepository schoolRepository;
    private final AuditService auditService;
    private final AuditorAware<String> auditorAware;
    private final Clock clock;

    public UpdateSubmissionService(SchoolUpdateSubmissionRepository repository, SchoolRepository schoolRepository,
                                   AuditService auditService, AuditorAware<String> auditorAware, Clock clock) {
        this.repository = repository;
        this.schoolRepository = schoolRepository;
        this.auditService = auditService;
        this.auditorAware = auditorAware;
        this.clock = clock;
    }

    /** Stores a suggestion for an active school. A filled honeypot is accepted silently and discarded (bots only). */
    @Transactional
    public void submit(Long schoolId, UpdateSubmissionRequest r) {
        schoolRepository.findByIdAndActiveTrue(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        if (r.website() != null && !r.website().isBlank()) {
            log.info("Discarded an update submission for school {} (honeypot filled)", schoolId);
            return;
        }
        String message = InputSanitizer.clean(r.message());
        if (message == null || message.length() < 20) {
            throw new BusinessValidationException("message", "describe the update in at least 20 characters");
        }
        SchoolUpdateSubmission s = new SchoolUpdateSubmission();
        s.setSchoolId(schoolId);
        s.setTopic(r.topic());
        s.setMessage(message);
        s.setSourceUrl(r.sourceUrl().trim());
        s.setRole(r.role());
        s.setContactEmail(r.contactEmail() == null || r.contactEmail().isBlank() ? null : r.contactEmail().trim().toLowerCase(Locale.ROOT));
        repository.save(s);
    }

    public PageResponse<UpdateSubmissionDto> list(SubmissionStatus status, int page, int size) {
        Page<SchoolUpdateSubmission> result = repository.findByStatusOrderByCreatedAtAscIdAsc(status, PageRequest.of(page, size));
        Map<Long, School> schools = schoolRepository.findAllById(result.getContent().stream().map(SchoolUpdateSubmission::getSchoolId).toList())
                .stream().collect(Collectors.toMap(School::getId, Function.identity()));
        return PageResponse.of(result, result.getContent().stream().map(s -> toDto(s, schools.get(s.getSchoolId()))).toList());
    }

    public long countNew() {
        return repository.countByStatus(SubmissionStatus.NEW);
    }

    /** Closes a submission; the reply e-mail is erased at this point because it is no longer needed. */
    @Transactional
    public UpdateSubmissionDto review(Long id, SubmissionReviewRequest r) {
        if (r.status() == SubmissionStatus.NEW) {
            throw new BusinessValidationException("status", "a review must accept or reject the submission");
        }
        SchoolUpdateSubmission s = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Submission", id));
        s.setStatus(r.status());
        s.setReviewerNote(InputSanitizer.clean(r.note()));
        s.setReviewedBy(auditorAware.getCurrentAuditor().orElse("system"));
        s.setReviewedAt(Instant.now(clock));
        s.setContactEmail(null);
        repository.saveAndFlush(s);
        auditService.record("UPDATE_SUBMISSION_" + r.status(), "SCHOOL", s.getSchoolId(), "submission=" + id + ", topic=" + s.getTopic());
        return toDto(s, schoolRepository.findById(s.getSchoolId()).orElse(null));
    }

    private static UpdateSubmissionDto toDto(SchoolUpdateSubmission s, School school) {
        return new UpdateSubmissionDto(s.getId(), s.getSchoolId(), school == null ? null : school.getName(),
                school == null ? null : school.getSlug(), s.getTopic(), s.getMessage(), s.getSourceUrl(), s.getRole(),
                s.getContactEmail(), s.getStatus(), s.getReviewerNote(), s.getReviewedBy(), s.getReviewedAt(), s.getCreatedAt());
    }
}
