package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.PracticeSetSummaryDto;
import com.indiaschoolfinder.entity.PracticeSet;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * The Olympiad preparation pages: {@value #PATH}, and {@value #PATH}/class-{n} for every class that has published
 * Olympiad practice sets. One place decides which class pages exist and what their title and description say, so the
 * page head, the server-rendered content and the sitemap agree. Built from the set summaries: no question or answer is
 * read here.
 */
@Service
public class OlympiadPages {

    public static final String PATH = "/exams/olympiad";
    private static final List<String> ROMAN = List.of("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII");
    /** Subjects by the names parents search for, in the order the page lists them. */
    private static final Map<String, String> SUBJECTS = new LinkedHashMap<>();

    static {
        SUBJECTS.put("Mathematics", "Maths");
        SUBJECTS.put("Science", "Science");
        SUBJECTS.put("English", "English");
        SUBJECTS.put("Logical Reasoning", "Reasoning");
        SUBJECTS.put("IOQM-style Mathematics", "IOQM-style Maths");
    }

    /** The subjects a class page names in its title; the description lists all of them. */
    private static final Set<String> TITLE_SUBJECTS = Set.of("Maths", "Science", "English");

    /** One class page: its sets in display order, its number of questions and its subjects. */
    public record ClassPage(int number, List<PracticeSetSummaryDto> sets, int questions, List<String> subjects) {

        public String path() {
            return PATH + "/class-" + number;
        }

        public String level() {
            return "Class " + ROMAN.get(number - 1);
        }

        /** The page's heading, in the app and in the server-rendered content. */
        public String heading() {
            return "Class " + number + " Olympiad Preparation";
        }

        /** "Class 5 Olympiad Preparation: Maths, Science & English": the class as people type it ("olympiad for class 5"). */
        public String title() {
            List<String> named = subjects.stream().filter(TITLE_SUBJECTS::contains).toList();
            return heading() + ": " + (named.isEmpty() ? "Practice Tests" : list(named, " & "));
        }

        /** Only what the page offers: a mock test needs at least 10 questions (the app's mini mock). */
        public String description() {
            return "Class " + number + " Olympiad practice: " + questions + " original question" + (questions == 1 ? "" : "s") + " in "
                    + list(subjects, " and ") + (questions >= 10 ? ", with timed mock tests and explained answers." : ", with explained answers.");
        }
    }

    private final PracticeService practiceService;

    public OlympiadPages(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    /** Every class with at least one published Olympiad set, from Class 1 up. */
    public List<ClassPage> classes() {
        Map<Integer, List<PracticeSetSummaryDto>> byClass = new TreeMap<>();
        for (PracticeSetSummaryDto set : practiceService.list(null, PracticeSet.Category.OLYMPIAD)) {
            int n = classNumber(set.level());
            if (n > 0) {
                byClass.computeIfAbsent(n, k -> new ArrayList<>()).add(set);
            }
        }
        List<ClassPage> pages = new ArrayList<>();
        byClass.forEach((n, sets) -> pages.add(page(n, sets)));
        return pages;
    }

    /** The page for one class; not found when the class has no published Olympiad set. */
    public ClassPage forClass(int number) {
        return classes().stream().filter(c -> c.number() == number).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Olympiad class", number));
    }

    /**
     * The page an old address of the Olympiad page stands for: /exams/practice?category=OLYMPIAD, with an optional
     * class=5, as the app linked before the page had its own address.
     */
    public static String addressFor(String classParam) {
        if (classParam != null && classParam.matches("\\d{1,2}")) {
            int n = Integer.parseInt(classParam);
            if (n >= 1 && n <= ROMAN.size()) {
                return PATH + "/class-" + n;
            }
        }
        return PATH;
    }

    /** "Class V" → 5; 0 for any other level, such as "Class V–VI" or "Class XII and above". */
    static int classNumber(String level) {
        if (level == null || !level.startsWith("Class ")) {
            return 0;
        }
        return ROMAN.indexOf(level.substring(6)) + 1;
    }

    private static ClassPage page(int number, List<PracticeSetSummaryDto> sets) {
        Set<String> subjects = new LinkedHashSet<>();
        Set<String> present = new LinkedHashSet<>();
        sets.forEach(s -> present.addAll(s.sections()));
        SUBJECTS.forEach((section, name) -> {
            if (present.contains(section)) subjects.add(name);
        });
        present.stream().filter(s -> !SUBJECTS.containsKey(s)).sorted().forEach(subjects::add);
        int questions = sets.stream().mapToInt(PracticeSetSummaryDto::questionCount).sum();
        return new ClassPage(number, List.copyOf(sets), questions, List.copyOf(subjects));
    }

    /** "a, b & c" (or "a, b and c"). */
    private static String list(List<String> items, String lastJoin) {
        if (items.isEmpty()) return "";
        if (items.size() == 1) return items.get(0);
        return String.join(", ", items.subList(0, items.size() - 1)) + lastJoin + items.get(items.size() - 1);
    }
}
