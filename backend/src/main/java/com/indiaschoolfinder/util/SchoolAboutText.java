package com.indiaschoolfinder.util;

import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * A school profile's short factual introduction, word for word as the app writes it (frontend utils/schoolProfile.ts,
 * aboutSummary and locationSummary; keep the two in step). It is the first thing the profile says, in the app and in the
 * server-rendered page, and the School data's description. Built only from the record: a fact that is not recorded is
 * left out, and nothing is said about quality or reputation.
 */
public final class SchoolAboutText {

    private static final Map<SchoolNetwork, String> NETWORK = Map.of(
            SchoolNetwork.KENDRIYA_VIDYALAYA, "Kendriya Vidyalaya",
            SchoolNetwork.JAWAHAR_NAVODAYA_VIDYALAYA, "Jawahar Navodaya Vidyalaya",
            SchoolNetwork.SAINIK_SCHOOL, "Sainik School",
            SchoolNetwork.EKLAVYA_MODEL_RESIDENTIAL_SCHOOL, "Eklavya Model Residential School",
            SchoolNetwork.RASHTRIYA_MILITARY_SCHOOL, "Rashtriya Military School");
    private static final Pattern BOARD_RECORD = Pattern.compile("^Listed by (CBSE|CISCE)\\b", Pattern.CASE_INSENSITIVE);

    private SchoolAboutText() {
    }

    /**
     * e.g. "Netarhat Awasiya Vidyalaya is a government boys' boarding school in Netarhat, Latehar district, Jharkhand. It
     * is affiliated to the CBSE, with classes from Class VI to Class XII. It was established in 1954."
     */
    public static String about(SchoolDetailDto s) {
        List<String> kindParts = new ArrayList<>();
        kindParts.add(s.schoolType() == SchoolType.GOVERNMENT ? "government" : s.schoolType() == SchoolType.AIDED ? "government-aided"
                : s.schoolType() == SchoolType.INTERNATIONAL ? "international" : "private");
        if (s.genderType() == GenderType.BOYS) kindParts.add("boys'");
        else if (s.genderType() == GenderType.GIRLS) kindParts.add("girls'");
        else if (s.genderType() == GenderType.CO_ED) kindParts.add("co-educational");
        if (Boolean.TRUE.equals(s.hasHostel()) || s.boarding() != null) kindParts.add("boarding");
        else if (Boolean.FALSE.equals(s.hasHostel())) kindParts.add("day");
        String kind = String.join(" ", kindParts);
        String place = location(s);
        List<String> sentences = new ArrayList<>();
        sentences.add(s.name() + " is " + article(kind) + " " + kind + " school" + (place.isEmpty() ? "" : " in " + place) + ".");
        if (s.network() != null) sentences.add("It is part of the " + NETWORK.get(s.network()) + " network.");

        String code = s.board() == null ? null : s.board().code();
        String board = code == null || "OTHER".equals(code) ? null
                : List.of("CBSE", "CISCE", "STATE", "NIOS").contains(code)
                ? "affiliated to the " + ("CISCE".equals(code) ? "CISCE (ICSE/ISC)" : "CBSE".equals(code) ? "CBSE" : s.board().name())
                : "following the " + s.board().name() + " curriculum";
        var classes = s.classesOffered();
        String range = classes.size() > 1 ? "with classes from " + classes.get(0).name() + " to " + classes.get(classes.size() - 1).name()
                : classes.size() == 1 ? "with " + classes.get(0).name()
                : s.affiliatedUpTo() != null ? "up to " + s.affiliatedUpTo() : null;
        if (board != null && range != null) sentences.add("It is " + board + ", " + range + ".");
        else if (board != null) sentences.add("It is " + board + ".");
        else if (range != null) sentences.add("It teaches " + range.replaceFirst("^with ", "") + ".");

        if (s.establishedYear() != null) sentences.add("It was established in " + s.establishedYear() + ".");
        if (s.mediumOfInstruction() != null && !s.mediumOfInstruction().isBlank()) {
            sentences.add("The medium of instruction is " + s.mediumOfInstruction() + ".");
        }
        return String.join(" ", sentences);
    }

    /** "Jawahar Navodaya Vidyalaya": a network's name, as the app writes it (utils/format networkLabel). */
    public static String networkName(SchoolNetwork network) {
        return NETWORK.get(network);
    }

    /** The school's own description, unless it is a board-list record copied in ("Listed by CBSE as …"); else null. */
    public static String ownDescription(SchoolDetailDto s) {
        String d = s.description();
        return d == null || d.isBlank() || BOARD_RECORD.matcher(d.trim()).find() ? null : d.trim();
    }

    /** "Locality, Town, District district, State", without repeats (Delhi, Delhi). */
    static String location(SchoolDetailDto s) {
        String district = s.district() == null ? null : s.district().name();
        boolean sameAsTown = district != null && s.city() != null && district.equalsIgnoreCase(s.city());
        Set<String> seen = new LinkedHashSet<>();
        List<String> parts = new ArrayList<>();
        for (String p : new String[]{s.locality(), s.city(), district != null && !sameAsTown ? district + " district" : null, s.stateName()}) {
            if (p != null && !p.isBlank() && seen.add(p.trim().toLowerCase(Locale.ROOT))) parts.add(p.trim());
        }
        return String.join(", ", parts);
    }

    private static String article(String word) {
        return word.matches("(?i)^[aeiou].*") ? "an" : "a";
    }
}
