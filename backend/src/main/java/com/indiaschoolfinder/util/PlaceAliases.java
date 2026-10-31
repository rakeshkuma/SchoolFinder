package com.indiaschoolfinder.util;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Other spellings and former names of Indian places, so a search for "Arrah" also finds schools in Ara and "Allahabad"
 * finds Prayagraj. Each group lists equivalent single words; the first is the name used on this site. Only spellings in
 * common use belong here: a wrong alias would mix up two different places.
 */
public final class PlaceAliases {

    private static final List<List<String>> GROUPS = List.of(
            // Bihar
            List.of("ara", "arrah", "aarah"),
            List.of("dhansoi", "dhanoi"),
            List.of("sasaram", "sasram", "sassaram"),
            List.of("dehri", "dehari"),
            List.of("chhapra", "chapra"),
            List.of("bettiah", "betiah"),
            List.of("purnia", "purnea"),
            List.of("munger", "monghyr"),
            List.of("muzaffarpur", "mujaffarpur"),
            List.of("bhagalpur", "bhagalpore"),
            // Jharkhand
            List.of("medininagar", "daltonganj"),
            // Uttar Pradesh
            List.of("prayagraj", "allahabad"),
            List.of("varanasi", "banaras", "benaras", "benares"),
            List.of("ayodhya", "faizabad"),
            // Delhi-NCR and other cities with changed names
            List.of("gurugram", "gurgaon"),
            List.of("bengaluru", "bangalore"),
            List.of("mumbai", "bombay"),
            List.of("kolkata", "calcutta"),
            List.of("chennai", "madras"));

    private static final Map<String, List<String>> BY_WORD = new HashMap<>();

    static {
        for (List<String> group : GROUPS) {
            for (String word : group) {
                BY_WORD.put(word, group);
            }
        }
    }

    private PlaceAliases() {
    }

    /** The other spellings of a word (lower case), empty when it has none. */
    public static List<String> othersOf(String word) {
        String w = word == null ? "" : word.trim().toLowerCase(Locale.ROOT);
        List<String> group = BY_WORD.get(w);
        return group == null ? List.of() : group.stream().filter(x -> !x.equals(w)).toList();
    }

    /** The site's spelling for a word that is a known alternative, or null. */
    public static String preferred(String word) {
        String w = word == null ? "" : word.trim().toLowerCase(Locale.ROOT);
        List<String> group = BY_WORD.get(w);
        return group == null || group.getFirst().equals(w) ? null : group.getFirst();
    }

    /** Every word of every group, repeats included, for tests. */
    static List<String> allWords() {
        return GROUPS.stream().flatMap(List::stream).toList();
    }
}
