import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState, SkeletonCards } from '../components/common/States';
import { SchoolCard } from '../components/school/SchoolCard';
import { SchoolMap } from '../components/school/SchoolMap';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { schoolService } from '../services/publicApi';
import { formatMoneyCompact } from '../utils/format';

/**
 * Schools near a point. The visitor's location is used only in their browser to query the API;
 * it is not stored or sent anywhere else. Before a point is chosen, every mapped school is shown.
 */
export function NearbyPage() {
  useDocumentTitle('Schools near you');
  const [params, setParams] = useSearchParams();
  const lat = params.get('lat') ? Number(params.get('lat')) : null;
  const lon = params.get('lon') ? Number(params.get('lon')) : null;
  const radius = Number(params.get('r') ?? 5);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const hasPoint = lat !== null && lon !== null && !Number.isNaN(lat) && !Number.isNaN(lon);

  const results = useApi(() => schoolService.nearby(lat as number, lon as number, radius, 30), [lat, lon, radius], hasPoint);
  const everyone = useApi(() => schoolService.search({ size: 100, sortBy: 'name' }), [], !hasPoint);

  const setPoint = (la: number, lo: number) =>
    setParams({ lat: la.toFixed(5), lon: lo.toFixed(5), r: String(radius) }, { replace: true });

  const locate = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support location access. Click on the map instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPoint(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setGeoError('Location permission was denied. Click anywhere on the map to choose a point instead.');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const withSubtitle = <T extends { locality: string | null; annualFeeFrom: number | null; annualFeeYear: string | null; distanceKm: number | null }>(s: T) => ({
    ...s,
    subtitle: [
      s.distanceKm !== null ? `${s.distanceKm.toFixed(1)} km away` : s.locality,
      s.annualFeeFrom !== null ? `from ${formatMoneyCompact(s.annualFeeFrom)}/yr (${s.annualFeeYear})` : null,
    ].filter(Boolean).join(' · '),
  });
  const mapSchools = hasPoint ? (results.data ?? []).map(withSubtitle) : (everyone.data?.content ?? []).map(withSubtitle);

  return (
    <>
      <PageHeader eyebrow="Map" title="Schools near you"
        subtitle="Use your location or click anywhere on the map to pick a point. Distances are straight-line (as the crow flies)." />
      <div className="container-page space-y-6 py-8">
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <button type="button" className="btn-primary rounded-full" onClick={locate} disabled={locating}>
            <Icon name="pin" className="h-4 w-4" /> {locating ? 'Locating…' : 'Use my location'}
          </button>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Radius
            <select className="input w-auto rounded-full py-1.5" value={radius}
              onChange={(e) => hasPoint ? setParams({ lat: String(lat), lon: String(lon), r: e.target.value }, { replace: true }) : setParams({ r: e.target.value })}>
              {[1, 2, 3, 5, 10, 15, 25].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </label>
          {hasPoint && (
            <button type="button" className="btn-ghost rounded-full text-xs" onClick={() => setParams({}, { replace: true })}>
              <Icon name="close" className="h-3.5 w-3.5" /> Clear point
            </button>
          )}
          {geoError && <p className="text-sm text-red-600">{geoError}</p>}
          <p className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="shield" className="h-4 w-4" /> Your location stays in your browser and is not stored.
          </p>
        </div>
        <SchoolMap height={480} schools={mapSchools} userLocation={hasPoint ? [lat as number, lon as number] : null} onPick={setPoint} />
        {!hasPoint ? (
          <section>
            <h2 className="section-title text-xl sm:text-2xl">All mapped schools</h2>
            <p className="mt-1 text-sm text-slate-600">Pick a point to sort these by distance.</p>
            <div className="mt-5">
              <AsyncContent state={everyone} loading={<SkeletonCards count={3} />}>
                {(page) => (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {page.content.filter((s) => s.latitude !== null).map((s) => <SchoolCard key={s.id} school={s} />)}
                  </div>
                )}
              </AsyncContent>
            </div>
          </section>
        ) : (
          <AsyncContent state={results} loading={<SkeletonCards count={3} />} isEmpty={(d) => d.length === 0}
            empty={<EmptyState title={`No mapped schools within ${radius} km.`}>Try a larger radius. Only schools with confirmed coordinates appear here.</EmptyState>}>
            {(list) => (
              <section>
                <h2 className="section-title text-xl sm:text-2xl">{list.length} school{list.length === 1 ? '' : 's'} within {radius} km</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((s) => <SchoolCard key={s.id} school={s} />)}</div>
              </section>
            )}
          </AsyncContent>
        )}
      </div>
    </>
  );
}
