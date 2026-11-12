package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.admission.EnquiryDtos;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.entity.AdmissionEnquiry;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mail.MailService;
import com.indiaschoolfinder.repository.AdmissionEnquiryRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Admission enquiries. An enquiry is saved first, so the parent is told it arrived only when it has; an email to the
 * site's inbox is a convenience that may fail or not be configured. Nothing is sent to the school automatically: staff
 * forward it, as the parent agreed. Closing an enquiry removes the parent's contact details.
 */
@Service
public class EnquiryService {

    private static final Logger log = LoggerFactory.getLogger(EnquiryService.class);

    private final AdmissionEnquiryRepository enquiries;
    private final SchoolService schools;
    private final SchoolRepository schoolRepository;
    private final MailService mail;
    private final AuditService audit;
    private final AppProperties properties;
    private final Clock clock;

    public EnquiryService(AdmissionEnquiryRepository enquiries, SchoolService schools, SchoolRepository schoolRepository,
                          MailService mail, AuditService audit, AppProperties properties, Clock clock) {
        this.enquiries = enquiries;
        this.schools = schools;
        this.schoolRepository = schoolRepository;
        this.mail = mail;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    /** A filled honeypot is accepted silently and discarded. The school must be listed. */
    public void submit(long schoolId, EnquiryDtos.EnquiryRequest r) {
        SchoolDetailDto school = schools.getActiveById(schoolId);
        if (r.website() != null && !r.website().isBlank()) {
            log.info("Discarded an admission enquiry (honeypot filled)");
            return;
        }
        AdmissionEnquiry e = new AdmissionEnquiry();
        e.setSchoolId(school.id());
        e.setParentName(r.parentName().strip());
        e.setPhone(normalisePhone(r.phone()));
        e.setEmail(r.email() == null || r.email().isBlank() ? null : r.email().strip());
        e.setClassCode(r.classCode().strip());
        e.setAcademicYear(r.academicYear() == null || r.academicYear().isBlank() ? null : r.academicYear().strip());
        e.setMessage(r.message() == null || r.message().isBlank() ? null : r.message().strip());
        e.setConsentedAt(Instant.now(clock));
        e = enquiries.save(e);
        notifyInbox(e, school);
    }

    /** "+91 98765-43210", "098765 43210" and "9876543210" all become "9876543210". */
    static String normalisePhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        return digits.substring(digits.length() - 10);
    }

    private void notifyInbox(AdmissionEnquiry e, SchoolDetailDto school) {
        String inbox = properties.getContactInbox();
        if (inbox == null || inbox.isBlank() || !mail.deliveryConfigured()) return;
        try {
            mail.send(inbox, "[SchoolDhundo] Admission enquiry: " + school.name() + ", " + e.getClassCode(),
                    "School: " + school.name() + " (" + school.slug() + ")\nClass: " + e.getClassCode()
                            + (e.getAcademicYear() == null ? "" : " for " + e.getAcademicYear())
                            + "\nParent: " + e.getParentName() + "\nPhone: " + e.getPhone()
                            + (e.getEmail() == null ? "" : "\nEmail: " + e.getEmail())
                            + (e.getMessage() == null ? "" : "\n\n" + e.getMessage())
                            + "\n\nThe parent agreed to these details being shared with the school. Manage it under Admin › Enquiries.");
        } catch (RuntimeException ex) {
            log.warn("Could not email admission enquiry {}; it is saved for staff", e.getId());
        }
    }

    public PageResponse<EnquiryDtos.EnquiryRow> list(AdmissionEnquiry.Status status, int page, int size) {
        Page<AdmissionEnquiry> p = enquiries.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size));
        Map<Long, School> names = schoolRepository.findAllById(p.getContent().stream().map(AdmissionEnquiry::getSchoolId).distinct().toList())
                .stream().collect(Collectors.toMap(School::getId, Function.identity()));
        return PageResponse.of(p, e -> row(e, names.get(e.getSchoolId())));
    }

    @Transactional
    public EnquiryDtos.EnquiryRow changeStatus(long id, EnquiryDtos.StatusChange change) {
        AdmissionEnquiry e = enquiries.findById(id).orElseThrow(() -> new ResourceNotFoundException("Admission enquiry", id));
        var auth = SecurityContextHolder.getContext().getAuthentication();
        e.setStatus(change.status());
        if (change.note() != null) {
            e.setStaffNote(change.note().isBlank() ? null : change.note().strip());
        }
        e.setUpdatedAt(Instant.now(clock));
        e.setHandledBy(auth == null ? "system" : auth.getName());
        if (change.status() == AdmissionEnquiry.Status.CLOSED) {
            e.setParentName(null);
            e.setPhone(null);
            e.setEmail(null);
            e.setMessage(null);
        }
        audit.record("ADMISSION_ENQUIRY_" + change.status(), "ADMISSION_ENQUIRY", id, null);
        return row(e, schoolRepository.findById(e.getSchoolId()).orElse(null));
    }

    private static EnquiryDtos.EnquiryRow row(AdmissionEnquiry e, School s) {
        return new EnquiryDtos.EnquiryRow(e.getId(), e.getSchoolId(), s == null ? null : s.getName(), s == null ? null : s.getSlug(),
                e.getParentName(), e.getPhone(), e.getEmail(), e.getClassCode(), e.getAcademicYear(), e.getMessage(), e.getStatus(),
                e.getStaffNote(), e.getCreatedAt(), e.getUpdatedAt(), e.getHandledBy());
    }
}
