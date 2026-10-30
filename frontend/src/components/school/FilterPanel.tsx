import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { locationService, referenceService } from '../../services/publicApi';
import type {
  AdmissionStatus, FacilityCategory, GenderType, SchoolManagement, SchoolNetwork, SchoolSearchParams, SchoolStage, SchoolType,
} from '../../types/api';
import {
  admissionStatusLabel, facilityCategoryLabel, genderLabel, managementLabel, networkLabel, schoolTypeLabel, stageLabel,
} from '../../utils/format';
import { FilterField, MoreFilters } from '../common/FilterSheet';

export type FilterKey = keyof SchoolSearchParams;

const FACILITY_FILTERS: FacilityCategory[] = ['LIBRARY', 'LABORATORY', 'COMPUTER', 'SPORTS', 'TRANSPORT', 'ARTS', 'HEALTH', 'ACCESSIBILITY'];

/** Annual fee bands shown as one simple choice; exact amounts are under More filters. */
export const FEE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under ₹25,000', max: 25000 },
  { label: '₹25,000 – ₹1 lakh', min: 25000, max: 100000 },
  { label: '₹1 – 2.5 lakh', min: 100000, max: 250000 },
  { label: 'Above ₹2.5 lakh', min: 250000 },
];

/** Filters shown under "More filters"; the rest are in the bar. Used for the count on the button. */
export const MORE_FILTER_KEYS: FilterKey[] = ['q', 'district', 'locality', 'schoolType', 'management', 'network', 'hasHostel',
  'hasTransport', 'genderType', 'medium', 'facility', 'stage', 'admissionStatus', 'pinCode', 'minRating'];

/**
 * Directory filters, kept simple: State and city, Board, Class and Annual fee in the bar; everything else under
 * "More filters" (a drawer on desktop, a bottom sheet on phones, where every filter lives). `locked` hides filters
 * fixed by the page (e.g. the board on a board page). Every backend filter stays available.
 */
export function FilterPanel({
  value,
  onChange,
  locked = [],
  resultLabel,
  onClearAll,
}: {
  value: SchoolSearchParams;
  onChange: (next: SchoolSearchParams) => void;
  locked?: FilterKey[];
  resultLabel?: string;
  onClearAll: () => void;
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
  const band = FEE_BANDS.findIndex((b) => b.min === value.minAnnualFee && b.max === value.maxAnnualFee);
  const customFee = band < 0 && (value.minAnnualFee !== undefined || value.maxAnnualFee !== undefined);
  const moreCount = MORE_FILTER_KEYS.filter((k) => !locked.includes(k) && value[k] !== undefined && value[k] !== '').length
    + (customFee ? 1 : 0);

  const primary = (prefix: string): ReactNode[] => [
    // State and city are one filter: the city choice appears beside the state once a state with named cities is chosen.
    show('state') && (
      <FilterField key="state" label={state && show('city') && (cities.data?.length ?? 0) > 0 ? 'State / City' : 'State'} htmlFor={`${prefix}-state`}>
        <div className="flex gap-2">
          <select id={`${prefix}-state`} className="input min-w-0 flex-1" value={state ?? ''}
            onChange={(e) => onChange({ ...value, state: e.target.value || undefined, district: undefined, city: undefined, locality: undefined, page: 0 })}>
            <option value="">All of India</option>
            {withSchools.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          {state && show('city') && (cities.data?.length ?? 0) > 0 && (
            <select aria-label="City" className="input min-w-0 flex-1" value={value.city ?? ''} onChange={(e) => set('city', e.target.value)}>
              <option value="">Any city</option>
              {(cities.data ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          )}
        </div>
      </FilterField>
    ),
    // On a state page the state is fixed, so the city gets its own cell.
    !show('state') && state && show('city') && (cities.data?.length ?? 0) > 0 && (
      <FilterField key="city" label="City" htmlFor={`${prefix}-city`}>
        <select id={`${prefix}-city`} className="input" value={value.city ?? ''} onChange={(e) => set('city', e.target.value)}>
          <option value="">Any city</option>
          {(cities.data ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </FilterField>
    ),
    show('board') && (
      <FilterField key="board" label="Board" htmlFor={`${prefix}-board`}>
        <select id={`${prefix}-board`} className="input" value={value.board ?? ''} onChange={(e) => set('board', e.target.value)}>
          <option value="">Any board</option>
          {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC' : b.code}</option>)}
        </select>
      </FilterField>
    ),
    show('className') && (
      <FilterField key="class" label="Class" htmlFor={`${prefix}-class`}>
        <select id={`${prefix}-class`} className="input" value={value.className ?? ''} onChange={(e) => set('className', e.target.value)}>
          <option value="">Any class</option>
          {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </FilterField>
    ),
    show('minAnnualFee') && (
      <FilterField key="fee" label="Annual fee" htmlFor={`${prefix}-fee`}>
        <select id={`${prefix}-fee`} className="input" value={band >= 0 ? String(band) : customFee ? 'custom' : ''}
          onChange={(e) => {
            const b = FEE_BANDS[Number(e.target.value)];
            onChange({ ...value, minAnnualFee: b?.min, maxAnnualFee: b?.max, page: 0 });
          }}>
          <option value="">Any fee</option>
          {FEE_BANDS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
          {customFee && <option value="custom" disabled>Custom range (see More filters)</option>}
        </select>
      </FilterField>
    ),
  ].filter(Boolean);

  const more = (
    <>
      <FilterField label="Name, PIN or UDISE code" htmlFor="mf-q">
        <input id="mf-q" className="input" placeholder="e.g. Springdales, 110001" value={value.q ?? ''} onChange={(e) => set('q', e.target.value)} />
      </FilterField>
      {show('schoolType') && (
        <FilterField label="Government or private" htmlFor="mf-type">
          <select id="mf-type" className="input" value={value.schoolType ?? ''} onChange={(e) => set('schoolType', e.target.value as SchoolType)}>
            <option value="">Any</option>
            {(Object.keys(schoolTypeLabel) as SchoolType[]).map((t) => <option key={t} value={t}>{schoolTypeLabel[t]}</option>)}
          </select>
        </FilterField>
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
        </fieldset>
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
          <p className="mt-1.5 text-xs text-slate-500">Only schools whose source states these facilities.</p>
        </fieldset>
      )}
      {show('genderType') && (
        <FilterField label="Boys, girls or co-ed" htmlFor="mf-gender">
          <select id="mf-gender" className="input" value={value.genderType ?? ''} onChange={(e) => set('genderType', e.target.value as GenderType)}>
            <option value="">Any</option>
            {(Object.keys(genderLabel) as GenderType[]).map((g) => <option key={g} value={g}>{genderLabel[g]}</option>)}
          </select>
        </FilterField>
      )}
      {state && show('district') && (districts.data?.length ?? 0) > 0 && (
        <FilterField label="District" htmlFor="mf-district">
          <select id="mf-district" className="input" value={value.district ?? ''} onChange={(e) => set('district', e.target.value)}>
            <option value="">All districts</option>
            {(districts.data ?? []).map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}
          </select>
        </FilterField>
      )}
      {show('locality') && (
        <FilterField label="Locality" htmlFor="mf-locality">
          <input id="mf-locality" className="input" list="mf-localities" placeholder={state ? 'Any locality' : 'Choose a state for suggestions'}
            value={value.locality ?? ''} onChange={(e) => set('locality', e.target.value)} />
          <datalist id="mf-localities">{(localities.data ?? []).map((l) => <option key={l} value={l} />)}</datalist>
        </FilterField>
      )}
      <details className="rounded-xl border border-slate-200 p-3" open={moreCount > 0 && ['management', 'network', 'medium', 'stage', 'admissionStatus', 'pinCode', 'hasTransport'].some((k) => value[k as FilterKey] !== undefined)}>
        <summary className="cursor-pointer text-sm font-semibold text-ink">Other filters</summary>
        <div className="mt-3 space-y-4">
          {show('management') && (
            <FilterField label="Managed by" htmlFor="mf-management">
              <select id="mf-management" className="input" value={value.management ?? ''} onChange={(e) => set('management', e.target.value as SchoolManagement)}>
                <option value="">Any</option>
                {(Object.keys(managementLabel) as SchoolManagement[]).map((m) => <option key={m} value={m}>{managementLabel[m]}</option>)}
              </select>
            </FilterField>
          )}
          {show('network') && (
            <FilterField label="School system" htmlFor="mf-network">
              <select id="mf-network" className="input" value={value.network ?? ''} onChange={(e) => set('network', e.target.value as SchoolNetwork)}>
                <option value="">Any</option>
                {(Object.keys(networkLabel) as SchoolNetwork[]).map((n) => <option key={n} value={n}>{networkLabel[n]}</option>)}
              </select>
            </FilterField>
          )}
          {show('stage') && (
            <FilterField label="Stage" htmlFor="mf-stage">
              <select id="mf-stage" className="input" value={value.stage ?? ''} onChange={(e) => set('stage', e.target.value as SchoolStage)}>
                <option value="">Any stage</option>
                {(Object.keys(stageLabel) as SchoolStage[]).map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}
              </select>
            </FilterField>
          )}
          {show('medium') && (
            <FilterField label="Medium of instruction" htmlFor="mf-medium">
              <select id="mf-medium" className="input" value={value.medium ?? ''} onChange={(e) => set('medium', e.target.value)}>
                <option value="">Any</option>
                {['English', 'Hindi', 'Urdu', 'Sanskrit'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FilterField>
          )}
          <FilterField label="Admission status" htmlFor="mf-adm">
            <select id="mf-adm" className="input" value={value.admissionStatus ?? ''} onChange={(e) => set('admissionStatus', e.target.value as AdmissionStatus)}>
              <option value="">Any</option>
              {(Object.keys(admissionStatusLabel) as AdmissionStatus[]).map((s) => <option key={s} value={s}>{admissionStatusLabel[s]}</option>)}
            </select>
          </FilterField>
          <FilterField label="PIN code" htmlFor="mf-pin">
            <input id="mf-pin" className="input" inputMode="numeric" maxLength={6} placeholder="6-digit PIN" value={value.pinCode ?? ''}
              onChange={(e) => set('pinCode', e.target.value.replace(/\D/g, ''))} />
          </FilterField>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={value.hasTransport === true}
              onChange={(e) => set('hasTransport', e.target.checked ? true : '')} />
            School transport available
          </label>
          {show('minAnnualFee') && (
            <fieldset>
              <legend className="label">Exact annual fee range (₹ per year)</legend>
              <div className="flex gap-2">
                <input aria-label="Minimum annual fee" type="number" min={0} step={1000} className="input" placeholder="Min" value={value.minAnnualFee ?? ''}
                  onChange={(e) => set('minAnnualFee', e.target.value === '' ? '' : Number(e.target.value))} />
                <input aria-label="Maximum annual fee" type="number" min={0} step={1000} className="input" placeholder="Max" value={value.maxAnnualFee ?? ''}
                  onChange={(e) => set('maxAnnualFee', e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </fieldset>
          )}
        </div>
      </details>
      <p className="text-xs text-slate-500">
        Fee filters match schools with a complete official fee schedule for this or last academic year; day, boarding and
        facility filters match only schools whose source states it.
      </p>
    </>
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Tablet and desktop: the main filters in a row, the rest in the drawer. */}
      <div className="hidden flex-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">{primary('fb')}</div>
      <div className="hidden sm:block">
        <MoreFilters activeCount={moreCount} resultLabel={resultLabel} onClearAll={onClearAll}>{more}</MoreFilters>
      </div>
      {/* Phones: every filter in one bottom sheet. */}
      <div className="sm:hidden">
        <MoreFilters label="Filters" resultLabel={resultLabel} onClearAll={onClearAll}
          activeCount={moreCount + (['state', 'city', 'board', 'className'] as FilterKey[]).filter((k) => !locked.includes(k) && value[k]).length + (band >= 0 ? 1 : 0)}>
          <div className="space-y-4">{primary('fs')}</div>
          {more}
        </MoreFilters>
      </div>
    </div>
  );
}
