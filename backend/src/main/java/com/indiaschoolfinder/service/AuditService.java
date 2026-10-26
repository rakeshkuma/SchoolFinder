package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admin.AuditLogDto;
import com.indiaschoolfinder.dto.common.PageResponse;

public interface AuditService {

    /** Records an administrative change; joins the caller's transaction so it rolls back with it. */
    void record(String action, String entityType, Long entityId, String details);

    PageResponse<AuditLogDto> recent(int page, int size);
}
