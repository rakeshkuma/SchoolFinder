import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CriterionContribution, EvidenceType } from '../../types/api';

const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  VERIFIED_SCORE: 'Verified score',
  PARENT_REVIEWS: 'Approved parent reviews',
  DOCUMENTED_FACILITIES: 'Facility checklist',
  PUBLISHED_RATIO: 'Published student–teacher ratio',
};

/**
 * Horizontal bars of each criterion's normalised score, then the evidence behind each one. Criteria without evidence
 * are listed, not drawn as zero; documented but unverified evidence is labelled as such.
 */
export function RankingBreakdown({ breakdown }: { breakdown: CriterionContribution[] }) {
  const withData = breakdown.filter((c) => c.dataAvailable);
  const missing = breakdown.filter((c) => !c.dataAvailable);
  return (
    <div>
      {withData.length > 0 && (
        <div style={{ height: Math.max(160, withData.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={withData} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="criterionName" width={170} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, _name, item) => [
                  `${value} / 100 (weight ${(item.payload as CriterionContribution).weight}%)`,
                  'Score',
                ]}
              />
              <Bar dataKey="normalizedScore" fill="#1d5dee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {withData.length > 0 && (
        <ul className="mt-3 space-y-2 text-xs">
          {withData.map((c) => (
            <li key={c.criterionCode} className="rounded-md border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">{c.criterionName}</span>
                <span className="text-slate-500">
                  {c.normalizedScore} / 100 · weight {c.weight}%
                </span>
                {c.verified === false ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">Documented, not verified</span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">Verified</span>
                )}
                {c.evidenceType && <span className="text-slate-500">{EVIDENCE_LABEL[c.evidenceType]}</span>}
              </div>
              {c.evidenceNote && <p className="mt-1 text-slate-600">{c.evidenceNote}</p>}
              {c.sourceUrl && (
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow"
                  className="mt-1 inline-block text-brand-700 underline">
                  Source
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          No evidence yet for: {missing.map((m) => `${m.criterionName} (${m.weight}%)`).join(', ')}. Missing evidence
          is not scored as zero.
        </p>
      )}
    </div>
  );
}
