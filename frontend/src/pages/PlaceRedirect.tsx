import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Spinner } from '../components/common/States';
import { locationService } from '../services/publicApi';
import { NotFoundPage } from './InfoPages';

/** Other spellings of place names, mapped to the slug this site uses (kept in step with PlaceAliases on the server). */
const ALIASES: Record<string, string> = {
  arrah: 'ara', aarah: 'ara', dhanoi: 'dhansoi', sasram: 'sasaram', sassaram: 'sasaram', chapra: 'chhapra',
  purnea: 'purnia', monghyr: 'munger', allahabad: 'prayagraj', banaras: 'varanasi', benares: 'varanasi',
  faizabad: 'ayodhya', gurgaon: 'gurugram', daltonganj: 'medininagar',
};

export const placeSlug = (raw: string) => {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ALIASES[s] ?? s;
};

/**
 * Where /schools/{state}/{place} should go: the district page if the place is a district, the town page if it is a
 * town, otherwise a search for it in that state. These short addresses never become pages of their own, so there is
 * no duplicate content; the state, district and town pages stay the canonical addresses.
 */
export async function resolvePlace(stateParam: string, placeParam?: string): Promise<string | null> {
  const states = await locationService.states();
  const state = states.find((s) => s.slug === placeSlug(stateParam) || s.code.toLowerCase() === stateParam.toLowerCase());
  if (!state) return null;
  if (!placeParam) return `/states/${state.slug}`;
  const place = placeSlug(placeParam);
  const districts = await locationService.districts(state.code);
  const district = districts.find((d) => d.slug === place);
  if (district) return `/states/${state.slug}/${district.slug}`;
  const cities = await locationService.cities(state.code);
  const city = cities.find((c) => c.slug === place);
  if (city) return `/states/${state.slug}/city/${city.slug}`;
  // A neighbourhood (Delhi's Mayur Vihar, Rohini …): one exact locality is a directory filter; a name shared by
  // several (Mayur Vihar Phase I, II and III) becomes a search, which matches all of them.
  const localities = await locationService.localities(state.code);
  const exact = localities.find((l) => placeSlug(l) === place);
  const shared = exact && localities.some((l) => l !== exact && l.toLowerCase().startsWith(`${exact.toLowerCase()} `));
  if (exact && !shared) return `/schools?${new URLSearchParams({ state: state.code, locality: exact })}`;
  return `/schools?${new URLSearchParams({ q: placeParam.replace(/-/g, ' '), state: state.code })}`;
}

/** /schools/{state}/{place}: hands over to the canonical location page. */
export function PlaceRedirect() {
  const { state = '', place } = useParams();
  return <Resolve state={state} place={place} />;
}

/** Shown where a school slug was not found: /schools/bihar is a state, not a school. */
export function SchoolOrStateNotFound({ slug }: { slug: string }) {
  return <Resolve state={slug} />;
}

function Resolve({ state, place }: { state: string; place?: string }) {
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    resolvePlace(state, place).then((t) => !cancelled && setTarget(t)).catch(() => !cancelled && setTarget(null));
    return () => { cancelled = true; };
  }, [state, place]);
  if (target === undefined) return <Spinner label="Finding the page…" />;
  return target ? <Navigate to={target} replace /> : <NotFoundPage />;
}
