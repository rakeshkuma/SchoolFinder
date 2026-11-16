import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import type { PlaceSummary } from '../../types/api';

const n = (v: number) => v.toLocaleString('en-IN');

/**
 * A state's, district's or town's schools at a glance: the server's introduction (written only from these numbers) and
 * the counts behind it. The server-rendered HTML shows the same text (SeoBodyService.placeIntro).
 */
export function PlaceOverview({ summary: s }: { summary: PlaceSummary }) {
  if (s.total === 0 || !s.intro) return null;
  const tiles = [
    { label: 'Schools listed', value: s.total },
    ...s.boards.map((c) => ({ label: c.label, value: c.count })),
    ...s.types.map((c) => ({ label: c.label, value: c.count })),
    ...s.networks.map((c) => ({ label: c.count === 1 ? c.label : `${c.label}s`, value: c.count })),
    ...(s.boarding > 0 ? [{ label: 'With boarding', value: s.boarding }] : []),
    ...(s.seniorSecondary > 0 ? [{ label: 'Up to Class XII', value: s.seniorSecondary }] : []),
  ];
  return (
    <section aria-labelledby="place-glance-h" className="card mb-8 p-5 sm:p-6">
      <h2 id="place-glance-h" className="font-display text-lg font-bold text-ink">{s.place} at a glance</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">{s.intro}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <dt className="text-xs font-medium text-slate-500">{t.label}</dt>
            <dd className="mt-0.5 font-display text-xl font-bold text-ink">{n(t.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Questions about the place's schools, answered from the same numbers, and pages that fit the place. */
export function PlaceQuestions({ summary: s }: { summary: PlaceSummary }) {
  if (s.faqs.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="place-faq-h">
      <h2 id="place-faq-h" className="font-display text-xl font-bold text-ink">Questions about schools in {s.place}</h2>
      <p className="mt-1 text-sm text-slate-500">Answered from the schools listed here. Confirm important details with the school.</p>
      <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {s.faqs.map((f) => (
          <details key={f.question} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
              {f.question}
              <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 break-words text-sm leading-relaxed text-slate-700">{f.answer}</p>
          </details>
        ))}
      </div>
      {s.related.length > 0 && (
        <nav aria-label="Related pages" className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Related:</span>
          {s.related.map((l) => (
            <Link key={l.href} to={l.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
