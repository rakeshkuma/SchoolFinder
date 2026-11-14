package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Editorial updates: an editor drafts one, citing its official source, then publishes it; archiving takes it off the
 * site. Every change is recorded in the audit log.
 */
@Service
public class SiteUpdateService {

    private final SiteUpdateRepository updates;
    private final AuditService audit;

    public SiteUpdateService(SiteUpdateRepository updates, AuditService audit) {
        this.updates = updates;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<UpdateDtos.AdminRow> list(SiteUpdate.Status status, int page, int size) {
        return PageResponse.of(updates.findByStatusOrderByPublishedOnDescIdDesc(status, PageRequest.of(page, size)), SiteUpdateService::row);
    }

    @Transactional
    public UpdateDtos.AdminRow create(UpdateDtos.UpdateRequest r) {
        SiteUpdate u = new SiteUpdate();
        apply(u, r);
        u = updates.save(u);
        audit.record("SITE_UPDATE_CREATED", "SITE_UPDATE", u.getId(), u.getTitle());
        return row(u);
    }

    @Transactional
    public UpdateDtos.AdminRow update(long id, UpdateDtos.UpdateRequest r) {
        SiteUpdate u = find(id);
        apply(u, r);
        audit.record("SITE_UPDATE_EDITED", "SITE_UPDATE", id, u.getTitle());
        return row(updates.saveAndFlush(u));
    }

    @Transactional
    public UpdateDtos.AdminRow setStatus(long id, SiteUpdate.Status status) {
        SiteUpdate u = find(id);
        u.setStatus(status);
        audit.record("SITE_UPDATE_" + status, "SITE_UPDATE", id, u.getTitle());
        return row(updates.saveAndFlush(u));
    }

    private SiteUpdate find(long id) {
        return updates.findById(id).orElseThrow(() -> new ResourceNotFoundException("Update", id));
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
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static UpdateDtos.AdminRow row(SiteUpdate u) {
        return new UpdateDtos.AdminRow(u.getId(), u.getCategory(), u.getTitle(), u.getSummary(), u.getImageUrl(), u.getPublishedOn(),
                u.getEventDate(), u.getEventLabel(), u.isDeadline(), u.getSourceUrl(), u.getSourceName(), u.getLinkPath(),
                u.getActionLabel(), u.getStatus(), u.getVerificationStatus(), u.getExpiresOn(), u.getPriority(), u.getCreatedAt(),
                u.getUpdatedAt(), u.getCreatedBy(), u.getUpdatedBy());
    }
}
