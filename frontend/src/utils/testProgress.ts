/**
 * A test in progress, kept in sessionStorage so a reload or an accidental navigation does not lose it. It holds only
 * the visitor's own choices (never answers from the server), lives in this tab only and is cleared on submit or exit.
 */
export interface TestProgress {
  /** The questions of the sitting, in order; progress is restored only for exactly the same questions. */
  questionIds: string[];
  answers: Record<string, number>;
  marked: string[];
  visited: string[];
  index: number;
  startedAt: number;
  /** null: untimed */
  endsAt: number | null;
}

const PREFIX = 'isf.practice.progress:';

export function saveProgress(key: string, progress: TestProgress) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(progress));
  } catch {
    /* storage full or unavailable: the test simply cannot be resumed after a reload */
  }
}

/** The saved progress for this sitting, or null when there is none or it was for different questions. */
export function loadProgress(key: string, questionIds: string[]): TestProgress | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const p = JSON.parse(raw) as TestProgress;
    const same = Array.isArray(p.questionIds) && p.questionIds.length === questionIds.length
      && p.questionIds.every((id, i) => id === questionIds[i]);
    if (!same || typeof p.answers !== 'object' || p.answers === null) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    // Keep only answers to this sitting's questions, as option indexes.
    const answers = Object.fromEntries(Object.entries(p.answers)
      .filter(([id, v]) => questionIds.includes(id) && Number.isInteger(v) && v >= 0 && v < 5));
    return {
      questionIds, answers,
      marked: (p.marked ?? []).filter((id) => questionIds.includes(id)),
      visited: (p.visited ?? []).filter((id) => questionIds.includes(id)),
      index: Number.isInteger(p.index) && p.index >= 0 && p.index < questionIds.length ? p.index : 0,
      startedAt: Number(p.startedAt) || Date.now(),
      endsAt: p.endsAt === null || p.endsAt === undefined ? null : Number(p.endsAt),
    };
  } catch {
    return null;
  }
}

export function clearProgress(key: string) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to clear */
  }
}
