package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.practice.AttemptDtos;
import com.indiaschoolfinder.dto.practice.AttemptRequest;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.entity.MemberBookmark;
import com.indiaschoolfinder.entity.MemberSavedExam;
import com.indiaschoolfinder.entity.PracticeAttempt;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.ExamRepository;
import com.indiaschoolfinder.repository.MemberBookmarkRepository;
import com.indiaschoolfinder.repository.MemberSavedExamRepository;
import com.indiaschoolfinder.repository.PracticeAttemptRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * A member's practice history and saved exams. Every query is scoped to the signed-in member's account id, so one
 * member can never read or change another's data; another member's attempt id simply does not exist.
 */
@Service
@Transactional(readOnly = true)
public class MemberPracticeService {

    static final int MAX_SAVED_EXAMS = 50;
    static final int MAX_BOOKMARKS = 300;
    static final int MAX_HISTORY = 200;

    private final PracticeService practiceService;
    private final PracticeAttemptRepository attempts;
    private final MemberSavedExamRepository savedExams;
    private final ExamRepository exams;
    private final MemberBookmarkRepository bookmarks;

    public MemberPracticeService(PracticeService practiceService, PracticeAttemptRepository attempts,
                                 MemberSavedExamRepository savedExams, ExamRepository exams,
                                 MemberBookmarkRepository bookmarks) {
        this.practiceService = practiceService;
        this.attempts = attempts;
        this.savedExams = savedExams;
        this.exams = exams;
        this.bookmarks = bookmarks;
    }

    /** The member's latest attempts (at most 200, newest first) for the progress dashboard. */
    public List<AttemptDtos.HistoryItem> history(long accountId, int limit) {
        return attempts.findTop200ByAccountIdOrderByCreatedAtDescIdDesc(accountId).stream()
                .limit(Math.max(1, Math.min(MAX_HISTORY, limit)))
                .map(a -> new AttemptDtos.HistoryItem(summary(a),
                        Objects.requireNonNullElse(a.getResponses().score().topics(), List.of()),
                        a.getResponses().score().questions().stream()
                                .map(q -> new AttemptDtos.QuestionOutcome(q.id(), q.chosen() != null, q.correct()))
                                .toList()))
                .toList();
    }

    // --- bookmarks --------------------------------------------------------------------------------------------------

    public List<String> bookmarks(long accountId) {
        return bookmarks.findByAccountIdOrderByCreatedAtDescIdDesc(accountId).stream().map(MemberBookmark::getQuestionId).toList();
    }

    /** Bookmarks a published question; bookmarking it again changes nothing. */
    @Transactional
    public List<String> addBookmark(long accountId, String questionId) {
        if (!practiceService.bankIndex().containsKey(questionId)) {
            throw new ResourceNotFoundException("Practice question", questionId);
        }
        bookmark(accountId, questionId);
        return bookmarks(accountId);
    }

    @Transactional
    public List<String> removeBookmark(long accountId, String questionId) {
        bookmarks.findByAccountIdAndQuestionId(accountId, questionId).ifPresent(bookmarks::delete);
        return bookmarks(accountId);
    }

    /** Adds bookmarks made before signing in; questions no longer in the bank are skipped, and so is anything over the limit. */
    @Transactional
    public List<String> mergeBookmarks(long accountId, List<String> questionIds) {
        Set<String> known = practiceService.bankIndex().keySet();
        List<String> wanted = new java.util.ArrayList<>(new java.util.LinkedHashSet<>(questionIds));
        java.util.Collections.reverse(wanted); // oldest first, so the newest bookmark stays newest
        for (String id : wanted) {
            if (known.contains(id) && bookmarks.countByAccountId(accountId) < MAX_BOOKMARKS) {
                bookmark(accountId, id);
            }
        }
        return bookmarks(accountId);
    }

    private void bookmark(long accountId, String questionId) {
        if (bookmarks.findByAccountIdAndQuestionId(accountId, questionId).isPresent()) return;
        if (bookmarks.countByAccountId(accountId) >= MAX_BOOKMARKS) {
            throw new BusinessValidationException("questionId", "you can bookmark up to " + MAX_BOOKMARKS + " questions");
        }
        MemberBookmark b = new MemberBookmark();
        b.setAccountId(accountId);
        b.setQuestionId(questionId);
        bookmarks.save(b);
    }

    // --- attempts ---------------------------------------------------------------------------------------------------

    /**
     * Scores the attempt on the server and saves it. The same clientId again returns the saved result unchanged
     * (also when two identical requests race: the unique constraint decides and the loser reads the winner's row).
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public AttemptDtos.Saved record(long accountId, AttemptRequest r) {
        var existing = attempts.findByAccountIdAndClientId(accountId, r.clientId());
        if (existing.isPresent()) {
            return saved(existing.get(), true);
        }
        ScoreResultDto score = practiceService.scoreBank(r.questionIds(), r.answers());
        PracticeAttempt a = new PracticeAttempt();
        a.setAccountId(accountId);
        a.setClientId(r.clientId());
        a.setTitle(r.title().trim());
        a.setMode(r.mode());
        a.setExamSlug(r.examSlug());
        a.setSetSlug(r.setSlug());
        a.setTotal(score.total());
        a.setAttempted(score.attempted());
        a.setCorrect(score.correct());
        a.setMarks(score.marks());
        a.setMaxMarks(score.maxMarks());
        a.setDurationSeconds(r.durationSeconds());
        a.setResponses(new PracticeAttempt.Responses(List.copyOf(r.questionIds()), Map.copyOf(r.answers()), score));
        try {
            return saved(attempts.saveAndFlush(a), false);
        } catch (DataIntegrityViolationException race) {
            return attempts.findByAccountIdAndClientId(accountId, r.clientId()).map(x -> saved(x, true)).orElseThrow(() -> race);
        }
    }

    public PageResponse<AttemptDtos.Summary> list(long accountId, int page, int size) {
        Page<PracticeAttempt> p = attempts.findByAccountIdOrderByCreatedAtDescIdDesc(accountId, PageRequest.of(page, size));
        return new PageResponse<>(p.getContent().stream().map(MemberPracticeService::summary).toList(), p.getNumber(),
                p.getSize(), p.getTotalElements(), p.getTotalPages(), p.isFirst(), p.isLast());
    }

    public AttemptDtos.Detail get(long accountId, long id) {
        PracticeAttempt a = attempts.findByIdAndAccountId(id, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Practice attempt", id));
        return new AttemptDtos.Detail(summary(a), a.getResponses().questionIds(), a.getResponses().answers(), a.getResponses().score());
    }

    /** Questions whose latest answer (across the member's last 200 attempts) was wrong, newest first, up to 100. */
    public AttemptDtos.Revision revision(long accountId) {
        Map<String, Boolean> latest = new LinkedHashMap<>(); // question id -> answered wrongly last time
        for (PracticeAttempt a : attempts.findTop200ByAccountIdOrderByCreatedAtDescIdDesc(accountId)) {
            for (ScoreResultDto.QuestionResult q : a.getResponses().score().questions()) {
                if (q.chosen() != null) latest.putIfAbsent(q.id(), !q.correct());
            }
        }
        Set<String> published = practiceService.bankIndex().keySet();
        List<String> ids = new ArrayList<>();
        latest.forEach((id, wrong) -> {
            if (wrong && published.contains(id) && ids.size() < 100) ids.add(id);
        });
        return new AttemptDtos.Revision(ids);
    }

    private static AttemptDtos.Saved saved(PracticeAttempt a, boolean duplicate) {
        return new AttemptDtos.Saved(summary(a), a.getResponses().score(), duplicate);
    }

    private static AttemptDtos.Summary summary(PracticeAttempt a) {
        return new AttemptDtos.Summary(a.getId(), a.getTitle(), a.getMode(), a.getExamSlug(), a.getSetSlug(), a.getTotal(),
                a.getAttempted(), a.getCorrect(), a.getDurationSeconds(), a.getCreatedAt(), a.getResponses().score().sections(),
                a.getMarks(), a.getMaxMarks());
    }

    // --- saved exams ------------------------------------------------------------------------------------------------

    public List<String> savedExams(long accountId) {
        return savedExams.findByAccountIdOrderByCreatedAtDescIdDesc(accountId).stream().map(MemberSavedExam::getExamSlug).toList();
    }

    @Transactional
    public List<String> saveExam(long accountId, String slug) {
        if (exams.findBySlugAndPublishedTrue(slug).isEmpty()) {
            throw new ResourceNotFoundException("Exam", slug);
        }
        add(accountId, slug);
        return savedExams(accountId);
    }

    @Transactional
    public List<String> removeExam(long accountId, String slug) {
        savedExams.findByAccountIdAndExamSlug(accountId, slug).ifPresent(savedExams::delete);
        return savedExams(accountId);
    }

    /** Adds exams saved before signing in; slugs of exams that are not published are skipped. */
    @Transactional
    public List<String> merge(long accountId, List<String> slugs) {
        Set<String> known = new HashSet<>();
        exams.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc().forEach(e -> known.add(e.getSlug()));
        for (String slug : new java.util.LinkedHashSet<>(slugs)) {
            if (known.contains(slug)) add(accountId, slug);
        }
        return savedExams(accountId);
    }

    private void add(long accountId, String slug) {
        if (savedExams.findByAccountIdAndExamSlug(accountId, slug).isPresent()) return;
        if (savedExams.countByAccountId(accountId) >= MAX_SAVED_EXAMS) {
            throw new BusinessValidationException("slug", "you can save up to " + MAX_SAVED_EXAMS + " exams");
        }
        MemberSavedExam s = new MemberSavedExam();
        s.setAccountId(accountId);
        s.setExamSlug(slug);
        savedExams.save(s);
    }
}
