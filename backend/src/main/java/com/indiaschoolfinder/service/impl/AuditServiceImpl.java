package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.admin.AuditLogDto;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.entity.AdminAuditLog;
import com.indiaschoolfinder.repository.AdminAuditLogRepository;
import com.indiaschoolfinder.service.AuditService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Slf4j
@Service
public class AuditServiceImpl implements AuditService {

    private static final int MAX_DETAILS = 2000;

    private final AdminAuditLogRepository repository;
    private final AuditorAware<String> auditorAware;
    private final Clock clock;

    public AuditServiceImpl(AdminAuditLogRepository repository, AuditorAware<String> auditorAware, Clock clock) {
        this.repository = repository;
        this.auditorAware = auditorAware;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void record(String action, String entityType, Long entityId, String details) {
        String actor = auditorAware.getCurrentAuditor().orElse("system");
        AdminAuditLog entry = new AdminAuditLog();
        entry.setActor(actor);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setDetails(details == null || details.length() <= MAX_DETAILS ? details : details.substring(0, MAX_DETAILS));
        entry.setCreatedAt(Instant.now(clock));
        repository.save(entry);
        log.info("AUDIT actor={} action={} entity={}#{}", actor, action, entityType, entityId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> recent(int page, int size) {
        return PageResponse.of(repository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size)),
                a -> new AuditLogDto(a.getId(), a.getActor(), a.getAction(), a.getEntityType(), a.getEntityId(),
                        a.getDetails(), a.getCreatedAt()));
    }
}
