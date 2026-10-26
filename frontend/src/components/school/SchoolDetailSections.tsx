import { useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { schoolService } from '../../services/publicApi';
import type { FactSource, SchoolClass, SchoolDetail, SchoolStage, VerificationStatus } from '../../types/api';
import { formatDate, NOT_AVAILABLE, orNotAvailable, stageLabel } from '../../utils/format';
import { VerificationBadge } from '../common/Badges';
import { EmptyState, Spinner } from '../common/States';

const STAGES: SchoolStage[] = ['PRE_PRIMARY', 'PRIMARY', 'MIDDLE', 'SECONDARY', 'SENIOR_SECONDARY'];

/** Classes grouped by stage, plus board and affiliation details as published. */
export function ClassesTab({ school: s }: { school: SchoolDetail }) {
  const byStage = STAGES.map((stage) => ({ stage, classes: s.classesOffered.filter((c: SchoolClass) => c.stage === stage) }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card p-6">
        <h2 className="font-semibold">Classes offered</h2>
        {s.classesOffered.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {NOT_AVAILABLE}. The school's sources do not list its classes yet
            {s.board?.code === 'CBSE' ? ' (the CBSE affiliation level in the overview gives only the highest class)' : ''}.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {byStage.map(({ stage, classes }) => (
              <li key={stage}>
                <p className={`text-sm font-medium ${classes.length ? 'text-ink' : 'text-slate-500'}`}>{stageLabel[stage]}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {classes.length
                    ? classes.map((c) => <span key={c.code} className="chip bg-brand-50 text-brand-800">{c.name}</span>)
                    : <span className="text-xs text-slate-500">Not listed</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">Curriculum</h2>
        <dl className="space-y-2">
          <div><dt className="text-slate-500">Board</dt><dd>{s.board ? s.board.name : NOT_AVAILABLE}</dd></div>
          <div><dt className="text-slate-500">Affiliation number</dt><dd>{orNotAvailable(s.affiliationNumber)}</dd></div>
          <div><dt className="text-slate-500">Medium of instruction</dt><dd>{orNotAvailable(s.mediumOfInstruction)}</dd></div>
        </dl>
        {s.board?.code === 'CBSE' && s.affiliationNumber && (
          <a className="link text-xs" href="https://saras.cbse.gov.in/saras/AffiliatedList/ListOfSchdirReport" target="_blank" rel="noopener noreferrer">
            Check the affiliation on CBSE SARAS ↗
          </a>
        )}
      </aside>
    </div>
  );
}

type Kind = 'Official' | 'Third-party';
interface SourceRow { section: string; url: string; kind: Kind; retrieved?: string | null; verified?: string | null; status?: VerificationStatus; note?: string | null }

const FACT_LABEL: Record<FactSource['fact'], string> = { CLASSES: 'Classes offered', LOCATION: 'Map location', CITY: 'City' };

const OFFICIAL_HOSTS = /(\.gov\.in|\.nic\.in|\.edu\.in|cbse\.gov\.in|cisce\.org|ibo\.org|cambridgeinternational\.org)$/i;

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url;
  }
}

/** Official = the school's own website or a government/board domain; anything else is third-party. */
function kindOf(url: string, website: string | null): Kind {
  const h = host(url);
  if (website && h === host(website)) return 'Official';
  return OFFICIAL_HOSTS.test(h) ? 'Official' : 'Third-party';
}

/** Every reference behind this profile, labelled official or third-party, with retrieval and verification dates. */
export function SourcesTab({ school: s }: { school: SchoolDetail }) {
  const fees = useApi(() => schoolService.fees(s.id), [s.id]);
  const admissions = useApi(() => schoolService.admissions(s.id), [s.id]);
  const facilities = useApi(() => schoolService.facilities(s.id), [s.id]);
  const images = useApi(() => schoolService.images(s.id), [s.id]);
  const facts = useApi(() => schoolService.factSources(s.id), [s.id]);
  if (fees.loading || admissions.loading || facilities.loading || images.loading || facts.loading) return <Spinner label="Loading sources…" />;

  const rows: SourceRow[] = [
    { section: 'School profile', url: s.sourceUrl, kind: kindOf(s.sourceUrl, s.websiteUrl), retrieved: s.sourceRetrievedDate, verified: s.lastVerifiedDate, status: s.verificationStatus },
    // Facts read from another page than the profile's source; they share the profile's verification.
    ...(facts.data ?? []).map((f) => ({ section: FACT_LABEL[f.fact], url: f.sourceUrl, kind: kindOf(f.sourceUrl, s.websiteUrl), retrieved: f.sourceRetrievedDate, verified: s.lastVerifiedDate, status: s.verificationStatus, note: f.note })),
    ...(fees.data ?? []).map((f) => ({ section: `Fees ${f.academicYear} · ${f.className}`, url: f.sourceUrl, kind: kindOf(f.sourceUrl, s.websiteUrl), verified: f.lastVerifiedDate, status: f.verificationStatus })),
    ...(admissions.data ?? []).map((a) => ({ section: `Admissions ${a.academicYear} · ${a.className}`, url: a.sourceUrl, kind: kindOf(a.sourceUrl, s.websiteUrl), verified: a.lastVerifiedDate, status: a.verificationStatus })),
    ...(facilities.data ?? []).map((f) => ({ section: 'Facilities', url: f.sourceUrl, kind: kindOf(f.sourceUrl, s.websiteUrl), verified: f.lastVerifiedDate, status: f.verificationStatus })),
    ...(images.data ?? []).map((i) => ({ section: i.illustrative ? 'Illustration' : 'Photo', url: i.sourceUrl, kind: kindOf(i.sourceUrl, s.websiteUrl), verified: i.lastVerifiedDate, status: i.verificationStatus })),
  ];
  // One row per section + URL (e.g. ten facilities from the same page).
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const key = `${r.section.split(' · ')[0]}|${r.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-500">
            <tr><th className="p-3">Information</th><th className="p-3">Source</th><th className="p-3">Type</th><th className="p-3">Retrieved</th><th className="p-3">Verification</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unique.map((r) => (
              <tr key={`${r.section}|${r.url}`}>
                <td className="p-3">
                  {r.section}
                  {r.note && <p className="mt-1 max-w-md text-xs text-slate-500">{r.note}</p>}
                </td>
                <td className="p-3"><a className="link break-all" href={r.url} target="_blank" rel="noopener noreferrer nofollow">{host(r.url)} ↗</a></td>
                <td className="p-3">
                  <span className={`chip ${r.kind === 'Official' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{r.kind}</span>
                </td>
                <td className="p-3 text-slate-600">{r.retrieved ? formatDate(r.retrieved) : '—'}</td>
                <td className="p-3">{r.status ? <VerificationBadge status={r.status} date={r.verified ?? null} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card space-y-2 p-5 text-sm text-slate-600">
        <p><strong className="text-ink">Official</strong>: the school's own website, or a government or examination-board site.</p>
        <p><strong className="text-ink">Third-party</strong>: other published sources, such as openly licensed photos on Wikimedia Commons.</p>
        <p><strong className="text-ink">Parent reviews</strong> are opinions submitted by users and moderated before publication. They are kept separately in the Reviews tab and never change the facts on this page.</p>
        {unique.length === 1 && <EmptyState title="Only the school profile has a source so far.">Fees, admissions and photos appear here once they are published from a source.</EmptyState>}
      </section>
    </div>
  );
}

/** schema.org School data and a page description, built only from published facts. */
export function useSchoolSeo(s: SchoolDetail | null | undefined) {
  useEffect(() => {
    if (!s) return undefined;
    const place = [s.locality, s.city, s.district?.name, s.stateName].filter(Boolean);
    const description = [
      `${s.name}${place.length ? `, ${[...new Set(place)].join(', ')}` : ''}.`,
      s.board ? `${s.board.code === 'CISCE' ? 'ICSE/ISC' : s.board.code} school.` : '',
      'Official fees, admissions, facilities and sources on India School Finder.',
    ].filter(Boolean).join(' ');
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.content;
    if (meta) meta.content = description;

    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'School',
      name: s.name,
      url: `${window.location.origin}/schools/${s.slug}`,
      address: {
        '@type': 'PostalAddress',
        ...(s.addressLine && { streetAddress: s.addressLine }),
        ...((s.city || s.district) && { addressLocality: s.city ?? s.district?.name }),
        ...(s.stateName && { addressRegion: s.stateName }),
        ...(s.pinCode && { postalCode: s.pinCode }),
        addressCountry: 'IN',
      },
      ...(s.websiteUrl && { sameAs: s.websiteUrl }),
      ...(s.phone && { telephone: s.phone.split(',')[0].trim() }),
      ...(s.email && { email: s.email }),
      ...(s.establishedYear && { foundingDate: String(s.establishedYear) }),
      ...(s.latitude !== null && s.longitude !== null && { geo: { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude } }),
    };
    // The server already sent this page's data (index.html include); replace it rather than adding a second copy.
    document.querySelectorAll('script[type="application/ld+json"][data-seo="server"]').forEach((s) => s.remove());
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      script.remove();
      if (meta && previous !== undefined) meta.content = previous;
    };
  }, [s]);
}
