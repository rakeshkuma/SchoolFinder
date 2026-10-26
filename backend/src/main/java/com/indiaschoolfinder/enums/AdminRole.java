package com.indiaschoolfinder.enums;

/**
 * ADMIN can do everything; EDITOR can add and verify data but cannot change school status,
 * ranking weights, or run bulk imports.
 */
public enum AdminRole {
    ADMIN,
    EDITOR
}
