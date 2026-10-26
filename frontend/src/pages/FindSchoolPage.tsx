import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState, SkeletonCards } from '../components/common/States';
import { ShareLinkButtons } from '../components/common/ShareLinkButtons';
import { SchoolCard } from '../components/school/SchoolCard';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { locationService, referenceService, schoolService } from '../services/publicApi';
import type { GenderType, SchoolSummary } from '../types/api';
import {
  activeRequirements, BUDGETS, FINDER_FACILITIES as FACILITIES, hasLocation, readCriteria, relax, toParams, writeCriteria,
  type BudgetKey, type Criteria, type Relaxable,
} from '../utils/finder';
import { facilityCategoryLabel, formatMoneyCompact, genderLabel } from '../utils/format';
import { formatDistance } from '../utils/geo';

const RADII = [3, 5, 10, 25];

/**
 * Guided search for parents: where, which class, budget, board, co-ed or not, day or boarding, facilities and open
 * admissions. Results are "confirmed matches" (the school's sources state every requirement, with the reasons shown),
 * then schools in the same area whose sources do not yet state everything — clearly labelled, never presented as matches.
 */
export function FindSchoolPage() {
  useDocumentTitle('Find the right school');
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = readCriteria(searchParams);
  const [draft, setDraft] = useState<Criteria>(criteria);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const states = useApi(() => locationService.states(), []);
  const districts = useApi(() => locationService.districts(draft.state as string), [draft.state], !!draft.state);
  const classes = useApi(() => referenceService.classes(), []);
  const boards = useApi(() => referenceService.boards(), []);
  const ready = hasLocation(criteria);

  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const locate = () => {
    if (!navigator.geolocation) { setLocationError('This browser cannot share a location; choose a state instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setDraft((d) => ({ ...d, lat: p.coords.latitude, lon: p.coords.longitude, state: undefined, district: undefined })); setLocationError(null); setLocating(false); },
      () => { setLocationError('Location was not shared; choose a state instead.'); setLocating(false); },
      { timeout: 10000, maximumAge: 300000 },
    );
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); setSearchParams(writeCriteria(draft)); };
  const apply = (next: Criteria) => { setDraft(next); setSearchParams(writeCriteria(next)); };
  const className = (code?: string) => classes.data?.find((c) => c.code === code)?.name ?? code;
  const choice = 'chip px-3 py-1.5 text-sm ring-1 ring-inset';
  const on = (active: boolean) => (active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300');

  return (
    <>
      <PageHeader eyebrow="Guided search" title="Find the right school for your child"
        subtitle="Tell us what matters to your family. We show schools whose official sources confirm it, explain why each one matches, and list nearby schools that have not published those details yet." />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="card h-fit space-y-5 p-5 lg:sticky lg:top-24" aria-label="What your family needs">
          <fieldset className="space-y-2">
            <legend className="label">Where</legend>
            <button type="button" className="btn-secondary w-full rounded-full" onClick={locate} disabled={locating}>
              <Icon name="pin" className="h-4 w-4" /> {locating ? 'Finding you…' : draft.lat !== undefined ? 'Near my location ✓' : 'Near my location'}
            </button>
            {draft.lat !== undefined ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-slate-600">Within</span>
                {RADII.map((r) => <button key={r} type="button" className={`${choice} ${on(draft.r === r)}`} onClick={() => set('r', r)}>{r} km</button>)}
                <button type="button" className="btn-ghost text-xs" onClick={() => setDraft((d) => ({ ...d, lat: undefined, lon: undefined }))}>Choose a state instead</button>
              </div>
            ) : (
              <>
                <select className="input" aria-label="State or union territory" value={draft.state ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value || undefined, district: undefined }))}>
                  <option value="">or choose a state / UT…</option>
                  {(states.data ?? []).filter((s) => s.schoolCount > 0).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
                {draft.state && (
                  <select className="input" aria-label="District" value={draft.district ?? ''} onChange={(e) => set('district', e.target.value || undefined)}>
                    <option value="">Any district</option>
                    {(districts.data ?? []).map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                  </select>
                )}
              </>
            )}
            {locationError && <p className="text-xs text-amber-700">{locationError}</p>}
            {draft.lat !== undefined && <p className="text-xs text-slate-500">Your location stays in your browser and the link; it is not stored by us.</p>}
          </fieldset>

          <label className="block"><span className="label">Admission to class</span>
            <select className="input" value={draft.cls ?? ''} onChange={(e) => set('cls', e.target.value || undefined)}>
              <option value="">Any class</option>
              {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>

          <label className="block"><span className="label">Board</span>
            <select className="input" value={draft.board ?? ''} onChange={(e) => set('board', e.target.value || undefined)}>
              <option value="">Any board</option>
              {(boards.data ?? []).filter((b) => b.code !== 'OTHER').map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC' : b.code === 'STATE' ? 'State board' : b.code}</option>)}
            </select>
          </label>

          <fieldset>
            <legend className="label">Annual fee budget</legend>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={`${choice} ${on(!draft.budget)}`} onClick={() => set('budget', undefined)}>Any</button>
              {(Object.keys(BUDGETS) as BudgetKey[]).map((k) => (
                <button key={k} type="button" className={`${choice} ${on(draft.budget === k)}`} aria-pressed={draft.budget === k} onClick={() => set('budget', k)}>{BUDGETS[k].label}</button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">Only schools that publish an official fee schedule can be matched on budget.</p>
          </fieldset>

          <fieldset>
            <legend className="label">School for</legend>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={`${choice} ${on(!draft.gender)}`} onClick={() => set('gender', undefined)}>No preference</button>
              {(['CO_ED', 'GIRLS', 'BOYS'] as GenderType[]).map((g) => (
                <button key={g} type="button" className={`${choice} ${on(draft.gender === g)}`} aria-pressed={draft.gender === g} onClick={() => set('gender', g)}>{genderLabel[g]}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Day or boarding</legend>
            <div className="flex flex-wrap gap-1.5">
              {([[undefined, 'Either'], ['day', 'Day school'], ['boarding', 'Boarding']] as const).map(([v, l]) => (
                <button key={l} type="button" className={`${choice} ${on(draft.mode === v)}`} aria-pressed={draft.mode === v} onClick={() => set('mode', v)}>{l}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Must have</legend>
            <div className="flex flex-wrap gap-1.5">
              {FACILITIES.map((f) => {
                const active = draft.fac.includes(f);
                return (
                  <button key={f} type="button" className={`${choice} ${on(active)}`} aria-pressed={active}
                    onClick={() => set('fac', active ? draft.fac.filter((x) => x !== f) : [...draft.fac, f])}>{facilityCategoryLabel[f]}</button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={draft.open} onChange={(e) => set('open', e.target.checked)} />
            Admissions open now
          </label>

          <button type="submit" className="btn-primary w-full" disabled={!hasLocation(draft)}>
            <Icon name="search" className="h-4 w-4" /> Show matching schools
          </button>
          {!hasLocation(draft) && <p className="text-center text-xs text-slate-500">Choose your location or a state first.</p>}
        </form>

        <section aria-live="polite" className="min-w-0">
          {!ready ? (
            <EmptyState title="Start with where you live.">
              Use your location or choose a state, then add what matters: class, budget, board and more.
            </EmptyState>
          ) : (
            <Results criteria={criteria} className={className} onRelax={(k) => apply(relax(criteria, k))} />
          )}
        </section>
      </div>
    </>
  );
}

const RELAX_LABEL: Record<Relaxable, string> = {
  cls: 'the class', board: 'the board', budget: 'the budget', gender: 'co-ed / boys / girls', mode: 'day / boarding',
  fac: 'the must-have facilities', open: '“admissions open now”',
};

function Results({ criteria: c, className, onRelax }: {
  criteria: Criteria; className: (code?: string) => string | undefined; onRelax: (k: Relaxable) => void;
}) {
  const required = activeRequirements(c);
  const key = JSON.stringify(c);
  const matches = useApi(() => schoolService.search(toParams(c)), [key]);
  // Only when nothing matches: how many schools each single relaxation would show.
  const nearMisses = useApi(
    () => Promise.all(required.map(async (k) => ({ k, total: (await schoolService.search(toParams(c, [k], 1))).totalElements }))),
    [key], matches.data?.totalElements === 0 && required.length > 0,
  );
  // Same area (and board, which almost every profile states), without the requirements most sources don't state.
  const unstated = required.filter((k) => k !== 'board');
  const area = useApi(() => schoolService.search(toParams(c, unstated, 24)), [key], unstated.length > 0);
  const matchIds = new Set((matches.data?.content ?? []).map((s) => s.id));
  const toCheck = (area.data?.content ?? []).filter((s) => !matchIds.has(s.id)).slice(0, 12);
  const shareUrl = `${window.location.origin}/find?${writeCriteria(c).toString()}`;

  const reasons = (s: SchoolSummary): string[] => [
    s.distanceKm !== null ? `${formatDistance(s.distanceKm)} away` : null,
    c.cls ? `Teaches ${className(c.cls)}` : null,
    c.board && s.boardCode ? (s.boardCode === 'CISCE' ? 'ICSE / ISC' : s.boardCode) : null,
    c.budget && s.annualFeeFrom !== null ? `${formatMoneyCompact(s.annualFeeFrom)} a year (${s.annualFeeYear})` : null,
    c.gender && s.genderType ? genderLabel[s.genderType] : null,
    c.mode ? (c.mode === 'boarding' ? 'Boarding' : 'Day school') : null,
    ...c.fac.map((f) => facilityCategoryLabel[f]),
    c.open ? 'Admissions open' : null,
  ].filter((x): x is string => !!x);

  const notStated = (s: SchoolSummary): string[] => [
    c.cls && !s.classesFrom ? 'classes' : null,
    c.budget && s.annualFeeFrom === null ? 'fees' : null,
    c.gender && !s.genderType ? 'co-ed / boys / girls' : null,
    c.mode && s.hasHostel === null ? 'day / boarding' : null,
    c.fac.some((f) => !(s.facilityCategories ?? []).includes(f)) ? 'facilities' : null,
    c.open && s.admissionStatus !== 'OPEN' ? 'admission dates' : null,
  ].filter((x): x is string => !!x);

  return (
    <div className="space-y-10">
      <AsyncContent state={matches} loading={<SkeletonCards />}>
        {(page) => (
          <section aria-labelledby="matches-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="matches-heading" className="section-title">
                  {page.totalElements.toLocaleString('en-IN')} confirmed {page.totalElements === 1 ? 'match' : 'matches'}
                </h2>
                <p className="text-sm text-slate-600">Each school&apos;s official sources state everything you asked for.</p>
              </div>
              <div className="flex flex-wrap gap-2"><ShareLinkButtons url={shareUrl} text="Schools that match what we need, on India School Finder:" /></div>
            </div>
            {page.totalElements === 0 ? (
              <div className="card space-y-3 p-5">
                <p className="font-semibold text-ink">No school&apos;s sources confirm all of these yet.</p>
                {nearMisses.data && nearMisses.data.some((n) => n.total > 0) ? (
                  <>
                    <p className="text-sm text-slate-600">Relaxing one requirement would show:</p>
                    <div className="flex flex-wrap gap-2">
                      {nearMisses.data.filter((n) => n.total > 0).sort((a, b) => b.total - a.total).map((n) => (
                        <button key={n.k} type="button" className="btn-secondary rounded-full px-3 py-1.5 text-sm" onClick={() => onRelax(n.k)}>
                          Without {RELAX_LABEL[n.k]}: {n.total.toLocaleString('en-IN')} school{n.total === 1 ? '' : 's'}
                        </button>
                      ))}
                    </div>
                  </>
                ) : !nearMisses.loading && <p className="text-sm text-slate-600">Try a wider area or fewer requirements.</p>}
              </div>
            ) : (
              <>
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {page.content.map((s) => (
                    <li key={s.id} className="flex min-w-0 flex-col gap-2">
                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-200">
                        <span className="font-semibold">Why it matches: </span>{reasons(s).map((r) => `✓ ${r}`).join('  ·  ') || '✓ In your area'}
                      </div>
                      <SchoolCard school={s} />
                    </li>
                  ))}
                </ul>
                {page.totalElements > page.content.length && (
                  <p className="text-sm"><Link className="link" to={`/schools?${new URLSearchParams(Object.entries(toParams(c, [], 24))
                    .filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()}`}>
                    See all {page.totalElements.toLocaleString('en-IN')} in the directory →</Link></p>
                )}
              </>
            )}
          </section>
        )}
      </AsyncContent>

      {toCheck.length > 0 && (
        <section aria-labelledby="check-heading" className="space-y-4">
          <div>
            <h2 id="check-heading" className="section-title">Also in this area — check with the school</h2>
            <p className="text-sm text-slate-600">
              These schools are in the area you chose{c.board ? ' and board' : ''}, but their official sources don&apos;t yet state everything you asked for.
              They are not confirmed matches. Ask the school, or <Link to="/suggest" className="link">tell us where it&apos;s published</Link>.
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {toCheck.map((s) => (
              <li key={s.id} className="flex min-w-0 flex-col gap-2">
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                  <span className="font-semibold">Not yet published: </span>{notStated(s).join(', ') || 'some details'}
                  {s.distanceKm !== null && <> · {formatDistance(s.distanceKm)} away</>}
                </div>
                <SchoolCard school={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
