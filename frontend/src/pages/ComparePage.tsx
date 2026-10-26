import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdmissionStatusBadge, SourceLink, Stars, VerificationBadge } from '../components/common/Badges';
import { Icon } from '../components/common/Icon';
import { ShareLinkButtons } from '../components/common/ShareLinkButtons';
import { SchoolCover } from '../components/school/SchoolCard';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState, Spinner } from '../components/common/States';
import { SchoolPicker } from '../components/school/SchoolPicker';
import { useApi } from '../hooks/useApi';
import { MAX_COMPARE, useCompare } from '../hooks/useCompare';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feeService, referenceService, schoolService } from '../services/publicApi';
import type { SchoolDetail } from '../types/api';
import { formatDate, formatMoney, formatYesNo, genderLabel, NOT_AVAILABLE, orNotAvailable, schoolTypeLabel } from '../utils/format';
import { formatDistance, haversineKm, parseIds } from '../utils/geo';

interface Row {
  label: string;
  render: (s: SchoolDetail) => React.ReactNode;
  /** Plain value used by "only show differences"; rows without it are always shown. */
  text?: (s: SchoolDetail) => string;
}

/**
 * Side-by-side comparison of up to four schools; fees are compared for one class and one academic year. The selection
 * is kept in the URL (?ids=1,2,3) so a family can share the same comparison, e.g. on WhatsApp.
 */
export function ComparePage() {
  useDocumentTitle('Compare schools');
  const { items, toggle, remove, clear, replace } = useCompare();
  const ids = items.map((i) => i.id);
  const [searchParams, setSearchParams] = useSearchParams();

  // A shared link (?ids=) replaces this browser's selection once, on arrival.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const wanted = parseIds(searchParams.get('ids'), MAX_COMPARE);
    if (wanted.length === 0 || wanted.join(',') === ids.join(',')) {
      setHydrated(true);
      return undefined;
    }
    let cancelled = false;
    Promise.all(wanted.map((id) => schoolService.byId(id).catch(() => null)))
      .then((found) => {
        if (!cancelled) {
          replace(found.flatMap((s) => (s ? [{ id: s.id, name: s.name, slug: s.slug }] : [])));
        }
      })
      .finally(() => !cancelled && setHydrated(true));
    return () => {
      cancelled = true;
    };
    // Runs once: later selection changes are written to the URL below, not read from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Afterwards the URL follows the selection, so "copy link" always shares what is on screen.
  useEffect(() => {
    if (!hydrated) return;
    const next = ids.join(',');
    if ((searchParams.get('ids') ?? '') === next) return;
    const params = new URLSearchParams(searchParams);
    if (next) params.set('ids', next); else params.delete('ids');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), hydrated]);

  const shareUrl = `${window.location.origin}/compare?ids=${ids.join(',')}`;
  const shareText = `Comparing schools on India School Finder: ${items.map((i) => i.name).join(' vs ')}`;

  // Distance from home: the position stays in this browser and is never sent anywhere.
  const [home, setHome] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser cannot share a location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHome({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocationError(null);
        setLocating(false);
      },
      () => {
        setLocationError('Location was not shared, so distances cannot be shown.');
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };
  const distance = (s: SchoolDetail) => (home && s.latitude !== null && s.longitude !== null
    ? haversineKm(home.lat, home.lon, s.latitude, s.longitude) : null);

  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [classCode, setClassCode] = useState('NURSERY');
  const classes = useApi(() => referenceService.classes(), []);
  const profiles = useApi(() => Promise.all(ids.map((id) => schoolService.byId(id))), [ids.join(',')], ids.length > 0);
  const fees = useApi(() => feeService.compare(ids, classCode), [ids.join(','), classCode], ids.length > 0);
  const extras = useApi(
    () => Promise.all(ids.map(async (id) => {
      const [images, facilities, admissions] = await Promise.all([schoolService.images(id), schoolService.facilities(id), schoolService.admissions(id)]);
      return { id, images, facilities, admissions };
    })),
    [ids.join(',')],
    ids.length > 0,
  );
  const extra = (id: number) => extras.data?.find((e) => e.id === id);

  const feeFor = (id: number) => fees.data?.schools.find((s) => s.schoolId === id)?.fee ?? null;
  const className = classes.data?.find((c) => c.code === classCode)?.name ?? classCode;
  const classRange = (s: SchoolDetail) => (s.classesOffered.length
    ? `${s.classesOffered[0].name} – ${s.classesOffered[s.classesOffered.length - 1].name}` : NOT_AVAILABLE);
  const plain = (render: (s: SchoolDetail) => string): Pick<Row, 'render' | 'text'> => ({ render, text: render });
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Basics',
      rows: [
        { label: 'Type', ...plain((s) => schoolTypeLabel[s.schoolType]) },
        { label: 'Board', ...plain((s) => s.board?.name ?? NOT_AVAILABLE) },
        { label: 'Classes', ...plain(classRange) },
        { label: 'Co-education', ...plain((s) => (s.genderType ? genderLabel[s.genderType] : NOT_AVAILABLE)) },
        { label: 'Medium', ...plain((s) => orNotAvailable(s.mediumOfInstruction)) },
        { label: 'Established', ...plain((s) => orNotAvailable(s.establishedYear)) },
        { label: 'School timings', ...plain((s) => orNotAvailable(s.schoolTimings)) },
      ],
    },
    {
      title: 'Location & contact',
      rows: [
        ...(home ? [{
          label: 'Distance from you',
          ...plain((s) => {
            const km = distance(s);
            return km === null ? NOT_AVAILABLE : `${formatDistance(km)} (straight line)`;
          }),
        }] : []),
        { label: 'Address', render: (s) => orNotAvailable([s.addressLine, s.pinCode].filter(Boolean).join(' – ')) },
        { label: 'Locality', ...plain((s) => orNotAvailable(s.locality)) },
        { label: 'Phone', render: (s) => (s.phone ? <a className="link" href={`tel:${s.phone.split(',')[0].replace(/[^\d+]/g, '')}`}>{s.phone}</a> : NOT_AVAILABLE) },
        { label: 'Email', render: (s) => (s.email ? <a className="link break-all" href={`mailto:${s.email}`}>{s.email}</a> : NOT_AVAILABLE) },
        { label: 'Website', render: (s) => (s.websiteUrl ? <a className="link break-all" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">Visit ↗</a> : NOT_AVAILABLE) },
      ],
    },
    {
      title: 'Fees & admissions',
      rows: [
        { label: `Recurring annual fee (${className})`, ...plain((s) => formatMoney(feeFor(s.id)?.recurringAnnualOfficial ?? null)) },
        { label: `First-year fee (${className})`, ...plain((s) => formatMoney(feeFor(s.id)?.firstYearOfficial ?? null)) },
        { label: 'Fee source', render: (s) => (feeFor(s.id) ? <SourceLink url={feeFor(s.id)?.sourceUrl} /> : NOT_AVAILABLE) },
        {
          label: 'Admissions',
          render: (s) => {
            const list = extra(s.id)?.admissions ?? [];
            const current = list.find((a) => a.status === 'OPEN') ?? list.find((a) => a.status === 'UPCOMING') ?? list[0];
            return current ? (
              <span className="flex flex-col gap-1">
                <AdmissionStatusBadge status={current.status} />
                <span className="text-xs text-slate-500">{current.className} · {current.academicYear} · closes {formatDate(current.applicationEndDate)}</span>
              </span>
            ) : NOT_AVAILABLE;
          },
        },
      ],
    },
    {
      title: 'Campus',
      rows: [
        { label: 'Transport', ...plain((s) => formatYesNo(s.hasTransport)) },
        { label: 'Hostel', ...plain((s) => formatYesNo(s.hasHostel)) },
        {
          label: 'Facilities listed',
          render: (s) => {
            const f = extra(s.id)?.facilities ?? [];
            return f.length ? <span className="text-xs leading-relaxed text-slate-700">{f.slice(0, 8).map((x) => x.name).join(' · ')}{f.length > 8 ? ` · +${f.length - 8} more` : ''}</span> : NOT_AVAILABLE;
          },
        },
        { label: 'Student–teacher ratio', ...plain((s) => (s.studentTeacherRatio ? `${s.studentTeacherRatio} : 1` : NOT_AVAILABLE)) },
        { label: 'Parent rating', render: (s) => <Stars rating={s.averageRating} />, text: (s) => String(s.averageRating) },
        { label: 'Verification', render: (s) => <VerificationBadge status={s.verificationStatus} date={s.lastVerifiedDate} />, text: (s) => s.verificationStatus },
      ],
    },
  ];
  /** With "only show differences", rows whose plain value is the same for every school are hidden. */
  const visibleRows = (rows: Row[], schools: SchoolDetail[]) => (onlyDifferences && schools.length > 1
    ? rows.filter((r) => !r.text || new Set(schools.map((s) => r.text!(s))).size > 1) : rows);

  return (
    <>
      <PageHeader title="Compare schools" subtitle={`Pick up to ${MAX_COMPARE} schools. Fees are compared for the same class and academic year.`} />
      <div className="container-page space-y-6 py-8">
        <div className="card flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[260px] flex-1">
            <SchoolPicker disabled={items.length >= MAX_COMPARE} exclude={ids} onPick={(s) => toggle({ id: s.id, name: s.name, slug: s.slug })} />
          </div>
          <label className="text-sm"><span className="label">Class for fees</span>
            <select className="input" value={classCode} onChange={(e) => setClassCode(e.target.value)}>
              {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          {items.length > 0 && <button type="button" className="btn-secondary" onClick={clear}>Clear all</button>}
        </div>

        {hydrated && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <ShareLinkButtons url={shareUrl} text={shareText} />
            <button type="button" className="btn-secondary rounded-full px-4 py-2 text-sm" onClick={locate} disabled={locating}>
              <Icon name="pin" className="h-4 w-4" /> {locating ? 'Finding you…' : home ? 'Update my location' : 'Distance from my location'}
            </button>
            {items.length > 1 && (
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={onlyDifferences}
                  onChange={(e) => setOnlyDifferences(e.target.checked)} />
                Only show differences
              </label>
            )}
            {locationError && <p className="w-full text-xs text-amber-700">{locationError}</p>}
            {home && <p className="w-full text-xs text-slate-500">Your location stays in this browser; it is not sent to India School Finder.</p>}
          </div>
        )}

        {!hydrated ? (
          <Spinner label="Opening the shared comparison…" />
        ) : items.length === 0 ? (
          <EmptyState title="No schools selected yet.">
            Use “+ Compare” on any school card, or search above. <Link to="/schools" className="link">Browse schools</Link>
          </EmptyState>
        ) : (
          <AsyncContent state={profiles}>
            {(schools) => (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th scope="col" className="w-48 px-4 py-3 text-left text-slate-500">
                        {fees.data && <span className="font-normal">Fees: {fees.data.academicYear}</span>}
                      </th>
                      {schools.map((s) => {
                        const photo = extra(s.id)?.images.find((i) => i.imageType !== 'LOGO');
                        return (
                          <th key={s.id} scope="col" className="min-w-[200px] px-4 py-3 text-left align-top">
                            <div className="mb-3 h-24 overflow-hidden rounded-xl bg-slate-100">
                              {photo ? <img src={photo.url} alt={photo.altText} className="h-full w-full object-cover" loading="lazy" /> : <SchoolCover name={s.name} />}
                            </div>
                            <Link to={`/schools/${s.slug}`} className="font-display font-bold leading-snug text-ink hover:text-brand-700">{s.name}</Link>
                            <button type="button" className="mt-1 block text-xs font-normal text-slate-500 hover:text-red-600" onClick={() => remove(s.id)}>Remove</button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  {groups.map((group) => ({ group, rows: visibleRows(group.rows, schools) }))
                    .filter(({ rows }) => rows.length > 0)
                    .map(({ group, rows }) => (
                    <tbody key={group.title}>
                      <tr className="bg-slate-50/70">
                        <th colSpan={schools.length + 1} scope="colgroup" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand-700">
                          {group.title}
                        </th>
                      </tr>
                      {rows.map((row) => (
                        <tr key={row.label} className="border-t border-slate-100">
                          <th scope="row" className="px-4 py-3 text-left font-normal text-slate-600">{row.label}</th>
                          {schools.map((s) => {
                            const value = row.render(s);
                            return <td key={s.id} className={`px-4 py-3 align-top ${value === NOT_AVAILABLE ? 'text-slate-500' : ''}`}>{value}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </AsyncContent>
        )}
        {items.length > 0 && <p className="text-sm"><Link to="/fees" className="link">Estimate total costs with transport and books →</Link></p>}
      </div>
    </>
  );
}
