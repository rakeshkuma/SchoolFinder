import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { EmptyState } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { SchoolCover } from '../components/school/SchoolCard';
import { SchoolMap } from '../components/school/SchoolMap';
import { boardingBySlug, type BoardingSchool } from '../content/boarding';
import { ExamStatusBadge } from '../components/exam/ExamCard';
import { useApi } from '../hooks/useApi';
import { examService } from '../services/publicApi';
import { formatExamDate } from '../utils/exams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NotFoundPage } from './InfoPages';

// Legacy fact sheets (fees and admission notes for a few government schools) kept until those facts are moved into
// fee and admission records. The /boarding directory itself reads only the database.

function Cover({ school, className = '' }: { school: BoardingSchool; className?: string }) {
  const photo = school.photos[0];
  return photo ? (
    <img src={photo.url} alt={`${photo.caption} — ${school.name}`} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  ) : (
    <SchoolCover name={school.name} />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{i}</li>
      ))}
    </ul>
  );
}

function Sources({ urls }: { urls: string[] }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
      Sources:{' '}
      {urls.map((u, i) => {
        let host = u;
        try { host = new URL(u).hostname.replace(/^www\./, ''); } catch { /* raw */ }
        return <span key={u}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{host} ↗</a></span>;
      })}
    </div>
  );
}

export function BoardingSchoolPage() {
  const { slug = '' } = useParams();
  const school = boardingBySlug(slug);
  const [tab, setTab] = useState('overview');
  useDocumentTitle(school?.name);
  const exams = useApi(() => examService.all(), []);
  if (!school) return <NotFoundPage />;
  const exam = exams.data?.find((e) => e.slug === school.examSlug);
  const s = school;

  return (
    <>
      <header className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 opacity-50" aria-hidden><Cover school={s} /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" aria-hidden />
        <div className="container-page relative py-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-400">
            <Link to="/boarding" className="hover:text-white">Boarding schools</Link><span aria-hidden>/</span><span>{s.location.state}</span>
          </nav>
          <span className="mt-5 inline-block chip bg-accent-400 font-semibold text-ink">{s.kind}</span>
          <h1 className="mt-3 max-w-4xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{s.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-slate-300"><Icon name="pin" className="h-4 w-4" /> {s.location.place}</p>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
            {[
              ['Entry', s.classes],
              ['Entrance exam', exam?.shortName ?? '—'],
              ['Board', s.board],
              ['Established', s.established ?? 'Not stated'],
            ].map(([label, value]) => (
              <div key={label} className="bg-ink/60 p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-1 font-display text-base font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
          {s.photos[0] && (
            <a href={s.photos[0].sourceUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-3 text-[10px] text-white/70 hover:text-white">
              Photo: {s.photos[0].credit} · {s.photos[0].license}
            </a>
          )}
        </div>
      </header>

      <div className="container-page py-6">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'overview', label: 'Overview', content: (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <Section title="About">
                    <Bullets items={s.highlights} />
                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Managed by</dt><dd>{s.managedBy}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students</dt><dd>{s.students}</dd></div>
                    </dl>
                    <Sources urls={s.sources} />
                  </Section>
                  <aside className="space-y-4">
                    {s.directorySlug && (
                      <Link to={`/schools/${s.directorySlug}`} className="btn-primary w-full rounded-full">Full school profile <Icon name="arrowRight" className="h-4 w-4" /></Link>
                    )}
                    {exam && (
                      <Link to={`/exams/${exam.slug}`} className="card card-hover block p-5">
                        <p className="eyebrow">Entrance exam</p>
                        <p className="mt-1 font-display font-bold text-ink">{exam.shortName} preparation guide</p>
                        <p className="mt-1 text-sm text-slate-600">Pattern, syllabus, plan, past papers & answer keys</p>
                      </Link>
                    )}
                  </aside>
                </div>
              ),
            },
            {
              id: 'admissions', label: 'Admissions', content: (
                <Section title="Admission process">
                  <Bullets items={s.admission} />
                  {exam && (
                    <div className="mt-5 rounded-xl bg-brand-50 p-4">
                      <p className="font-semibold text-ink">{exam.name}</p>
                      <p className="mt-1"><ExamStatusBadge status={exam.status} /> <span className="text-sm text-slate-600">{exam.currentCycle}</span></p>
                      {exam.currentDates.length === 0 ? <p className="mt-2 text-sm text-slate-600">Dates not announced yet.</p> : (
                        <ul className="mt-2 space-y-1">{exam.currentDates.map((d) => <li key={d.kind + d.startsOn}><span className="text-slate-500">{d.label}:</span> {formatExamDate(d)}{!d.confirmed && ' (tentative)'}</li>)}</ul>
                      )}
                      <Link to={`/exams/${exam.slug}`} className="link mt-3 inline-block">Eligibility, pattern and preparation →</Link>
                    </div>
                  )}
                  <Sources urls={s.sources} />
                </Section>
              ),
            },
            {
              id: 'fees', label: 'Fees', content: (
                <Section title="Fees">
                  <table className="w-full text-sm">
                    <tbody>
                      {s.fees.map((f) => (
                        <tr key={f.label} className="border-b border-slate-100 last:border-0">
                          <th scope="row" className="py-2 pr-4 text-left font-normal text-slate-600">{f.label}</th>
                          <td className="py-2 text-right font-semibold tabular-nums text-ink">{f.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-slate-500">{s.feeNote}</p>
                  <Sources urls={s.sources} />
                </Section>
              ),
            },
            { id: 'facilities', label: 'Facilities', content: <Section title="Facilities"><Bullets items={s.facilities} /><Sources urls={s.sources} /></Section> },
            {
              id: 'photos', label: 'Photos', content: s.photos.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {s.photos.map((p) => (
                    <figure key={p.url} className="card overflow-hidden">
                      <img src={p.url} alt={`${p.caption} — ${s.name}`} loading="lazy" className="h-64 w-full object-cover" />
                      <figcaption className="p-3 text-xs text-slate-600">
                        {p.caption} · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">{p.credit}</a> · {p.license}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyState title="No freely licensed photo available yet.">We only show photos that are openly licensed or provided by the school.</EmptyState>
              ),
            },
            {
              id: 'location', label: 'Location', content: (
                <div className="space-y-4">
                  {s.location.lat !== null && s.location.lon !== null ? (
                    <SchoolMap schools={[{ id: 1, name: s.name, slug: '', latitude: s.location.lat, longitude: s.location.lon, subtitle: s.location.place }]} height={420} />
                  ) : (
                    <EmptyState title="Map location not confirmed.">Address: {s.location.place}</EmptyState>
                  )}
                  <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(s.location.place)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary rounded-full">
                    <Icon name="map" className="h-4 w-4" /> Open in OpenStreetMap
                  </a>
                </div>
              ),
            },
            {
              id: 'contact', label: 'Contact', content: (
                <Section title="Contact">
                  <dl className="space-y-3">
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</dt><dd>{s.contact.address}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd>{s.contact.phone ?? <span className="text-slate-400">Not published</span>}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd>{s.contact.email ?? <span className="text-slate-400">Not published</span>}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</dt><dd><a href={s.contact.website} target="_blank" rel="noopener noreferrer" className="link break-all">{s.contact.website}</a></dd></div>
                  </dl>
                </Section>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
