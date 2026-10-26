package com.indiaschoolfinder.dto.admin;

import java.time.Instant;

public record AuditLogDto(Long id, String actor, String action, String entityType, Long entityId,
                          String details, Instant createdAt) {
}
