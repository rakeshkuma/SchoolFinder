package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.PracticeContent;
import com.indiaschoolfinder.dto.practice.PracticeImportRequest;
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

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Practice quizzes and mock tests. Sets are served without answers; an attempt is scored here and returned with the
 * correct answers and explanations. Attempts are not stored.
 */
@Service
@Transactional(readOnly = true)
public class PracticeService {

    private final PracticeSetRepository repository;
    private final AuditService auditService;

    public PracticeService(PracticeSetRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    /** Published sets, optionally only those for one exam guide. */
    public List<PracticeSetSummaryDto> list(String examSlug) {
        return repository.findByPublishedTrueOrderByDisplayOrderAscTitleAsc().stream()
                .filter(s -> examSlug == null || examSlug.isBlank() || examSlug.equals(s.getExamSlug()))
                .map(PracticeService::summary)
                .toList();
    }

    public PracticeSetDto get(String slug) {
        PracticeSet set = published(slug);
        return new PracticeSetDto(summary(set), set.getContent().passages(), set.getContent().questions().stream()
                .map(q -> new PracticeSetDto.QuestionDto(q.id(), q.section(), q.topic(), q.passageId(), q.prompt(), q.options(),
                        q.figure(), q.figureAsksNext(), q.optionFigures()))
                .toList());
    }

    public ScoreResultDto score(String slug, ScoreRequest request) {
        PracticeSet set = published(slug);
        List<PracticeContent.Question> questions = set.getContent().questions();
        Set<String> ids = new HashSet<>();
        questions.forEach(q -> ids.add(q.id()));
        for (Map.Entry<String, Integer> e : request.answers().entrySet()) {
            if (!ids.contains(e.getKey())) {
                throw new BusinessValidationException("answers", "unknown question '" + e.getKey() + "'");
            }
        }
        Map<String, int[]> sections = new LinkedHashMap<>(); // total, attempted, correct
        List<ScoreResultDto.QuestionResult> results = new ArrayList<>();
        int attempted = 0;
        int correct = 0;
        for (PracticeContent.Question q : questions) {
            Integer chosen = request.answers().get(q.id());
            if (chosen != null && (chosen < 0 || chosen >= q.options().size())) {
                throw new BusinessValidationException("answers", "option " + chosen + " does not exist for '" + q.id() + "'");
            }
            boolean right = chosen != null && chosen.equals(q.answer());
            int[] s = sections.computeIfAbsent(q.section(), k -> new int[3]);
            s[0]++;
            if (chosen != null) {
                s[1]++;
                attempted++;
            }
            if (right) {
                s[2]++;
                correct++;
            }
            results.add(new ScoreResultDto.QuestionResult(q.id(), chosen, q.answer(), right, q.explanation()));
        }
        return new ScoreResultDto(questions.size(), attempted, correct, sections.entrySet().stream()
                .map(e -> new ScoreResultDto.SectionScore(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .toList(), results);
    }

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
            set.setLevel(r.level().trim());
            set.setDescription(r.description().trim());
            set.setDurationMinutes(r.durationMinutes());
            set.setDisplayOrder(Objects.requireNonNullElse(r.displayOrder(), 100));
            set.setPublished(r.published());
            set.setContent(r.content());
            set = repository.saveAndFlush(set);
            auditService.record("PRACTICE_IMPORT", "PRACTICE_SET", set.getId(),
                    "slug=" + r.slug() + ", questions=" + r.content().questions().size() + ", published=" + r.published());
            slugs.add(r.slug());
        }
        return slugs;
    }

    private static void validate(PracticeImportRequest.SetRecord r) {
        String at = "sets[" + r.slug() + "]";
        if (r.kind() == PracticeSet.Kind.MOCK && r.durationMinutes() == null) {
            throw new BusinessValidationException(at + ".durationMinutes", "a mock test needs a time limit");
        }
        Set<String> passageIds = new HashSet<>();
        r.content().passages().forEach(p -> passageIds.add(p.id()));
        Set<String> questionIds = new HashSet<>();
        for (PracticeContent.Question q : r.content().questions()) {
            if (!questionIds.add(q.id())) {
                throw new BusinessValidationException(at, "question id '" + q.id() + "' appears more than once");
            }
            if (q.answer() >= q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' has no option " + q.answer());
            }
            if (new HashSet<>(q.options()).size() != q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' repeats an option");
            }
            if (q.optionFigures() != null && q.optionFigures().size() != q.options().size()) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' needs one figure per option");
            }
            if (q.passageId() != null && !passageIds.contains(q.passageId())) {
                throw new BusinessValidationException(at, "question '" + q.id() + "' refers to a missing passage");
            }
        }
    }

    private PracticeSet published(String slug) {
        return repository.findBySlugAndPublishedTrue(slug).orElseThrow(() -> new ResourceNotFoundException("Practice set", slug));
    }

    private static PracticeSetSummaryDto summary(PracticeSet s) {
        List<String> sections = s.getContent().questions().stream().map(PracticeContent.Question::section).distinct().toList();
        return new PracticeSetSummaryDto(s.getSlug(), s.getExamSlug(), s.getTitle(), s.getKind(), s.getLevel(),
                s.getDescription(), s.getDurationMinutes(), s.getContent().questions().size(), sections);
    }
}
