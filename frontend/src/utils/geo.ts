/** Straight-line distance in km between two points (same formula as the backend's GeoUtil). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "850 m", "4.2 km", "37 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000 / 10) * 10} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** School ids from a "?ids=1,2,3" value: positive integers only, no repeats, at most `max`. */
export function parseIds(value: string | null, max: number): number[] {
  if (!value) return [];
  const ids = value.split(',').map((v) => Number(v.trim())).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, max);
}
