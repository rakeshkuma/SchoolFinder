package com.indiaschoolfinder.enums;

/** Records an administrator can verify through POST /api/v1/admin/schools/{id}/verify. */
public enum VerifiableEntityType {
    SCHOOL,
    FEE,
    ADMISSION,
    IMAGE,
    FACILITY,
    CRITERION_SCORE,
    /** The school's boarding profile; entityId is the school id or omitted. */
    BOARDING
}
