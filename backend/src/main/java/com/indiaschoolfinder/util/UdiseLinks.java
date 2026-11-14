package com.indiaschoolfinder.util;

import java.util.regex.Pattern;

/**
 * Links to the Government of India's UDISE+ Know Your School portal.
 *
 * <p>Only one kind of direct link is accepted: an https school-detail page on kys.udiseplus.gov.in, exactly as the
 * portal's own search results link to it ({@code /#/schooldetail/{portal school id}/{academic year id}}). Such a link is
 * never built from a UDISE code: the portal's school id and year id are its own, so a link is stored only after a person
 * has opened it and checked that it shows the school. Everything else (other hosts, http, javascript:, redirects,
 * extra parameters) is refused.
 */
public final class UdiseLinks {

    /** The portal's search, offered when no checked direct link exists. */
    public static final String SEARCH_URL = "https://kys.udiseplus.gov.in/";

    public static final Pattern PROFILE_URL =
            Pattern.compile("^https://kys\\.udiseplus\\.gov\\.in/#/schooldetail1?/[0-9]{1,20}/[0-9]{1,4}$");
    public static final Pattern CODE = Pattern.compile("^[0-9]{11}$");

    public static final String VERIFIED_MATCH = "VERIFIED_MATCH";
    public static final String PENDING_REVIEW = "PENDING_REVIEW";
    public static final String NOT_MATCHED = "NOT_MATCHED";

    private UdiseLinks() {
    }

    public static boolean isProfileUrl(String url) {
        return url != null && PROFILE_URL.matcher(url).matches();
    }

    public static boolean isCode(String code) {
        return code != null && CODE.matcher(code).matches();
    }

    /** The stored link if it is a safe portal page, else null (the page then offers the portal's search). */
    public static String safeProfileUrl(String url) {
        return isProfileUrl(url) ? url : null;
    }
}
