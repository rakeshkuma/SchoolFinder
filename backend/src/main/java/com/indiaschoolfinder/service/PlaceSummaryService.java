package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.Count;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.Faq;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.Link;
import com.indiaschoolfinder.dto.location.PlaceSummaryDto.SchoolLink;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The summary on a state, district or town page: what the listed schools add up to, in numbers and in a few sentences
 * written only from those numbers. It never says a kind of school is missing where the data may simply not record it
 * (gender, for example, is unknown for many schools), and it says plainly that the list holds only schools linked to an
 * official source.
 */
@Service
@Transactional(readOnly = true)
public class PlaceSummaryService {

    private static final Map<String, String> BOARDS = Map.of("CBSE", "CBSE", "CISCE", "ICSE/ISC", "IB", "IB", "CAMBRIDGE",
            "Cambridge", "NIOS", "NIOS", "STATE", "State board", "OTHER", "Other or several curricula");
    private static final Map<String, String> TYPES = Map.of("GOVERNMENT", "Government", "PRIVATE", "Private (unaided)",
            "AIDED", "Government-aided", "INTERNATIONAL", "International");
    private static final Map<String, String> NETWORKS = Map.of("KENDRIYA_VIDYALAYA", "Kendriya Vidyalaya",
            "JAWAHAR_NAVODAYA_VIDYALAYA", "Jawahar Navodaya Vidyalaya", "SAINIK_SCHOOL", "Sainik School",
            "EKLAVYA_MODEL_RESIDENTIAL_SCHOOL", "Eklavya Model Residential School", "RASHTRIYA_MILITARY_SCHOOL", "Rashtriya Military School");
    private static final Map<String, String> GENDERS = Map.of("GIRLS", "Girls", "BOYS", "Boys", "CO_ED", "Co-educational");

    private final LocationService locations;
    private final SchoolRepository schools;

    public PlaceSummaryService(LocationService locations, SchoolRepository schools) {
        this.locations = locations;
        this.schools = schools;
    }

    /** @param districtSlug a district of the state, or null; @param citySlug a town of the state, or null (not both) */
    public PlaceSummaryDto summary(String stateSlug, String districtSlug, String citySlug) {
        StateDto state = locations.state(stateSlug);
        long districtId = 0;
        String city = "";
        String place = state.name();
        String placeFull = state.name();
        if (districtSlug != null && !districtSlug.isBlank()) {
            DistrictDto d = locations.districts(state.code()).stream().filter(x -> x.slug().equals(districtSlug)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("District", districtSlug));
            districtId = d.id();
            place = d.name() + " district";
            placeFull = place + ", " + state.name();
        } else if (citySlug != null && !citySlug.isBlank()) {
            CityDto c = locations.cities(state.code()).stream().filter(x -> x.slug().equals(citySlug)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("City", citySlug));
            city = c.name();
            place = c.name();
            placeFull = c.name().equalsIgnoreCase(state.name()) ? c.name() : c.name() + ", " + state.name();
        }

        Map<String, Map<String, Long>> counts = new LinkedHashMap<>();
        for (Object[] row : schools.placeBreakdown(state.code(), districtId, city)) {
            counts.computeIfAbsent((String) row[0], k -> new LinkedHashMap<>()).put((String) row[1], ((Number) row[2]).longValue());
        }
        List<Count> boards = counted(counts.get("board"), BOARDS);
        List<Count> types = counted(counts.get("type"), TYPES);
        List<Count> networks = counted(counts.get("network"), NETWORKS);
        List<Count> genders = counted(counts.get("gender"), GENDERS);
        Map<String, Long> flags = counts.getOrDefault("flag", Map.of());
        long total = boards.stream().mapToLong(Count::count).sum();
        long boarding = flags.getOrDefault("BOARDING", 0L);
        long senior = flags.getOrDefault("SENIOR_SECONDARY", 0L);
        long admissions = flags.getOrDefault("ADMISSION_DATES", 0L);

        List<SchoolLink> oldest = new ArrayList<>();
        List<SchoolLink> government = new ArrayList<>();
        for (Object[] row : schools.placeExamples(state.code(), districtId, city)) {
            SchoolLink link = new SchoolLink((String) row[1], (String) row[2], row[3] == null ? null : ((Number) row[3]).intValue());
            ("oldest".equals(row[0]) ? oldest : government).add(link);
        }

        Facts f = new Facts(place, placeFull, total, boards, types, networks, genders, boarding, senior, admissions, oldest, government);
        return new PlaceSummaryDto(place, placeFull, total, total == 0 ? null : intro(f), boards, types, networks, genders, boarding,
                senior, admissions, oldest, total == 0 ? List.of() : faqs(f), total == 0 ? List.of() : related(f));
    }

    /** Everything the sentences are written from. */
    record Facts(String place, String placeFull, long total, List<Count> boards, List<Count> types, List<Count> networks,
                 List<Count> genders, long boarding, long senior, long admissions, List<SchoolLink> oldest,
                 List<SchoolLink> government) {

        long count(List<Count> list, String code) {
            return list.stream().filter(c -> c.code().equals(code)).mapToLong(Count::count).sum();
        }
    }

    static String intro(Facts f) {
        boolean one = f.total() == 1;
        StringBuilder s = new StringBuilder("SchoolDhundo lists ").append(schoolsWord(f.total())).append(" in ").append(f.placeFull())
                .append(one ? ", linked to an official source such as its board's affiliation record." :
                        ", each linked to an official source such as its board's affiliation record.");
        List<Count> namedBoards = f.boards().stream().filter(c -> !"OTHER".equals(c.code())).toList();
        if (f.boards().size() == 1 && !namedBoards.isEmpty()) {
            s.append(one ? " It is affiliated to " : " All of them are affiliated to ").append(boardName(namedBoards.get(0).code())).append('.');
        } else if (f.boards().size() > 1) {
            s.append(" By board: ").append(join(f.boards().stream().map(c -> c.label() + " " + number(c.count())).toList())).append('.');
        }
        if (f.types().size() == 1) {
            String label = f.types().get(0).label().toLowerCase(java.util.Locale.ROOT);
            s.append(one ? " It is " + article(label) + " " + label + " school." : " All are " + label + " schools.");
        } else if (f.types().size() > 1) {
            s.append(" By management: ").append(join(f.types().stream()
                    .map(c -> number(c.count()) + " " + c.label().toLowerCase(java.util.Locale.ROOT)).toList())).append('.');
        }
        if (!f.networks().isEmpty()) {
            s.append(" The list includes ").append(networkList(f.networks())).append('.');
        }
        if (!f.oldest().isEmpty()) {
            SchoolLink o = f.oldest().get(0);
            s.append(one ? " It was established in " + o.established() + "."
                    : " The oldest with a recorded founding year is " + o.name() + ", established in " + o.established() + ".");
        }
        if (f.senior() > 0) {
            s.append(one ? " It teaches up to Class XII." : " " + number(f.senior()) + (f.senior() == 1 ? " teaches" : " teach")
                    + " up to Class XII.");
        }
        return s.toString();
    }

    static List<Faq> faqs(Facts f) {
        List<Faq> out = new ArrayList<>();
        out.add(new Faq("How many schools are there in " + f.place() + "?",
                "SchoolDhundo lists " + schoolsWord(f.total()) + " in " + f.placeFull() + ". A school is added only when it can be"
                        + " linked to an official source, such as its board's affiliation record, so some schools in " + f.place()
                        + " may not be listed yet."));

        List<Count> named = f.boards().stream().filter(c -> !"OTHER".equals(c.code())).toList();
        if (!named.isEmpty()) {
            Count top = named.get(0);
            String answer;
            if (f.boards().size() == 1) {
                answer = (f.total() == 1 ? "The listed school is" : "All " + number(f.total()) + " listed schools are")
                        + " affiliated to " + boardName(top.code()) + ".";
            } else {
                answer = (top.count() * 2 > f.total() ? "Most follow " : "The largest group follows ") + boardName(top.code())
                        + " (" + number(top.count()) + " of " + number(f.total()) + "). The others: "
                        + join(f.boards().stream().filter(c -> c != top).map(c -> c.label() + " " + number(c.count())).toList()) + ".";
            }
            out.add(new Faq("Which boards do schools in " + f.place() + " follow?", answer));
        }

        long government = f.count(f.types(), "GOVERNMENT");
        String govAnswer;
        if (government > 0) {
            String who = government == f.total()
                    ? (f.total() == 1 ? "The listed school is a government school" : "All " + number(f.total()) + " listed schools are government schools")
                    : number(government) + " of the " + number(f.total()) + " listed schools "
                            + (government == 1 ? "is a government school" : "are government schools");
            List<String> names = f.government().stream().map(SchoolLink::name).toList();
            // Named in full when there are no more than these; otherwise "including" the first few (A to Z).
            String tail = names.isEmpty() ? "" : (government <= names.size() ? ": " : ", including ") + join(names);
            govAnswer = "Yes. " + who + tail + ".";
            if (!f.networks().isEmpty()) {
                govAnswer += " The list includes " + networkList(f.networks()) + ".";
            }
        } else {
            govAnswer = "No government school in " + f.place() + " is listed on SchoolDhundo yet. Many government schools follow"
                    + " the state board, and those are not all listed yet.";
        }
        out.add(new Faq("Are there government schools in " + f.place() + "?", govAnswer));

        if (!f.oldest().isEmpty() && f.total() > 1) {
            SchoolLink o = f.oldest().get(0);
            String answer = "Of the listed schools with a recorded founding year, " + o.name() + " is the oldest, established in "
                    + o.established() + ".";
            List<String> next = f.oldest().subList(1, f.oldest().size()).stream().map(x -> x.name() + " (" + x.established() + ")").toList();
            if (!next.isEmpty()) {
                answer += (next.size() == 1 ? " Next is " : " Next are ") + join(next) + ".";
            }
            out.add(new Faq("Which is the oldest school in " + f.place() + "?", answer));
        }

        long girls = f.count(f.genders(), "GIRLS");
        long boys = f.count(f.genders(), "BOYS");
        if (girls > 0 || boys > 0 || f.boarding() > 0) {
            List<String> parts = new ArrayList<>();
            if (girls > 0) parts.add(number(girls) + " girls' " + (girls == 1 ? "school" : "schools"));
            if (boys > 0) parts.add(number(boys) + " boys' " + (boys == 1 ? "school" : "schools"));
            if (f.boarding() > 0) parts.add(schoolsWord(f.boarding()) + " with boarding (hostel) places");
            out.add(new Faq("Are there girls' schools or boarding schools in " + f.place() + "?",
                    "SchoolDhundo lists " + join(parts) + " in " + f.place() + ". Each profile shows what the school's own records state."));
        }

        StringBuilder admission = new StringBuilder("Each school runs its own admission, so dates, age rules and documents differ. Check the"
                + " school's official website or admission notice. Its SchoolDhundo profile shows admission dates where the school has"
                + " published them.");
        if (f.admissions() > 0) {
            admission.append(' ').append(schoolsWord(f.admissions())).append(" in ").append(f.place())
                    .append(f.admissions() == 1 ? " has" : " have").append(" admission dates recorded.");
        }
        if (f.count(f.networks(), "KENDRIYA_VIDYALAYA") > 0) {
            admission.append(" Kendriya Vidyalayas follow the yearly KVS admission schedule, with online registration for Class 1.");
        }
        if (f.count(f.networks(), "JAWAHAR_NAVODAYA_VIDYALAYA") > 0) {
            admission.append(" Jawahar Navodaya Vidyalayas admit to Class 6 through the JNVST entrance test.");
        }
        if (f.count(f.networks(), "SAINIK_SCHOOL") > 0) {
            admission.append(" Sainik Schools admit to Classes 6 and 9 through the AISSEE entrance test.");
        }
        if (f.count(f.networks(), "RASHTRIYA_MILITARY_SCHOOL") > 0) {
            admission.append(" Rashtriya Military Schools admit to Classes 6 and 9 through the RMS CET.");
        }
        out.add(new Faq("How do I apply for admission to a school in " + f.place() + "?", admission.toString()));
        return out;
    }

    static List<Link> related(Facts f) {
        List<Link> out = new ArrayList<>();
        if (f.count(f.networks(), "JAWAHAR_NAVODAYA_VIDYALAYA") > 0) out.add(new Link("/exams/jnvst", "JNVST Class 6 preparation"));
        if (f.count(f.networks(), "SAINIK_SCHOOL") > 0) out.add(new Link("/exams/aissee", "AISSEE Sainik School preparation"));
        if (f.boarding() > 0) out.add(new Link("/boarding", "Boarding schools in India"));
        out.add(new Link("/admissions/guide", "School admission guide"));
        out.add(new Link("/admissions/notifications", "Admission notices"));
        out.add(new Link("/fees", "School fee calculator"));
        out.add(new Link("/compare", "Compare schools"));
        return out;
    }

    /** Non-zero counts, largest first, with readable labels. */
    private static List<Count> counted(Map<String, Long> values, Map<String, String> labels) {
        if (values == null) return List.of();
        return values.entrySet().stream().filter(e -> e.getKey() != null && e.getValue() > 0)
                .map(e -> new Count(e.getKey(), labels.getOrDefault(e.getKey(), e.getKey()), e.getValue()))
                .sorted(Comparator.comparingLong(Count::count).reversed().thenComparing(Count::label))
                .toList();
    }

    private static String boardName(String code) {
        return switch (code) {
            case "CISCE" -> "the CISCE (ICSE/ISC)";
            case "IB" -> "the IB";
            case "CAMBRIDGE" -> "Cambridge International";
            case "STATE" -> "the state board";
            default -> code;
        };
    }

    private static String networkList(List<Count> networks) {
        return join(networks.stream().map(c -> number(c.count()) + " " + c.label() + (c.count() == 1 ? "" : "s")).toList());
    }

    private static String schoolsWord(long n) {
        return number(n) + (n == 1 ? " school" : " schools");
    }

    private static String number(long n) {
        return String.format(java.util.Locale.ENGLISH, "%,d", n);
    }

    private static String article(String word) {
        return word.isEmpty() || "aeiou".indexOf(word.charAt(0)) < 0 ? "a" : "an";
    }

    /** "a", "a and b", "a, b and c" */
    static String join(List<String> parts) {
        if (parts.isEmpty()) return "";
        if (parts.size() == 1) return parts.get(0);
        return String.join(", ", parts.subList(0, parts.size() - 1)) + " and " + parts.get(parts.size() - 1);
    }
}
