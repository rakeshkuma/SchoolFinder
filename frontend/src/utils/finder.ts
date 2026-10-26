import type { FacilityCategory, GenderType, SchoolSearchParams } from '../types/api';

/** Annual fee bands offered by the guided finder (official recurring annual fee, rupees). */
export const BUDGETS = {
  u25: { label: 'Under ₹25k a year', min: undefined, max: 25000 },
  '25-100': { label: '₹25k – 1 lakh', min: 25000, max: 100000 },
  '100-250': { label: '₹1 – 2.5 lakh', min: 100000, max: 250000 },
  o250: { label: 'Above ₹2.5 lakh', min: 250000, max: undefined },
} as const;
export type BudgetKey = keyof typeof BUDGETS;

/** Facilities a parent can require. */
export const FINDER_FACILITIES: FacilityCategory[] = ['LIBRARY', 'LABORATORY', 'COMPUTER', 'SPORTS', 'TRANSPORT', 'ARTS', 'HEALTH', 'ACCESSIBILITY'];

/** What the parent asked for; everything lives in the URL so a search can be shared. */
export interface Criteria {
  lat?: number; lon?: number; r: number; state?: string; district?: string;
  cls?: string; board?: string; budget?: BudgetKey; gender?: GenderType; mode?: 'day' | 'boarding';
  fac: FacilityCategory[]; open: boolean;
}
/** Requirements that only match schools whose sources state them (and can be relaxed one at a time). */
export type Relaxable = 'cls' | 'board' | 'budget' | 'gender' | 'mode' | 'fac' | 'open';

/** Criteria from the finder's URL; unknown or malformed values are ignored rather than guessed. */
export function readCriteria(p: URLSearchParams): Criteria {
  const num = (k: string) => {
    const v = p.get(k);
    return v !== null && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  const budget = p.get('budget');
  const gender = p.get('gender');
  const mode = p.get('mode');
  return {
    lat: num('lat'), lon: num('lon'), r: num('r') ?? 10, state: p.get('state') ?? undefined, district: p.get('district') ?? undefined,
    cls: p.get('cls') ?? undefined, board: p.get('board') ?? undefined,
    budget: budget && Object.prototype.hasOwnProperty.call(BUDGETS, budget) ? (budget as BudgetKey) : undefined,
    gender: gender === 'CO_ED' || gender === 'BOYS' || gender === 'GIRLS' ? gender : undefined,
    mode: mode === 'day' || mode === 'boarding' ? mode : undefined,
    fac: (p.get('fac') ?? '').split(',').filter((f): f is FacilityCategory => FINDER_FACILITIES.includes(f as FacilityCategory)),
    open: p.get('open') === '1',
  };
}

/** The URL form of the criteria; a location (rounded to ~10 m) replaces the state and district. */
export function writeCriteria(c: Criteria): URLSearchParams {
  const p = new URLSearchParams();
  const put = (k: string, v: string | number | undefined | false) => { if (v !== undefined && v !== '' && v !== false) p.set(k, String(v)); };
  if (c.lat !== undefined && c.lon !== undefined) { put('lat', c.lat.toFixed(4)); put('lon', c.lon.toFixed(4)); put('r', c.r); }
  else { put('state', c.state); put('district', c.district); }
  put('cls', c.cls); put('board', c.board); put('budget', c.budget); put('gender', c.gender); put('mode', c.mode);
  put('fac', c.fac.join(',')); if (c.open) p.set('open', '1');
  return p;
}

export const hasLocation = (c: Criteria) => (c.lat !== undefined && c.lon !== undefined) || !!c.state;

/** The directory search for these criteria, optionally without some requirements. */
export function toParams(c: Criteria, without: Relaxable[] = [], size = 12): SchoolSearchParams {
  const keep = (k: Relaxable) => !without.includes(k);
  const near = c.lat !== undefined && c.lon !== undefined;
  const budget = c.budget && keep('budget') ? BUDGETS[c.budget] : undefined;
  return {
    ...(near ? { latitude: c.lat, longitude: c.lon, radiusKm: c.r, sortBy: 'distance' as const } : { state: c.state, district: c.district }),
    ...(c.cls && keep('cls') ? { className: c.cls } : {}),
    ...(c.board && keep('board') ? { board: c.board } : {}),
    ...(budget ? { minAnnualFee: budget.min, maxAnnualFee: budget.max } : {}),
    ...(c.gender && keep('gender') ? { genderType: c.gender } : {}),
    ...(c.mode && keep('mode') ? { hasHostel: c.mode === 'boarding' } : {}),
    ...(c.fac.length && keep('fac') ? { facility: c.fac.join(',') } : {}),
    ...(c.open && keep('open') ? { admissionStatus: 'OPEN' as const } : {}),
    size,
  };
}

/** Which requirements the parent set (each can be relaxed). */
export function activeRequirements(c: Criteria): Relaxable[] {
  return ([['cls', c.cls], ['board', c.board], ['budget', c.budget], ['gender', c.gender], ['mode', c.mode], ['fac', c.fac.length > 0], ['open', c.open]] as const)
    .filter(([, v]) => !!v).map(([k]) => k as Relaxable);
}

/** The criteria without one requirement. */
export function relax(c: Criteria, k: Relaxable): Criteria {
  switch (k) {
    case 'fac': return { ...c, fac: [] };
    case 'open': return { ...c, open: false };
    default: return { ...c, [k]: undefined };
  }
}
