package com.indiaschoolfinder.service.udise;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Decides which directory school, if any, a row of an official UDISE+ school list describes. Pure logic, no database.
 *
 * <p>A school is never matched on its name alone. A candidate must be in the same state and have the same PIN code;
 * names are then compared word by word after spelling out common abbreviations ("Pub" for Public, "Sr Sec" for Senior
 * Secondary, "KV" for Kendriya Vidyalaya). A code is assigned only when exactly one directory school matches strongly
 * and that school is matched by exactly one row, and no other directory school even partly resembles that row: anything
 * less certain is left for a person (PENDING_REVIEW).
 */
public final class UdiseMatcher {

    /** Share of words in common (of all words in either name) for a strong match, and for a possible one. */
    static final double STRONG = 0.75;
    static final double POSSIBLE = 0.5;

    /** A directory school, as the matcher needs it. */
    public record School(long id, String name, String stateCode, String pinCode, String district, String udiseCode) {
    }

    /** A row of the official list. */
    public record Row(int line, String udiseCode, String name, String stateCode, String pinCode, String district) {
    }

    public record Candidate(Row row, double score) {
    }

    /** The outcome for one directory school that some row resembled. */
    public record Result(School school, String status, String udiseCode, List<Candidate> candidates, String reason) {
    }

    private static final Map<String, String> SPELLED = new HashMap<>();
    static {
        SPELLED.put("pub", "public");
        SPELLED.put("sch", "school");
        SPELLED.put("schl", "school");
        SPELLED.put("sr", "senior");
        SPELLED.put("snr", "senior");
        SPELLED.put("sec", "secondary");
        SPELLED.put("secy", "secondary");
        SPELLED.put("govt", "government");
        SPELLED.put("intl", "international");
        SPELLED.put("int", "international");
        SPELLED.put("vid", "vidyalaya");
        SPELLED.put("vidyalay", "vidyalaya");
        SPELLED.put("kv", "kendriya vidyalaya");
        SPELLED.put("jnv", "jawahar navodaya vidyalaya");
        SPELLED.put("st", "saint");
        SPELLED.put("hr", "higher");
        SPELLED.put("eng", "english");
        SPELLED.put("med", "medium");
        SPELLED.put("conv", "convent");
        SPELLED.put("acad", "academy");
    }
    /** Words that say nothing about which school it is. */
    private static final Set<String> NOISE = Set.of("the", "of", "and", "school", "schools", "senior", "secondary", "higher", "public",
            "english", "medium", "co", "ed", "cbse", "affiliated", "no", "a", "an", "at", "in");

    private UdiseMatcher() {
    }

    /** Lower case, accents and punctuation removed, abbreviations spelled out, filler words dropped. */
    static Set<String> words(String name) {
        if (name == null) {
            return Set.of();
        }
        String n = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replace("&", " and ").replaceAll("['’`]", "").replaceAll("[^a-z0-9]+", " ").trim();
        Set<String> out = new HashSet<>();
        for (String w : n.split(" ")) {
            if (w.isEmpty()) {
                continue;
            }
            for (String x : SPELLED.getOrDefault(w, w).split(" ")) {
                if (!NOISE.contains(x)) {
                    out.add(x);
                }
            }
        }
        return out;
    }

    static double similarity(String a, String b) {
        Set<String> x = words(a);
        Set<String> y = words(b);
        if (x.isEmpty() || y.isEmpty()) {
            return 0;
        }
        Set<String> both = new HashSet<>(x);
        both.retainAll(y);
        Set<String> any = new HashSet<>(x);
        any.addAll(y);
        return (double) both.size() / any.size();
    }

    static String key(String state, String pin) {
        return state + "|" + pin;
    }

    /**
     * @param schools  directory schools, indexed by the caller with {@link #index}
     * @param rows     every valid row of the official list
     * @param codesInUse UDISE codes already held by a directory school (code to school id)
     */
    public static List<Result> match(Map<String, List<School>> schools, Iterable<Row> rows, Map<String, Long> codesInUse) {
        Map<Long, List<Candidate>> strong = new LinkedHashMap<>();
        Map<Long, List<Candidate>> possible = new LinkedHashMap<>();
        // Directory schools a row resembles at all (strong or possible): a row that also resembles another school is not
        // certain enough to assign.
        Map<Integer, Integer> anyPerRow = new HashMap<>();
        Map<Long, School> byId = new HashMap<>();
        for (Row row : rows) {
            List<School> sameStateAndPin = schools.getOrDefault(key(row.stateCode(), row.pinCode()), List.of());
            for (School s : sameStateAndPin) {
                double score = similarity(s.name(), row.name());
                if (score >= STRONG) {
                    strong.computeIfAbsent(s.id(), k -> new ArrayList<>()).add(new Candidate(row, score));
                    anyPerRow.merge(row.line(), 1, Integer::sum);
                    byId.put(s.id(), s);
                } else if (score >= POSSIBLE) {
                    possible.computeIfAbsent(s.id(), k -> new ArrayList<>()).add(new Candidate(row, score));
                    anyPerRow.merge(row.line(), 1, Integer::sum);
                    byId.put(s.id(), s);
                }
            }
        }
        List<Result> results = new ArrayList<>();
        for (Map.Entry<Long, School> e : byId.entrySet()) {
            School s = e.getValue();
            List<Candidate> st = strong.getOrDefault(s.id(), List.of());
            List<Candidate> all = new ArrayList<>(st);
            all.addAll(possible.getOrDefault(s.id(), List.of()));
            all.sort((a, b) -> Double.compare(b.score(), a.score()));
            List<Candidate> shown = all.subList(0, Math.min(all.size(), 5));
            if (st.size() == 1 && anyPerRow.get(st.get(0).row().line()) == 1) {
                Row row = st.get(0).row();
                Long holder = codesInUse.get(row.udiseCode());
                if (s.udiseCode() != null && s.udiseCode().equals(row.udiseCode())) {
                    results.add(new Result(s, "ALREADY_SET", row.udiseCode(), shown, "already has this code"));
                } else if (s.udiseCode() != null) {
                    results.add(new Result(s, "PENDING_REVIEW", null, shown, "already has a different code (" + s.udiseCode() + ")"));
                } else if (holder != null && holder != s.id()) {
                    results.add(new Result(s, "PENDING_REVIEW", null, shown, "code already belongs to school #" + holder));
                } else {
                    results.add(new Result(s, "VERIFIED_MATCH", row.udiseCode(), shown, "same state and PIN, names agree"));
                }
            } else if (st.size() > 1) {
                results.add(new Result(s, "PENDING_REVIEW", null, shown, st.size() + " official rows match this school"));
            } else if (st.size() == 1) {
                results.add(new Result(s, "PENDING_REVIEW", null, shown, "the official row also matches another directory school"));
            } else {
                results.add(new Result(s, "PENDING_REVIEW", null, shown, "names only partly agree"));
            }
        }
        return results;
    }

    /** Directory schools by state and PIN (schools without a PIN cannot be matched safely and are left out). */
    public static Map<String, List<School>> index(Iterable<School> schools) {
        Map<String, List<School>> out = new HashMap<>();
        for (School s : schools) {
            if (s.pinCode() != null && s.stateCode() != null) {
                out.computeIfAbsent(key(s.stateCode(), s.pinCode()), k -> new ArrayList<>()).add(s);
            }
        }
        return out;
    }
}
