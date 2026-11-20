package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.entity.SiteUpdatePosition;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.notifications.opportunity.OpportunityClassifier;
import com.indiaschoolfinder.notifications.opportunity.OpportunityEnricher;
import com.indiaschoolfinder.repository.SiteUpdatePositionRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Updates as staff manage them: an editor drafts one, citing its official source, then publishes it; archiving takes it
 * off the site. Updates found by the daily check of official websites arrive published or waiting for review
 * (PENDING_REVIEW); an editor publishes, edits, archives or marks them superseded here. Every change is audited.
 *
 * <p>Admission and job notices also carry their facts (dates, posts, eligibility...), which an editor can enter or
 * correct from the official notice, and the posts a recruitment notice advertises.
 */
@Service
public class SiteUpdateService {

    private final SiteUpdateRepository updates;
    private final SiteUpdatePositionRepository positions;
    private final OpportunityEnricher enricher;
    private final AuditService audit;
    private final Clock clock;

    public SiteUpdateService(SiteUpdateRepository updates, SiteUpdatePositionRepository positions, OpportunityEnricher enricher,
                             AuditService audit, Clock clock) {
        this.updates = updates;
        this.positions = positions;
        this.enricher = enricher;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<UpdateDtos.AdminRow> list(SiteUpdate.Status status, int page, int size) {
        Page<SiteUpdate> rows = updates.findByStatusOrderByPublishedOnDescIdDesc(status, PageRequest.of(page, size));
        Map<Long, List<SiteUpdatePosition>> posts = positionsOf(rows.getContent());
        return PageResponse.of(rows, u -> row(u, posts.getOrDefault(u.getId(), List.of())));
    }

    @Transactional
    public UpdateDtos.AdminRow create(UpdateDtos.UpdateRequest r) {
        SiteUpdate u = new SiteUpdate();
        apply(u, r);
        if (u.isOpportunity() && r.details() == null) {
            // An editor's admission or job alert gets the facts its title states, like those the daily check finds.
            enricher.apply(u, null, OpportunityClassifier.facts(u.getCategory(), u.getTitle(), u.getPublishedOn()), null, false);
        }
        ensureSlug(u);
        u = updates.save(u);
        audit.record("SITE_UPDATE_CREATED", "SITE_UPDATE", u.getId(), u.getTitle());
        return row(u, List.of());
    }

    @Transactional
    public UpdateDtos.AdminRow update(long id, UpdateDtos.UpdateRequest r) {
        SiteUpdate u = find(id);
        apply(u, r);
        if (u.isOfficialSync()) {
            // Staff wording is kept on later runs, and saving the form confirms the publication date the editor sees.
            u.setStaffEdited(true);
            u.setDateConfirmed(true);
        }
        ensureSlug(u);
        audit.record("SITE_UPDATE_EDITED", "SITE_UPDATE", id, u.getTitle());
        return row(updates.saveAndFlush(u), positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(id));
    }

    @Transactional
    public UpdateDtos.AdminRow setStatus(long id, SiteUpdate.Status status) {
        SiteUpdate u = find(id);
        if (status == SiteUpdate.Status.PUBLISHED && !u.isDateConfirmed()) {
            throw new BusinessValidationException("The source gave no date for this notice. Open it, check its date and save the "
                    + "update with that publication date before publishing.");
        }
        if (status == SiteUpdate.Status.PUBLISHED && u.getExpiresOn() != null && u.getExpiresOn().isBefore(LocalDate.now(clock))) {
            throw new BusinessValidationException("This update's expiry date has passed; change it first to publish it again.");
        }
        u.setStatus(status);
        audit.record("SITE_UPDATE_" + status, "SITE_UPDATE", id, u.getTitle());
        return row(updates.saveAndFlush(u), positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(id));
    }

    /** Takes an update off the site because a later notice replaces it. */
    @Transactional
    public UpdateDtos.AdminRow supersede(long id, long byId) {
        if (id == byId) {
            throw new BusinessValidationException("An update cannot replace itself.");
        }
        SiteUpdate u = find(id);
        SiteUpdate by = find(byId);
        u.setSupersededById(by.getId());
        u.setStatus(SiteUpdate.Status.ARCHIVED);
        audit.record("SITE_UPDATE_SUPERSEDED", "SITE_UPDATE", id, u.getTitle() + " -> #" + by.getId());
        return row(updates.saveAndFlush(u), positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(id));
    }

    /**
     * The posts of a recruitment notice as an editor entered them from the notice. They replace every post read from
     * the title, and later daily checks leave them alone; an empty list removes the editor's posts.
     */
    @Transactional
    public UpdateDtos.AdminRow setPositions(long id, List<UpdateDtos.PositionRequest> list) {
        SiteUpdate u = find(id);
        if (u.getCategory() != SiteUpdate.Category.JOB) {
            throw new BusinessValidationException("Only job notices list posts.");
        }
        if (list.size() > 60) {
            throw new BusinessValidationException("At most 60 posts per notice.");
        }
        positions.deleteBySiteUpdateIdAndOrigin(id, SiteUpdatePosition.Origin.EDITOR);
        if (!list.isEmpty()) {
            positions.deleteBySiteUpdateIdAndOrigin(id, SiteUpdatePosition.Origin.TITLE);
        }
        for (int i = 0; i < list.size(); i++) {
            UpdateDtos.PositionRequest p = list.get(i);
            SiteUpdatePosition row = new SiteUpdatePosition();
            row.setSiteUpdateId(id);
            row.setPostName(InputSanitizer.clean(p.postName()));
            row.setPostType(blankToNull(p.postType()));
            row.setSubject(blankToNull(InputSanitizer.clean(p.subject())));
            row.setPostCode(blankToNull(InputSanitizer.clean(p.postCode())));
            row.setVacancies(p.vacancies());
            row.setPayScale(blankToNull(InputSanitizer.clean(p.payScale())));
            row.setQualification(blankToNull(InputSanitizer.clean(p.qualification())));
            row.setSortOrder(i);
            row.setOrigin(SiteUpdatePosition.Origin.EDITOR);
            positions.save(row);
        }
        if (u.isOfficialSync()) {
            u.setStaffEdited(true);
        }
        audit.record("SITE_UPDATE_POSITIONS", "SITE_UPDATE", id, list.size() + " post(s)");
        updates.saveAndFlush(u);
        return row(u, positions.findBySiteUpdateIdOrderBySortOrderAscIdAsc(id));
    }

    private SiteUpdate find(long id) {
        return updates.findById(id).orElseThrow(() -> new ResourceNotFoundException("Update", id));
    }

    /** An admission or job notice gets its page address once; it never changes afterwards. */
    private void ensureSlug(SiteUpdate u) {
        enricher.assignSlug(u);
    }

    private static void apply(SiteUpdate u, UpdateDtos.UpdateRequest r) {
        u.setCategory(r.category());
        u.setTitle(InputSanitizer.clean(r.title()));
        u.setSummary(InputSanitizer.clean(r.summary()));
        u.setImageUrl(blankToNull(r.imageUrl()));
        u.setPublishedOn(r.publishedOn());
        u.setEventDate(r.eventDate());
        u.setEventLabel(blankToNull(InputSanitizer.clean(r.eventLabel())));
        u.setDeadline(r.deadline());
        u.setSourceUrl(blankToNull(r.sourceUrl()));
        u.setSourceName(blankToNull(InputSanitizer.clean(r.sourceName())));
        u.setLinkPath(blankToNull(r.linkPath()));
        u.setActionLabel(blankToNull(InputSanitizer.clean(r.actionLabel())));
        u.setVerificationStatus(r.verificationStatus() == null ? VerificationStatus.UNVERIFIED : r.verificationStatus());
        u.setExpiresOn(r.expiresOn());
        u.setPriority(r.priority());
        UpdateDtos.OpportunityFields d = r.details();
        if (d == null && u.isOpportunity() && r.deadline() && r.eventDate() != null) {
            // The form's deadline is the notice's last date (so its status and its card agree).
            u.setClosesOn(r.eventDate());
        }
        if (d != null) {
            u.setInstitutionName(blankToNull(InputSanitizer.clean(d.institutionName())));
            u.setCampus(blankToNull(InputSanitizer.clean(d.campus())));
            u.setSchoolId(d.schoolId());
            u.setSector(d.sector());
            u.setBoarding(d.boarding());
            u.setStateCode(blankToNull(d.stateCode()));
            u.setCity(blankToNull(InputSanitizer.clean(d.city())));
            u.setNoticeType(d.noticeType());
            u.setOpensOn(d.opensOn());
            u.setClosesOn(d.closesOn());
            u.setExamOn(d.examOn());
            u.setAcademicSession(blankToNull(d.academicSession()));
            u.setClasses(blankToNull(InputSanitizer.clean(d.classes())));
            u.setPostTypes(blankToNull(d.postTypes()));
            u.setSubjects(blankToNull(InputSanitizer.clean(d.subjects())));
            u.setStaffKind(d.staffKind());
            u.setEmploymentType(d.employmentType());
            u.setVacancies(d.vacancies());
            u.setEligibility(blankToNull(InputSanitizer.clean(d.eligibility())));
            u.setExperience(blankToNull(InputSanitizer.clean(d.experience())));
            u.setTetRequirement(blankToNull(InputSanitizer.clean(d.tetRequirement())));
            u.setAgeLimit(blankToNull(InputSanitizer.clean(d.ageLimit())));
            u.setSalaryText(blankToNull(InputSanitizer.clean(d.salaryText())));
            u.setApplicationFee(blankToNull(InputSanitizer.clean(d.applicationFee())));
            u.setSelectionProcess(blankToNull(InputSanitizer.clean(d.selectionProcess())));
            u.setApplyUrl(blankToNull(d.applyUrl()));
            if (d.closesOn() != null && r.eventDate() == null) {
                // The card's date line follows the last date the editor confirmed.
                u.setEventDate(d.closesOn());
                u.setEventLabel("Last date");
                u.setDeadline(true);
            }
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Map<Long, List<SiteUpdatePosition>> positionsOf(List<SiteUpdate> rows) {
        List<Long> ids = rows.stream().filter(u -> u.getCategory() == SiteUpdate.Category.JOB).map(SiteUpdate::getId).toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return positions.findBySiteUpdateIdInOrderBySiteUpdateIdAscSortOrderAscIdAsc(ids).stream()
                .collect(Collectors.groupingBy(SiteUpdatePosition::getSiteUpdateId));
    }

    static UpdateDtos.OpportunityFields details(SiteUpdate u) {
        if (!u.isOpportunity()) {
            return null;
        }
        return new UpdateDtos.OpportunityFields(u.getInstitutionName(), u.getCampus(), u.getSchoolId(), u.getSector(), u.getBoarding(),
                u.getStateCode(), u.getCity(), u.getNoticeType(), u.getOpensOn(), u.getClosesOn(), u.getExamOn(), u.getAcademicSession(),
                u.getClasses(), u.getPostTypes(), u.getSubjects(), u.getStaffKind(), u.getEmploymentType(), u.getVacancies(),
                u.getEligibility(), u.getExperience(), u.getTetRequirement(), u.getAgeLimit(), u.getSalaryText(), u.getApplicationFee(),
                u.getSelectionProcess(), u.getApplyUrl());
    }

    public static UpdateDtos.PositionRow position(SiteUpdatePosition p) {
        return new UpdateDtos.PositionRow(p.getId(), p.getPostName(), p.getPostType(),
                p.getPostType() == null ? null : OpportunityClassifier.postLabel(p.getPostType()), p.getSubject(), p.getPostCode(),
                p.getVacancies(), p.getPayScale(), p.getQualification(), p.getOrigin().name());
    }

    private static UpdateDtos.AdminRow row(SiteUpdate u, List<SiteUpdatePosition> posts) {
        List<UpdateDtos.PositionRow> rows = new ArrayList<>();
        posts.forEach(p -> rows.add(position(p)));
        return new UpdateDtos.AdminRow(u.getId(), u.getCategory(), u.getTitle(), u.getSummary(), u.getImageUrl(), u.getPublishedOn(),
                u.getEventDate(), u.getEventLabel(), u.isDeadline(), u.getSourceUrl(), u.getSourceName(), u.getLinkPath(),
                u.getActionLabel(), u.getStatus(), u.getVerificationStatus(), u.getExpiresOn(), u.getPriority(), u.getCreatedAt(),
                u.getUpdatedAt(), u.getCreatedBy(), u.getUpdatedBy(), u.getOrigin(), u.getSourceKey(), u.getOfficialTitle(),
                u.isDateConfirmed(), u.getReviewNote(), u.getFirstSeenAt(), u.getLastSeenAt(), u.getLastChangedAt(),
                u.getWithdrawnAt(), u.getSupersededById(), u.isStaffEdited(), u.getTopic(), u.getSlug(), details(u), rows);
    }
}
