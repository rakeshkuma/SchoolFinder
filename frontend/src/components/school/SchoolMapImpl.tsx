import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './school-map.css';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { MapSchool, SchoolMapProps } from './SchoolMap';

// Use an inline SVG marker so we don't depend on Leaflet's bundled PNG paths.
const pin = (color: string) =>
  L.divIcon({
    className: '',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5.5" fill="#fff"/></svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
const schoolIcon = pin('#1d5dee');
const highlightIcon = pin('#dc2626');
const userIcon = pin('#059669');

// With nothing to plot, show the whole country rather than any one city.
const INDIA_CENTER: [number, number] = [22.5, 79.0];
const INDIA_ZOOM = 4;

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points); // re-fit only when the plotted coordinates change
  useEffect(() => {
    const pts = JSON.parse(key) as [number, number][];
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
  }, [map, key]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** OpenStreetMap map (no API key). Schools without verified coordinates are simply not plotted. */
export default function SchoolMapImpl({ schools, highlightId, userLocation, onPick, height = 380 }: SchoolMapProps) {
  const plotted = schools.filter((s): s is MapSchool & { latitude: number; longitude: number } =>
    s.latitude !== null && s.longitude !== null);
  const points: [number, number][] = plotted.map((s) => [s.latitude as number, s.longitude as number]);
  if (userLocation) points.push(userLocation);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer center={points[0] ?? INDIA_CENTER} zoom={points.length ? 12 : INDIA_ZOOM} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {onPick && <ClickToPick onPick={onPick} />}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon} title="Search location" alt="Search location">
            <Popup>Search location</Popup>
          </Marker>
        )}
        {plotted.map((s) => (
          // title gives the marker an accessible name (otherwise screen readers announce only "button").
          <Marker key={s.id} position={[s.latitude, s.longitude]} icon={s.id === highlightId ? highlightIcon : schoolIcon}
            title={s.name} alt={s.name}>
            <Popup>
              <Link to={`/schools/${s.slug}`} className="font-semibold">{s.name}</Link>
              {s.subtitle && <div className="text-xs text-slate-600">{s.subtitle}</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
