package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.PracticeBankDto;
import com.indiaschoolfinder.dto.practice.PracticeContent;
import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
import com.indiaschoolfinder.dto.practice.PracticeMode;
import com.indiaschoolfinder.dto.practice.PracticeSessionDto;
import com.indiaschoolfinder.dto.practice.PracticeSetDto;
import com.indiaschoolfinder.dto.practice.PracticeSetSummaryDto;
import com.indiaschoolfinder.dto.practice.ScoreRequest;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.entity.PracticeSet;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.PracticeSetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;

/**
 * Practice quizzes, mock tests and the question bank built from them. Questions are served without answers; an
 * attempt is scored here and returned with the correct answers and explanations. Guests' attempts are not stored
 * (members' are, by {@link MemberPracticeService}).
 */
@Service
@Transactional(readOnly = true)
public class PracticeService {

    /** Suggested pace for timed bank sessions, close to AISSEE's (125 questions in 150 minutes). */
    private static final double MINUTES_PER_QUESTION = 1.2;
    private static final int MAX_SESSION = 100;

    /** One question of a published set, with everything needed to serve and score it. */
    public record BankItem(String id, PracticeSet set, PracticeContent.Question question, PracticeContent.Passage passage) {
    }

    private final PracticeSetRepository repository;
    private final AuditService auditService;
    private final Clock clock;

    public PracticeService(PracticeSetRepository repository, AuditService auditService, Clock clock) {
        this.repository = repository;
        this.auditService = auditService;
        this.clock = clock;
    }

    /** Published sets, optionally only those for one exam guide and/or one category. */
    public List<PracticeSetSummaryDto> list(String examSlug, PracticeSet.Category category) {
        return repository.findByPublishedTrueOrderByDisplayOrderAscTitleAsc().stream()
                .filter(s -> examSlug == null || examSlug.isBlank() || examSlug.equals(s.getExamSlug()))
                .filter(s -> category == null || category == s.getCategory())
                .map(PracticeService::summary)
                .toList();
    }

    public PracticeSetDto get(String slug) {
        PracticeSet set = published(slug);
        return new PracticeSetDto(summary(set), set.getContent().passages(), set.getContent().questions().stream()
                .map(q -> questionDto(q.id(), q, q.passageId()))
                .toList());
    }

    public ScoreResultDto score(String slug, ScoreRequest request) {
        PracticeSet set = published(slug);
        List<Marked> questions = set.getContent().questions().stream()
                .map(q -> new Marked(q.id(), q, set.getMarksPerQuestion(), set.getNegativeMarks())).toList();
        return score(questions, request.answers());
    }

    /** A question to score with its set's marking. */
    record Marked(String id, PracticeContent.Question question, BigDecimal marks, BigDecimal negative) {
    }

    // --- question bank ----------------------------------------------------------------------------------------------

    /** Every published question as "set-slug/question-id", in set display order. */
    public Map<String, BankItem> bankIndex() {
        Map<String, BankItem> index = new LinkedHashMap<>();
        for (PracticeSet set : repository.findByPublishedTrueOrderByDisplayOrderAscTitleAsc()) {
            Map<String, PracticeContent.Passage> passages = new LinkedHashMap<>();
            set.getContent().passages().forEach(p -> passages.put(p.id(), p));
            for (PracticeContent.Question q : set.getContent().questions()) {
                String id = set.getSlug() + "/" + q.id();
                index.put(id, new BankItem(id, set, q, q.passageId() == null ? null : passages.get(q.passageId())));
            }
        }
        return index;
    }

    public PracticeBankDto bank() {
        List<PracticeBankDto.QuestionMeta> meta = bankIndex().values().stream()
                .map(i -> new PracticeBankDto.QuestionMeta(i.id(), i.set().getSlug(), i.set().getExamSlug(), i.set().getLevel(),
                        i.question().section(), i.question().topic(), i.question().difficulty(), i.set().getCategory(),
                        i.question().chapter(), hasHindi(i)))
                .toList();
        return new PracticeBankDto(meta.size(), meta);
    }

    /**
     * The bank filter of a session request; null or blank means any. {@code hindi} = true keeps only questions with a
     * Hindi version (and a Hindi passage, when they have one).
     */
    public record BankFilter(String exam, String level, String section, String topic, String difficulty,
                             PracticeSet.Category category, String chapter, boolean hindi) {

        public BankFilter(String exam, String level, String section, String topic, String difficulty) {
            this(exam, level, section, topic, difficulty, null, null, false);
        }

        boolean accepts(BankItem i) {
            return any(exam, i.set().getExamSlug()) && any(level, i.set().getLevel()) && any(section, i.question().section())
                    && any(topic, i.question().topic()) && any(difficulty, i.question().difficulty())
                    && (category == null || category == i.set().getCategory()) && any(chapter, i.question().chapter())
                    && (!hindi || hasHindi(i));
        }

        private static boolean any(String wanted, String value) {
            return wanted == null || wanted.isBlank() || wanted.equals(value);
        }
    }

    /**
     * Questions for one sitting. With {@code ids} (retake, retry incorrect, revision), exactly those questions in that
     * order; unknown or unpublished ids are skipped. Otherwise a random draw from the filtered bank: QUICK takes 5,
     * MINI_MOCK and DAILY 10, TOPIC and FULL {@code count} (default 10 and up to 40). DAILY is the same draw for
     * everyone on a given date (for the same exam filter).
     */
    public PracticeSessionDto session(PracticeMode mode, BankFilter filter, Integer count, List<String> ids, Long seed) {
        Map<String, BankItem> index = bankIndex();
        List<BankItem> chosen;
        if (ids != null && !ids.isEmpty()) {
            chosen = new LinkedHashSet<>(ids).stream().limit(MAX_SESSION).map(index::get).filter(Objects::nonNull).toList();
        } else {
            List<BankItem> pool = index.values().stream().filter(filter::accepts).toList();
            int wanted = switch (mode) {
                case QUICK -> 5;
                case MINI_MOCK, DAILY -> 10;
                case FULL -> count == null ? Math.min(pool.size(), 40) : count;
                default -> count == null ? 10 : count;
            };
            wanted = Math.max(1, Math.min(MAX_SESSION, wanted));
            Random random = mode == PracticeMode.DAILY
                    ? new Random(LocalDate.now(clock).toEpochDay() * 31 + Objects.hashCode(filter.exam()))
                    : new Random(seed != null ? seed : System.nanoTime());
            List<BankItem> shuffled = new ArrayList<>(pool);
            Collections.shuffle(shuffled, random);
            chosen = groupForSitting(shuffled.subList(0, Math.min(wanted, shuffled.size())));
        }
        List<PracticeContent.Passage> passages = chosen.stream().map(BankItem::passage).filter(Objects::nonNull)
                .distinct().map(p -> passageFor(p, chosen)).toList();
        boolean timed = mode == PracticeMode.MINI_MOCK || mode == PracticeMode.FULL || mode == PracticeMode.DAILY;
        return new PracticeSessionDto(mode, title(mode, chosen.size(), filter), description(mode),
                timed && !chosen.isEmpty() ? (int) Math.ceil(chosen.size() * MINUTES_PER_QUESTION) : null,
                passages, chosen.stream().map(PracticeService::bankQuestionDto).toList());
    }

    /** Scores bank questions by their "set/question" ids. */
    public ScoreResultDto scoreBank(List<String> questionIds, Map<String, Integer> answers) {
        Map<String, BankItem> index = bankIndex();
        Set<String> unique = new LinkedHashSet<>(questionIds);
        if (unique.size() != questionIds.size()) {
            throw new BusinessValidationException("questionIds", "a question appears more than once");
        }
        List<Marked> questions = new ArrayList<>();
        for (String id : unique) {
            BankItem item = index.get(id);
            if (item == null) {
                throw new BusinessValidationException("questionIds", "unknown question '" + id + "'");
            }
            questions.add(new Marked(id, item.question(), item.set().getMarksPerQuestion(), item.set().getNegativeMarks()));
        }
        return score(questions, answers);
    }

    /** A question counts as available in Hindi only when its passage (if any) is too. */
    private static boolean hasHindi(BankItem i) {
        return i.question().hi() != null && (i.passage() == null || i.passage().hi() != null);
    }

    /** Sections stay together (in order of first appearance) and questions on the same passage follow each other. */
    private static List<BankItem> groupForSitting(List<BankItem> items) {
        List<String> sectionOrder = items.stream().map(i -> i.question().section()).distinct().toList();
        List<BankItem> sorted = new ArrayList<>(items);
        sorted.sort(Comparator.comparingInt((BankItem i) -> sectionOrder.indexOf(i.question().section()))
                .thenComparing(i -> i.passage() == null ? "" : i.set().getSlug() + "/" + i.passage().id()));
        return sorted;
    }

    /** A passage under its bank id, so passages of different sets never clash. */
    private static PracticeContent.Passage passageFor(PracticeContent.Passage p, List<BankItem> chosen) {
        BankItem owner = chosen.stream().filter(i -> i.passage() == p).findFirst().orElseThrow();
        return new PracticeContent.Passage(owner.set().getSlug() + "-" + p.id(), p.title(), p.text(), p.hi());
    }

    private static PracticeSetDto.QuestionDto bankQuestionDto(BankItem i) {
        PracticeContent.Question q = i.question();
        return questionDto(i.id(), q, q.passageId() == null ? null : i.set().getSlug() + "-" + q.passageId());
    }

    /** Never includes the answer or explanation, in any language. */
    private static PracticeSetDto.QuestionDto questionDto(String id, PracticeContent.Question q, String passageId) {
        return new PracticeSetDto.QuestionDto(id, q.section(), q.topic(), passageId, q.prompt(), q.options(), q.figure(),
                q.figureAsksNext(), q.optionFigures(), q.difficulty(), q.chapter(),
                q.hi() == null ? null : new PracticeSetDto.QuestionTextDto(q.hi().prompt(), q.hi().options()));
    }

    private static String title(PracticeMode mode, int n, BankFilter f) {
        String scope = f.topic() != null && !f.topic().isBlank() ? f.topic()
                : f.section() != null && !f.section().isBlank() ? f.section() : null;
        return switch (mode) {
            case QUICK -> "Quick practice" + (scope == null ? "" : ": " + scope);
            case TOPIC -> "Topic practice" + (scope == null ? "" : ": " + scope);
            case MINI_MOCK -> "Mini mock test";
            case FULL -> "Full practice test (" + n + " questions)";
            case DAILY -> "Daily challenge";
            case REVISION -> "Revision: questions you got wrong";
            case RETRY -> "Retry";
            case SET -> "Practice";
        };
    }

    private static String description(PracticeMode mode) {
        return switch (mode) {
            case QUICK -> "Five questions picked at random — a two-minute warm-up.";
            case TOPIC -> "Questions from one subject or topic, to work on a weak area.";
            case MINI_MOCK -> "Ten mixed questions against the clock.";
            case FULL -> "A longer mixed test from the whole question bank, with an optional time limit.";
            case DAILY -> "The same ten questions for everyone today. Come back tomorrow for a new set.";
            case REVISION -> "Questions you answered wrongly before. Get them right to clear them from this list.";
            case RETRY, SET -> "Questions from an earlier attempt.";
        };
    }

    // --- scoring ----------------------------------------------------------------------------------------------------

    /**
     * Counts right and wrong answers and applies each question's marking: its set's marks for a correct answer, minus
     * its set's negative marks for a wrong one, nothing for a skipped one. Every answer must belong to a listed
     * question and name an existing option; anything else is rejected rather than ignored.
     */
    static ScoreResultDto score(List<Marked> questions, Map<String, Integer> answers) {
        Set<String> ids = new HashSet<>();
        questions.forEach(q -> ids.add(q.id()));
        for (String id : answers.keySet()) {
            if (!ids.contains(id)) {
                throw new BusinessValidationException("answers", "unknown question '" + id + "'");
            }
        }
        Map<String, int[]> sections = new LinkedHashMap<>(); // total, attempted, correct
        Map<String, BigDecimal[]> sectionMarks = new LinkedHashMap<>(); // scored, maximum
        Map<List<String>, int[]> topics = new LinkedHashMap<>();
        List<ScoreResultDto.QuestionResult> results = new ArrayList<>();
        int attempted = 0;
        int correct = 0;
        BigDecimal marks = BigDecimal.ZERO;
        BigDecimal maxMarks = BigDecimal.ZERO;
        for (Marked m : questions) {
            PracticeContent.Question q = m.question();
            Integer chosen = answers.get(m.id());
            if (chosen != null && (chosen < 0 || chosen >= q.options().size())) {
                throw new BusinessValidationException("answers", "option " + chosen + " does not exist for '" + m.id() + "'");
            }
            boolean right = chosen != null && chosen.equals(q.answer());
            BigDecimal awarded = right ? m.marks() : chosen != null ? m.negative().negate() : BigDecimal.ZERO;
            int[] s = sections.computeIfAbsent(q.section(), k -> new int[3]);
            int[] t = topics.computeIfAbsent(List.of(q.section(), Objects.requireNonNullElse(q.topic(), q.section())), k -> new int[3]);
            for (int[] counter : List.of(s, t)) {
                counter[0]++;
                if (chosen != null) counter[1]++;
                if (right) counter[2]++;
            }
            BigDecimal[] sm = sectionMarks.computeIfAbsent(q.section(), k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            sm[0] = sm[0].add(awarded);
            sm[1] = sm[1].add(m.marks());
            marks = marks.add(awarded);
            maxMarks = maxMarks.add(m.marks());
            if (chosen != null) attempted++;
            if (right) correct++;
            results.add(new ScoreResultDto.QuestionResult(m.id(), chosen, q.answer(), right, q.explanation(), plain(awarded),
                    q.hi() == null ? null : q.hi().explanation()));
        }
        return new ScoreResultDto(questions.size(), attempted, correct,
                sections.entrySet().stream()
                        .map(e -> new ScoreResultDto.SectionScore(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2],
                                plain(sectionMarks.get(e.getKey())[0]), plain(sectionMarks.get(e.getKey())[1])))
                        .toList(),
                topics.entrySet().stream()
                        .map(e -> new ScoreResultDto.TopicScore(e.getKey().get(0), e.getKey().get(1), e.getValue()[0],
                                e.getValue()[1], e.getValue()[2]))
                        .toList(),
                results, plain(marks), plain(maxMarks));
    }

    /** 2.00 → 2, 0.50 → 0.5: marks read naturally in JSON. */
    private static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }

    // --- administration ---------------------------------------------------------------------------------------------

    @Transactional
    public List<String> importSets(PracticeImportRequest request) {
        Set<String> seen = new HashSet<>();
        for (PracticeImportRequest.SetRecord r : request.sets()) {
            if (!seen.add(r.slug())) {
                throw new BusinessValidationException("sets", "slug '" + r.slug() + "' appears more than once");
            }
            validate(r);
        }
        List<String> slugs = new ArrayList<>();
        for (PracticeImportRequest.SetRecord r : request.sets()) {
            PracticeSet set = repository.findBySlug(r.slug()).orElseGet(PracticeSet::new);
            set.setSlug(r.slug());
            set.setExamSlug(r.examSlug());
            set.setTitle(r.title().trim());
            set.setKind(r.kind());
            set.setCategory(Objects.requireNonNullElse(r.category(), PracticeSet.Category.ENTRANCE));
            set.setMarksPerQuestion(Objects.requireNonNullElse(r.marksPerQuestion(), BigDecimal.ONE));
            set.setNegativeMarks(Objects.requireNonNullElse(r.negativeMarks(), BigDecimal.ZERO));
            set.setLevel(r.level().trim());
            set.setDescription(r.description().trim());
            set.setDurationMinutes(r.durationMinutes());
            set.setDisplayOrder(Objects.requireNonNullElse(r.displayOrder(), 100));
            set.setPublished(r.published());
            set.setReviewedOn(r.reviewedOn());
            set.setContent(r.content());
            set = repository.saveAndFlush(set);
            auditService.record("PRACTICE_IMPORT", "PRACTICE_SET", set.getId(),
                    "slug=" + r.slug() + ", questions=" + r.content().questions().size() + ", published=" + r.published()
                            + ", reviewedOn=" + r.reviewedOn());
            slugs.add(r.slug());
        }
        return slugs;
    }

    private void validate(PracticeImportRequest.SetRecord r) {
        String at = "sets[" + r.slug() + "]";
        if (r.kind() == PracticeSet.Kind.MOCK && r.durationMinutes() == null) {
            throw new BusinessValidationException(at + ".durationMinutes", "a mock test needs a time limit");
        }
        if (r.published() && r.reviewedOn() == null) {
            throw new BusinessValidationException(at + ".reviewedOn", "a set is published only after its questions are reviewed");
        }
        if (r.reviewedOn() != null && r.reviewedOn().isAfter(LocalDate.now(clock))) {
            throw new BusinessValidationException(at + ".reviewedOn", "the review date is in the future");
        }
        BigDecimal marks = Objects.requireNonNullElse(r.marksPerQuestion(), BigDecimal.ONE);
        if (r.negativeMarks() != null && r.negativeMarks().compareTo(marks) > 0) {
            throw new BusinessValidationException(at + ".negativeMarks", "cannot be more than the marks for a correct answer");
        }
        Map<String, PracticeContent.Passage> passageById = new HashMap<>();
        r.content().passages().forEach(p -> passageById.put(p.id(), p));
        Set<String> passageIds = passageById.keySet();
        Set<String> questionIds = new HashSet<>();
        for (PracticeContent.Question q : r.content().questions()) {
            if (!questionIds.add(q.id())) {
                throw new BusinessValidationException(at, "question id '" + q.id() + "' appears more than once");
            }
            if (q.answer() >= q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' has no option " + q.answer());
            }
            if (new HashSet<>(q.options().stream().map(o -> o.trim().toLowerCase(java.util.Locale.ROOT)).toList()).size()
                    != q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' repeats an option");
            }
            if (q.optionFigures() != null && q.optionFigures().size() != q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' needs one figure per option");
            }
            if (q.passageId() != null && !passageIds.contains(q.passageId())) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' refers to a missing passage");
            }
            if (q.hi() != null) {
                // The answer index is shared, so the Hindi options must line up one-to-one with the English ones.
                if (q.hi().options().size() != q.options().size()) {
                    throw new BusinessValidationException(at, "question '" + q.id() + "' needs one Hindi option per option");
                }
                if (new HashSet<>(q.hi().options().stream().map(String::trim).toList()).size() != q.options().size()) {
                    throw new BusinessValidationException(at, "question '" + q.id() + "' repeats a Hindi option");
                }
                if (q.passageId() != null && passageById.get(q.passageId()).hi() == null) {
                    throw new BusinessValidationException(at, "question '" + q.id() + "' is in Hindi but its passage is not");
                }
            }
        }
    }

    private PracticeSet published(String slug) {
        return repository.findBySlugAndPublishedTrue(slug).orElseThrow(() -> new ResourceNotFoundException("Practice set", slug));
    }

    private static PracticeSetSummaryDto summary(PracticeSet s) {
        List<PracticeContent.Question> questions = s.getContent().questions();
        List<String> sections = questions.stream().map(PracticeContent.Question::section).distinct().toList();
        List<String> chapters = questions.stream().map(PracticeContent.Question::chapter).filter(Objects::nonNull).distinct().toList();
        boolean hindi = questions.stream().allMatch(q -> q.hi() != null)
                && s.getContent().passages().stream().allMatch(p -> p.hi() != null);
        return new PracticeSetSummaryDto(s.getSlug(), s.getExamSlug(), s.getTitle(), s.getKind(), s.getLevel(),
                s.getDescription(), s.getDurationMinutes(), questions.size(), sections, s.getReviewedOn(), s.getCategory(),
                plain(s.getMarksPerQuestion()), plain(s.getNegativeMarks()), hindi, chapters);
    }
}
