import { useEffect } from 'react';
import { memberPracticeService, type AttemptInput } from '../services/accountApi';
import { practiceService } from '../services/publicApi';
import type { PracticeMode, PracticeScore } from '../types/api';
import { createLocalList } from '../utils/localList';
import { useMember } from './useMember';
import { savedExams } from './usePersonal';

/**
 * Practice progress. Guests can practise without an account: their results and mistakes are kept in this browser
 * only. Signed-in members' attempts are scored and saved by the server (and so follow them across devices); on
 * sign-in, results and saved exams from this browser are added to the account, never lost or duplicated.
 */

/** A finished attempt as kept in the browser (scores are the server's, from scoring the attempt). */
export interface LocalAttempt {
  clientId: string;
  title: string;
  mode: PracticeMode;
  examSlug: string | null;
  setSlug: string | null;
  /** Bank ids ("set-slug/question-id"), so the attempt can be replayed or uploaded later. */
  questionIds: string[];
  answers: Record<string, number>;
  durationSeconds: number | null;
  total: number;
  attempted: number;
  correct: number;
  createdAt: string;
  sections: PracticeScore['sections'];
  topics: PracticeScore['topics'];
  /** Per question (bank ids): attempted and right. Missing in attempts kept before this was recorded. */
  results?: { id: string; attempted: boolean; correct: boolean }[];
  marks?: number | null;
  maxMarks?: number | null;
  /** true once saved to the member's account */
  synced: boolean;
}

export const localAttempts = createLocalList<LocalAttempt>('isf.practiceAttempts', 30, (a) => a.clientId);
/** Bank ids last answered wrongly in this browser, newest first: the guest's revision list. */
export const wrongQuestions = createLocalList<string>('isf.practiceWrong', 100, (id) => id);
/** Bank ids bookmarked in this browser, newest first; members' bookmarks are mirrored here. */
export const bookmarks = createLocalList<string>('isf.practiceBookmarks', 300, (id) => id);

/** Bookmarks or un-bookmarks a question in this browser and, for members, in their account. */
export async function toggleBookmark(id: string, signedIn: boolean): Promise<void> {
  const on = bookmarks.get().includes(id);
  if (on) bookmarks.remove(id); else bookmarks.add(id);
  if (!signedIn) return;
  try {
    bookmarks.replace(on ? await memberPracticeService.removeBookmark(id) : await memberPracticeService.addBookmark(id));
  } catch {
    // keep the local change; the next sign-in merges it
  }
}

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // RFC 4122 version 4 from Math.random — only an idempotency key, not a secret.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

/** Keeps the revision list in step with a scored attempt: wrong answers join it, right answers leave it. */
function updateRevision(score: PracticeScore, idOf: (resultId: string) => string) {
  for (const q of score.questions) {
    if (q.chosen === null) continue;
    if (q.correct) wrongQuestions.remove(idOf(q.id)); else wrongQuestions.add(idOf(q.id));
  }
}

/**
 * Scores an attempt on the server. Members' attempts are saved to their account (a repeated submission with the same
 * clientId returns the first result) and the result uses bank ids; guests' are scored without being stored, and kept
 * in this browser. `toBankId` maps the ids of a guest result to bank ids (identity for bank sessions).
 */
export async function scoreAttempt(
  signedIn: boolean,
  input: AttemptInput,
  guestScore: () => Promise<PracticeScore>,
  toBankId: (resultId: string) => string = (id) => id,
): Promise<{ score: PracticeScore; saved: boolean }> {
  let score: PracticeScore;
  let saved = false;
  if (signedIn) {
    score = (await memberPracticeService.record(input)).score;
    saved = true;
  } else {
    score = await guestScore();
  }
  updateRevision(score, signedIn ? (id) => id : toBankId);
  localAttempts.add({
    clientId: input.clientId,
    title: input.title,
    mode: input.mode,
    examSlug: input.examSlug ?? null,
    setSlug: input.setSlug ?? null,
    questionIds: input.questionIds,
    answers: input.answers,
    durationSeconds: input.durationSeconds ?? null,
    total: score.total,
    attempted: score.attempted,
    correct: score.correct,
    createdAt: new Date().toISOString(),
    sections: score.sections,
    topics: score.topics,
    results: score.questions.map((q) => ({
      id: signedIn ? q.id : toBankId(q.id), attempted: q.chosen !== null, correct: q.correct,
    })),
    marks: score.marks,
    maxMarks: score.maxMarks,
    synced: saved,
  });
  return { score, saved };
}

/**
 * Mounted once (in the layout): when a member is signed in, adds the exams saved in this browser to the account and
 * mirrors the account's list here, then uploads results practised here as a guest. Both are safe to repeat.
 */
export function usePracticeSync() {
  const { status } = useMember();
  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const merged = await memberPracticeService.mergeSavedExams(savedExams.get());
        if (!cancelled) savedExams.replace(merged);
      } catch {
        // offline or session ended: the browser list stays as it is
      }
      try {
        const merged = await memberPracticeService.mergeBookmarks(bookmarks.get());
        if (!cancelled) bookmarks.replace(merged);
      } catch {
        // as above: bookmarks in this browser are kept and merged next time
      }
      for (const a of localAttempts.get().filter((x) => !x.synced)) {
        if (cancelled) return;
        try {
          await memberPracticeService.record({
            clientId: a.clientId, title: a.title, mode: a.mode, examSlug: a.examSlug, setSlug: a.setSlug,
            questionIds: a.questionIds, answers: a.answers, durationSeconds: a.durationSeconds,
          });
          localAttempts.replace(localAttempts.get().map((x) => (x.clientId === a.clientId ? { ...x, synced: true } : x)));
        } catch {
          // e.g. a question since removed from the bank: keep it in this browser only
        }
      }
    })();
    return () => { cancelled = true; };
  }, [status]);
}

/** Saves or unsaves an exam in this browser and, for members, in their account. */
export async function toggleSavedExam(slug: string, signedIn: boolean): Promise<void> {
  const saved = savedExams.get().includes(slug);
  if (saved) savedExams.remove(slug); else savedExams.add(slug);
  if (!signedIn) return;
  try {
    savedExams.replace(saved ? await memberPracticeService.removeExam(slug) : await memberPracticeService.saveExam(slug));
  } catch {
    // keep the local change; the next sign-in merges it
  }
}

/** Revision questions: the member's from the server merged with this browser's (guests: this browser's only). */
export async function revisionIds(signedIn: boolean): Promise<string[]> {
  const local = wrongQuestions.get();
  if (!signedIn) return local;
  try {
    const server = await memberPracticeService.revision();
    return [...new Set([...server, ...local])].slice(0, 100);
  } catch {
    return local;
  }
}

/** Bank ids that still exist (questions can be retired); used before replaying a stored list. */
export async function existingIds(ids: string[]): Promise<string[]> {
  const bank = await practiceService.bank();
  const known = new Set(bank.questions.map((q) => q.id));
  return ids.filter((id) => known.has(id));
}
