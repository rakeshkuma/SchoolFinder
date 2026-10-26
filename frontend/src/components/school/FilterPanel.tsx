import { useApi } from '../../hooks/useApi';
import { locationService, referenceService } from '../../services/publicApi';
import type {
  AdmissionStatus, FacilityCategory, GenderType, SchoolManagement, SchoolNetwork, SchoolSearchParams, SchoolStage, SchoolType,
} from '../../types/api';
import {
  admissionStatusLabel, facilityCategoryLabel, genderLabel, managementLabel, networkLabel, schoolTypeLabel, stageLabel,
} from '../../utils/format';

export type FilterKey = keyof SchoolSearchParams;

const FACILITY_FILTERS: FacilityCategory[] = ['LIBRARY', 'LABORATORY', 'COMPUTER', 'SPORTS', 'TRANSPORT', 'ARTS', 'HEALTH', 'ACCESSIBILITY'];

/**
 * Directory filters. `locked` hides filters fixed by the page (e.g. board on a board directory).
 */
export function FilterPanel({
  value,
  onChange,
  locked = [],
}: {
  value: SchoolSearchParams;
  onChange: (next: SchoolSearchParams) => void;
  locked?: FilterKey[];
}) {
  const boards = useApi(() => referenceService.boards(), []);
  const classes = useApi(() => referenceService.classes(), []);
  const states = useApi(() => locationService.states(), []);
  const state = value.state;
  const districts = useApi(() => locationService.districts(state as string), [state], !!state);
  const cities = useApi(() => locationService.cities(state as string), [state], !!state);
  const localities = useApi(() => locationService.localities(state), [state], !!state);

  const set = <K extends FilterKey>(key: K, v: SchoolSearchParams[K] | '') =>
    onChange({ ...value, [key]: v === '' ? undefined : v, page: 0 });
  const show = (key: FilterKey) => !locked.includes(key);
  const setting = value.hasHostel === true ? 'boarding' : value.hasHostel === false ? 'day' : '';
  const facilities = (value.facility ?? '').split(',').filter(Boolean) as FacilityCategory[];
  const withSchools = (states.data ?? []).filter((s) => s.schoolCount > 0);
  const withoutSchools = (states.data ?? []).filter((s) => s.schoolCount === 0);

  return (
    <form className="card space-y-4 p-5" onSubmit={(e) => e.preventDefault()} aria-label="Filter schools">
      <p className="flex items-center gap-2 font-display font-bold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden><path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" /></svg>
        </span>
        Filters
      </p>
      <div>
        <label htmlFor="f-q" className="label">Search</label>
        <input id="f-q" className="input" placeholder="Name, city, PIN or UDISE code" value={value.q ?? ''} onChange={(e) => set('q', e.target.value)} />
      </div>

      {show('state') && (
        <div>
          <label htmlFor="f-state" className="label">State / UT</label>
          <select id="f-state" className="input" value={state ?? ''}
            onChange={(e) => onChange({ ...value, state: e.target.value || undefined, district: undefined, city: undefined, locality: undefined, page: 0 })}>
            <option value="">All of India</option>
            {withSchools.length > 0 && (
              <optgroup label="With listed schools">
                {withSchools.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.schoolCount})</option>)}
              </optgroup>
            )}
            {withoutSchools.length > 0 && (
              <optgroup label="No schools listed yet">
                {withoutSchools.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {state && show('district') && (districts.data?.length ?? 0) > 0 && (
        <div>
          <label htmlFor="f-district" className="label">District</label>
          <select id="f-district" className="input" value={value.district ?? ''} onChange={(e) => set('district', e.target.value)}>
            <option value="">All districts</option>
            {(districts.data ?? []).map((d) => <option key={d.id} value={d.slug}>{d.name} ({d.schoolCount})</option>)}
          </select>
        </div>
      )}

      {state && show('city') && (
        <div>
          <label htmlFor="f-city" className="label">City / town</label>
          <input id="f-city" className="input" list="f-cities" placeholder="Any city" value={value.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          <datalist id="f-cities">
            {(cities.data ?? []).map((c) => <option key={c.name} value={c.name} />)}
          </datalist>
        </div>
      )}

      {show('locality') && (
        <div>
          <label htmlFor="f-locality" className="label">Locality</label>
          <input id="f-locality" className="input" list="f-localities" placeholder={state ? 'Any locality' : 'Choose a state for suggestions'}
            value={value.locality ?? ''} onChange={(e) => set('locality', e.target.value)} />
          <datalist id="f-localities">
            {(localities.data ?? []).map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>
      )}

      {show('board') && (
        <div>
          <label htmlFor="f-board" className="label">Board</label>
          <select id="f-board" className="input" value={value.board ?? ''} onChange={(e) => set('board', e.target.value)}>
            <option value="">All boards</option>
            {(boards.data ?? []).map((b) => (
              <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC (CISCE)' : b.code} — {b.name}</option>
            ))}
          </select>
        </div>
      )}

      {show('schoolType') && (
        <div>
          <label htmlFor="f-type" className="label">School type</label>
          <select id="f-type" className="input" value={value.schoolType ?? ''} onChange={(e) => set('schoolType', e.target.value as SchoolType)}>
            <option value="">All types</option>
            {(Object.keys(schoolTypeLabel) as SchoolType[]).map((t) => <option key={t} value={t}>{schoolTypeLabel[t]}</option>)}
          </select>
        </div>
      )}

      {show('management') && (
        <div>
          <label htmlFor="f-management" className="label">Management</label>
          <select id="f-management" className="input" value={value.management ?? ''} onChange={(e) => set('management', e.target.value as SchoolManagement)}>
            <option value="">Any management</option>
            {(Object.keys(managementLabel) as SchoolManagement[]).map((m) => <option key={m} value={m}>{managementLabel[m]}</option>)}
          </select>
        </div>
      )}

      {show('network') && (
        <div>
          <label htmlFor="f-network" className="label">School system</label>
          <select id="f-network" className="input" value={value.network ?? ''} onChange={(e) => set('network', e.target.value as SchoolNetwork)}>
            <option value="">Any</option>
            {(Object.keys(networkLabel) as SchoolNetwork[]).map((n) => <option key={n} value={n}>{networkLabel[n]}</option>)}
          </select>
        </div>
      )}

      {show('hasHostel') && (
        <fieldset>
          <legend className="label">Day or boarding</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup">
            {([['', 'Any'], ['day', 'Day'], ['boarding', 'Boarding']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={setting === v}
                onClick={() => onChange({ ...value, hasHostel: v === '' ? undefined : v === 'boarding', page: 0 })}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${setting === v ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
                {label}
              </button>
            ))}
          </div>
          {setting !== '' && <p className="mt-1.5 text-xs text-slate-500">Only schools whose source states whether a hostel exists.</p>}
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={value.hasTransport === true}
          onChange={(e) => set('hasTransport', e.target.checked ? true : '')} />
        School transport available
      </label>

      {show('genderType') && (
        <div>
          <label htmlFor="f-gender" className="label">Boys / girls / co-ed</label>
          <select id="f-gender" className="input" value={value.genderType ?? ''} onChange={(e) => set('genderType', e.target.value as GenderType)}>
            <option value="">Any</option>
            {(Object.keys(genderLabel) as GenderType[]).map((g) => <option key={g} value={g}>{genderLabel[g]}</option>)}
          </select>
        </div>
      )}

      {show('medium') && (
        <div>
          <label htmlFor="f-medium" className="label">Medium of instruction</label>
          <select id="f-medium" className="input" value={value.medium ?? ''} onChange={(e) => set('medium', e.target.value)}>
            <option value="">Any</option>
            {['English', 'Hindi', 'Urdu', 'Sanskrit'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {show('facility') && (
        <fieldset>
          <legend className="label">Facilities</legend>
          <div className="flex flex-wrap gap-1.5">
            {FACILITY_FILTERS.map((f) => {
              const active = facilities.includes(f);
              return (
                <button key={f} type="button" aria-pressed={active}
                  onClick={() => set('facility', (active ? facilities.filter((x) => x !== f) : [...facilities, f]).join(','))}
                  className={`chip px-2.5 py-1 ring-1 ring-inset ${active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'}`}>
                  {facilityCategoryLabel[f]}
                </button>
              );
            })}
          </div>
          {facilities.length > 0 && <p className="mt-1.5 text-xs text-slate-500">Only schools whose source states these facilities.</p>}
        </fieldset>
      )}

      {show('stage') && (
        <div>
          <label htmlFor="f-stage" className="label">Stage</label>
          <select id="f-stage" className="input" value={value.stage ?? ''} onChange={(e) => set('stage', e.target.value as SchoolStage)}>
            <option value="">Any stage</option>
            {(Object.keys(stageLabel) as SchoolStage[]).map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}
          </select>
        </div>
      )}

      {show('className') && (
        <div>
          <label htmlFor="f-class" className="label">Class offered</label>
          <select id="f-class" className="input" value={value.className ?? ''} onChange={(e) => set('className', e.target.value)}>
            <option value="">Any class</option>
            {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="label">Official annual fee (₹ per year)</legend>
        <div className="flex gap-2">
          <input aria-label="Minimum annual fee" type="number" min={0} step={1000} className="input" placeholder="Min" value={value.minAnnualFee ?? ''}
            onChange={(e) => set('minAnnualFee', e.target.value === '' ? '' : Number(e.target.value))} />
          <input aria-label="Maximum annual fee" type="number" min={0} step={1000} className="input" placeholder="Max" value={value.maxAnnualFee ?? ''}
            onChange={(e) => set('maxAnnualFee', e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ['Under ₹25k', undefined, 25000],
            ['₹25k–1 L', 25000, 100000],
            ['₹1–2.5 L', 100000, 250000],
            ['Above ₹2.5 L', 250000, undefined],
          ].map(([label, min, max]) => {
            const active = value.minAnnualFee === min && value.maxAnnualFee === max;
            return (
              <button key={label as string} type="button"
                onClick={() => onChange({ ...value, minAnnualFee: active ? undefined : (min as number | undefined), maxAnnualFee: active ? undefined : (max as number | undefined), page: 0 })}
                className={`chip px-2.5 py-1 ring-1 ring-inset ${active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'}`}>
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Matches each school's latest complete official schedule from this or last academic year.</p>
      </fieldset>

      <div>
        <label htmlFor="f-adm" className="label">Admission status</label>
        <select id="f-adm" className="input" value={value.admissionStatus ?? ''} onChange={(e) => set('admissionStatus', e.target.value as AdmissionStatus)}>
          <option value="">Any</option>
          {(Object.keys(admissionStatusLabel) as AdmissionStatus[]).map((s) => <option key={s} value={s}>{admissionStatusLabel[s]}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="f-rating" className="label">Minimum parent rating</label>
        <select id="f-rating" className="input" value={value.minRating ?? ''} onChange={(e) => set('minRating', e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Any</option>
          {[4.5, 4, 3.5, 3].map((r) => <option key={r} value={r}>{r}★ and above</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="f-pin" className="label">PIN code</label>
        <input id="f-pin" className="input" inputMode="numeric" maxLength={6} placeholder="6-digit PIN" value={value.pinCode ?? ''}
          onChange={(e) => set('pinCode', e.target.value.replace(/\D/g, ''))} />
      </div>

      <button type="button" className="btn-secondary w-full"
        onClick={() => onChange(Object.fromEntries(locked.map((k) => [k, value[k]])) as SchoolSearchParams)}>
        Reset filters
      </button>
    </form>
  );
}
