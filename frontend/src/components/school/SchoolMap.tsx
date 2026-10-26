import { lazy, Suspense } from 'react';

export interface MapSchool {
  id: number;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  subtitle?: string;
}

export interface SchoolMapProps {
  schools: MapSchool[];
  highlightId?: number;
  userLocation?: [number, number] | null;
  onPick?: (lat: number, lon: number) => void;
  height?: number;
}

// Leaflet (~150 KB) and its stylesheet are downloaded only when a map is actually rendered.
const SchoolMapImpl = lazy(() => import('./SchoolMapImpl'));

/** OpenStreetMap map of schools; a same-size placeholder holds the space while the map code loads. */
export function SchoolMap(props: SchoolMapProps) {
  const height = props.height ?? 380;
  return (
    <Suspense fallback={<div className="animate-pulse rounded-xl border border-slate-200 bg-slate-100" style={{ height }} aria-label="Loading map" />}>
      <SchoolMapImpl {...props} />
    </Suspense>
  );
}
