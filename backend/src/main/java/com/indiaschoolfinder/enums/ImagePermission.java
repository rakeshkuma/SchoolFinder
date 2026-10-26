package com.indiaschoolfinder.enums;

import java.util.EnumSet;
import java.util.Set;

/** The basis on which an image may be published. Editing a copyrighted image never changes it. */
public enum ImagePermission {
    PUBLIC_DOMAIN,
    /** Creative Commons or similar; attribution text is required. */
    OPEN_LICENCE,
    /** The school or rights holder granted permission; record the details in permissionNote. */
    WRITTEN_PERMISSION,
    PURCHASED_LICENCE,
    /** Created by this site's team, including generated illustrations. */
    OWN_WORK,
    /** Not yet confirmed: stored, never shown publicly. */
    PENDING,
    REVOKED;

    public static final Set<ImagePermission> PUBLISHABLE =
            EnumSet.of(PUBLIC_DOMAIN, OPEN_LICENCE, WRITTEN_PERMISSION, PURCHASED_LICENCE, OWN_WORK);

    public boolean publishable() {
        return PUBLISHABLE.contains(this);
    }
}
