import type { RankingCriterion, RankingStatus } from '../types/api';

/** One criterion's evidence in the worked example; null score = no evidence. */
export interface ExampleEvidence {
  code: string;
  score: number | null;
  verified: boolean;
  basis: string;
}

export interface ExampleRow extends ExampleEvidence {
  name: string;
  weight: number;
  /** points this criterion adds to the final score */
  contribution: number | null;
}

export interface ExampleResult {
  rows: ExampleRow[];
  score: number | null;
  coveragePercent: number;
  verifiedCoveragePercent: number;
  status: RankingStatus;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Applies the published formula (same as the server's ranking engine) to illustrative evidence, using the live
 * criterion weights so the worked example always matches the current methodology.
 */
export function scoreExample(criteria: RankingCriterion[], evidence: ExampleEvidence[], minVerifiedPercent: number): ExampleResult {
  const active = criteria.filter((c) => c.active).sort((a, b) => a.displayOrder - b.displayOrder);
  const byCode = new Map(evidence.map((e) => [e.code, e]));
  const total = active.reduce((s, c) => s + c.weight, 0);
  let covered = 0;
  let verified = 0;
  let weighted = 0;
  for (const c of active) {
    const e = byCode.get(c.code);
    if (e?.score == null) continue;
    covered += c.weight;
    if (e.verified) verified += c.weight;
    weighted += c.weight * e.score;
  }
  const rows: ExampleRow[] = active.map((c) => {
    const e = byCode.get(c.code) ?? { code: c.code, score: null, verified: false, basis: 'No evidence' };
    return {
      ...e,
      name: c.name,
      weight: c.weight,
      contribution: e.score == null || covered === 0 ? null : round2((c.weight * e.score) / covered),
    };
  });
  const coveragePercent = total === 0 ? 0 : round2((covered * 100) / total);
  const verifiedCoveragePercent = total === 0 ? 0 : round2((verified * 100) / total);
  const status: RankingStatus = covered === 0 ? 'NOT_YET_RANKED'
    : verifiedCoveragePercent < minVerifiedPercent ? 'PROVISIONAL' : 'RANKED';
  return { rows, score: covered === 0 ? null : round2(weighted / covered), coveragePercent, verifiedCoveragePercent, status };
}
