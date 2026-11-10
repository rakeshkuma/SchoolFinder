package com.indiaschoolfinder.util;

/**
 * The highest class a board affiliates a school for, read from the affiliation level its official record states.
 * CBSE's directory (SARAS) gives a "Status of The School" (Senior Secondary, Secondary or Middle level), which the
 * import writes into the description as "CBSE affiliation level: ...". The level says how far a school goes, not
 * where it starts, so this never stands in for the list of classes offered.
 */
public final class AffiliationLevels {

    private static final String MARK = "CBSE affiliation level: ";

    private AffiliationLevels() {
    }

    /** "Class XII", "Class X" or "Class VIII", or null when the description states no CBSE level. */
    public static String highestClass(String description) {
        if (description == null) {
            return null;
        }
        int at = description.indexOf(MARK);
        if (at < 0) {
            return null;
        }
        String level = description.substring(at + MARK.length());
        if (level.startsWith("Senior Secondary")) return "Class XII";
        if (level.startsWith("Secondary")) return "Class X";
        if (level.startsWith("Middle")) return "Class VIII";
        return null;
    }
}
