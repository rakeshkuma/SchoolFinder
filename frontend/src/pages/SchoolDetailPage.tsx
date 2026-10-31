import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AdmissionStatusBadge, ProvisionalBadge, SourceLink, Stars, VerificationBadge } from '../components/common/Badges';
import { BoardingTab } from '../components/school/BoardingTab';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, ErrorState, Spinner } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { CompareButton } from '../components/school/CompareBar';
import { FeeTable } from '../components/school/FeeTable';
import { ImageGallery } from '../components/school/ImageGallery';
import { SchoolCard, SchoolCover } from '../components/school/SchoolCard';
import { Icon } from '../components/common/Icon';
import { SaveButton } from '../components/school/SaveButton';
import { ClassesTab, SourcesTab, useSchoolSeo } from '../components/school/SchoolDetailSections';
import { SchoolMap } from '../components/school/SchoolMap';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { recentSchools, type SchoolRef } from '../hooks/usePersonal';
import { ApiError } from '../services/http';
import { schoolService } from '../services/publicApi';
import type { Admission, FacilityCategory, ReviewRequest, SchoolDetail, SchoolImage } from '../types/api';
import {
  admissionCategoryLabel,
  directionsUrl,
  facilityCategoryLabel,
  formatDate,
  formatMoneyCompact,
  formatYesNo,
  genderLabel,
  managementLabel,
  networkLabel,
  NOT_AVAILABLE,
  orNotAvailable,
  placeLine,
  schoolTypeLabel,
} from '../utils/format';
import { SchoolOrStateNotFound } from './PlaceRedirect';

// The charts library is only needed in the Ranking tab, so it is not part of the profile's first download.
const RankingBreakdown = lazy(() => import('../components/school/RankingBreakdown').then((m) => ({ default: m.RankingBreakdown })));

const toRef = (s: SchoolDetail): SchoolRef => ({
  id: s.id, name: s.name, slug: s.slug, place: placeLine(s.locality, s.city, s.stateName),
});

export function SchoolDetailPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const school = useApi(() => schoolService.bySlug(slug), [slug]);
  useDocumentTitle(school.data?.name);
  useSchoolSeo(school.data);
  const loaded = school.data;
  useEffect(() => {
    if (loaded) recentSchools.add(toRef(loaded));
  }, [loaded]);
  const [copied, setCopied] = useState(false);
  // The main photo (first non-logo image cleared for publication) is shown in the header.
  const images = useApi(() => schoolService.images(loaded!.id), [loaded?.id], !!loaded);
  // If the photo cannot be loaded the header falls back to the one-column layout (no empty photo column).
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [loaded?.id]);
  const photo = photoFailed ? undefined : images.data?.find((i) => i.imageType !== 'LOGO');

  // /schools/bihar is a state rather than a school: SchoolOrStateNotFound sends it to the state page, or shows 404.
  if (school.error?.status === 404) return <SchoolOrStateNotFound slug={slug} />;
  if (school.error) return <div className="container-page py-10"><ErrorState error={school.error} onRetry={school.reload} /></div>;
  if (!school.data) return <Spinner label="Loading school…" />;

  const s = school.data;
  const tab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) => setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  const share = async () => {
    const url = `${window.location.origin}/schools/${s.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: s.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share sheet dismissed or clipboard blocked
    }
  };

  return (
    <>
      <header className="relative overflow-hidden bg-ink text-white">
        <HeaderBackdrop photo={photo} name={s.name} />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" aria-hidden />
        <div className="container-page relative py-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
            <Link to="/schools" className="hover:text-white">Schools</Link>
            {s.stateSlug && (
              <><span aria-hidden>/</span><Link to={`/states/${s.stateSlug}`} className="hover:text-white">{s.stateName}</Link></>
            )}
            {s.stateSlug && s.district && (
              <><span aria-hidden>/</span><Link to={`/states/${s.stateSlug}/${s.district.slug}`} className="hover:text-white">{s.district.name}</Link></>
            )}
            {s.locality && (
              <><span aria-hidden>/</span>
                <Link to={`/schools?state=${s.stateCode}&locality=${encodeURIComponent(s.locality)}`} className="hover:text-white">{s.locality}</Link></>
            )}
          </nav>
          <div className={`mt-5 grid gap-6 ${photo ? 'lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start' : ''}`}>
          <div className="flex min-w-0 flex-wrap items-start gap-5">
            {s.logoUrl ? (
              <img src={s.logoUrl} alt={`${s.name} logo`} className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lift" />
            ) : !photo && (
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-lift ring-2 ring-white/20 [&_span]:bottom-2 [&_span]:left-3 [&_span]:text-3xl"><SchoolCover name={s.name} /></div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{s.name}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-slate-300">
                <Icon name="pin" className="h-4 w-4 shrink-0" />
                {[placeLine(s.addressLine, s.city, s.stateName), s.pinCode].filter(Boolean).join(' – ') || 'Address not available'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="chip bg-white/10 text-white ring-1 ring-white/15">{schoolTypeLabel[s.schoolType]}</span>
                {s.network && <span className="chip bg-white/10 text-white ring-1 ring-white/15">{networkLabel[s.network]}</span>}
                {s.board && <span className="chip bg-white font-semibold text-ink">{s.board.code === 'CISCE' ? 'ICSE/ISC' : s.board.code === 'STATE' ? 'State board' : s.board.code}</span>}
                <VerificationBadge status={s.verificationStatus} date={s.lastVerifiedDate} />
                {s.averageRating !== null && <span className="chip bg-white/10 text-white"><Stars rating={s.averageRating} /></span>}
              </div>
            </div>
            {/* Beside a photo the column is narrower, so the actions get their own row under the name. */}
            <div className={`flex w-full flex-wrap gap-2 ${photo ? '' : 'sm:w-auto'}`}>
              <SaveButton school={toRef(s)} withLabel />
              <button type="button" onClick={share} className="btn-secondary rounded-full" aria-live="polite">
                <Icon name="share" className="h-4 w-4" /> {copied ? 'Link copied' : 'Share'}
              </button>
              <CompareButton id={s.id} name={s.name} slug={s.slug} />
              {s.websiteUrl && (
                <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="btn rounded-full bg-white px-3 py-1.5 text-xs text-ink hover:bg-slate-100">
                  Official website <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
          {photo && <HeaderPhoto photo={photo} name={s.name} onGallery={() => setTab('photos')} onFail={() => setPhotoFailed(true)} />}
          </div>
          <KeyFacts school={s} onTab={setTab} />
        </div>
      </header>
      <StickyActions school={s} onAdmissions={() => {
        setTab('admissions');
        document.getElementById('school-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />
      <div id="school-tabs" className="container-page scroll-mt-32 py-6">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'overview', label: 'Overview', content: <Overview school={s} /> },
            ...(s.boarding ? [{ id: 'boarding', label: 'Boarding', content: <BoardingTab boarding={s.boarding} /> }] : []),
            { id: 'photos', label: 'Gallery', content: <PhotosTab schoolId={s.id} /> },
            { id: 'admissions', label: 'Admissions', content: <AdmissionsTab schoolId={s.id} portal={s.admissionPortalUrl} inDelhi={s.stateCode === 'DL'} /> },
            { id: 'fees', label: 'Fees', content: <FeesTab schoolId={s.id} inDelhi={s.stateCode === 'DL'} /> },
            { id: 'classes', label: 'Classes & curriculum', content: <ClassesTab school={s} /> },
            { id: 'facilities', label: 'Facilities', content: <FacilitiesTab school={s} /> },
            { id: 'location', label: 'Location & contact', content: <LocationTab school={s} /> },
            { id: 'ranking', label: 'Ranking', content: <RankingTab schoolId={s.id} /> },
            { id: 'reviews', label: 'Reviews', content: <ReviewsTab schoolId={s.id} /> },
            { id: 'sources', label: 'Sources', content: <SourcesTab school={s} /> },
          ]}
        />
      </div>
    </>
  );
}

/**
 * The main actions, kept in reach under the site header while reading the profile. "Contact" uses the school's own
 * published phone, e-mail or website — whichever exists — and is left out when none is published.
 */
function StickyActions({ school: s, onAdmissions }: { school: SchoolDetail; onAdmissions: () => void }) {
  const phone = s.phone?.split(',')[0].trim();
  const contact = phone ? { href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: 'Call school', icon: 'phone' as const, external: false }
    : s.email ? { href: `mailto:${s.email}`, label: 'Email school', icon: 'mail' as const, external: false }
      : s.websiteUrl ? { href: s.websiteUrl, label: 'Contact school', icon: 'external' as const, external: true } : null;
  return (
    <div className="sticky top-[68px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex items-center gap-3 overflow-x-auto py-2.5">
        <p className="hidden min-w-0 flex-1 truncate font-display font-bold text-ink md:block">{s.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <CompareButton id={s.id} name={s.name} slug={s.slug} />
          <SaveButton school={toRef(s)} withLabel />
          {contact && (
            <a href={contact.href} {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="btn-secondary whitespace-nowrap rounded-full px-3 py-1.5 text-sm">
              <Icon name={contact.icon} className="h-4 w-4" /> {contact.label}
            </a>
          )}
          <button type="button" onClick={onAdmissions} className="btn-primary whitespace-nowrap rounded-full px-4 py-1.5 text-sm">
            <Icon name="calendar" className="h-4 w-4" /> Admission details
          </button>
        </div>
      </div>
    </div>
  );
}

/** Faded header background: the school's photo (thumbnail size; it is decoration) or its generated cover. */
function HeaderBackdrop({ photo, name }: { photo: SchoolImage | undefined; name: string }) {
  return (
    <div className="absolute inset-0 opacity-40" aria-hidden>
      {photo ? <img src={photo.thumbnailUrl ?? photo.url} alt="" className="h-full w-full scale-110 object-cover blur-sm" />
        : <SchoolCover name={name} monogram={false} />}
    </div>
  );
}

/** The school's main photo beside its name, with the credit and licence its source requires. */
function HeaderPhoto({ photo, name, onGallery, onFail }: {
  photo: SchoolImage; name: string; onGallery: () => void; onFail: () => void;
}) {
  return (
    <figure className="min-w-0">
      <button type="button" onClick={onGallery} className="group block w-full overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/20"
        aria-label={`Open the photo gallery of ${name}`}>
        <img src={photo.thumbnailUrl ?? photo.url} alt={photo.altText || `Campus of ${name}`} onError={onFail}
          className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      </button>
      <figcaption className="mt-2 text-[11px] leading-snug text-slate-400">
        {photo.illustrative ? 'Illustration, not a photo of this school' : (
          <>Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-white hover:underline">{photo.credit ?? 'source'}</a>
            {photo.license ? ` · ${photo.license}` : ''}</>
        )}
      </figcaption>
    </figure>
  );
}

/** At-a-glance strip under the header, built only from published records. */
function KeyFacts({ school: s, onTab }: { school: SchoolDetail; onTab: (id: string) => void }) {
  const fees = useApi(() => schoolService.fees(s.id), [s.id]);
  const admissions = useApi(() => schoolService.admissions(s.id), [s.id]);
  const complete = (fees.data ?? []).filter((f) => f.recurringAnnualOfficial !== null);
  const latestYear = complete.map((f) => f.academicYear).sort().reverse()[0];
  const feeFrom = complete.filter((f) => f.academicYear === latestYear)
    .reduce<number | null>((min, f) => (min === null || (f.recurringAnnualOfficial as number) < min ? f.recurringAnnualOfficial : min), null);
  const open = (admissions.data ?? []).find((a) => a.status === 'OPEN') ?? (admissions.data ?? []).find((a) => a.status === 'UPCOMING');
  const classes = s.classesOffered.length
    ? `${s.classesOffered[0].name.replace('Class ', '')} – ${s.classesOffered[s.classesOffered.length - 1].name.replace('Class ', '')}`
    : null;

  const items: { label: string; value: string | null; hint?: string; tab?: string; highlight?: boolean }[] = [
    { label: 'Annual fee from', value: feeFrom === null ? null : feeFrom === 0 ? 'Free' : formatMoneyCompact(feeFrom), hint: latestYear, tab: 'fees' },
    {
      label: 'Admissions',
      value: open ? `${open.status === 'OPEN' ? 'Open' : 'Upcoming'} · ${open.className}` : (admissions.data?.length ? 'No open cycle' : null),
      hint: open?.applicationEndDate ? `closes ${formatDate(open.applicationEndDate)}` : undefined,
      tab: 'admissions',
      highlight: open?.status === 'OPEN',
    },
    { label: 'Classes', value: classes },
    { label: 'Established', value: s.establishedYear ? String(s.establishedYear) : null },
  ];
  return (
    <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
      {/* Each fact is a <div> of <dt>/<dd> (valid inside <dl>); a clickable fact gets a full-size button laid over it. */}
      {items.map((it) => (
        <div key={it.label} className={`relative bg-ink/60 p-4 ${it.tab ? 'transition hover:bg-white/5' : ''}`}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className={`mt-1 font-display text-lg font-bold ${it.value ? (it.highlight ? 'text-emerald-300' : 'text-white') : 'text-slate-400'}`}>
            {it.value ?? 'Not published'}
            {/* Inside the <dd> (a <dl> may only contain dt/dd groups); absolute, so it covers the whole tile. */}
            {it.tab && (
              <button type="button" onClick={() => onTab(it.tab as string)} className="absolute inset-0 rounded-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                aria-label={`Show ${it.tab === 'fees' ? 'fees' : 'admissions'} details`} />
            )}
          </dd>
          {it.hint && it.value && <dd className="text-xs text-slate-400">{it.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const empty = children === NOT_AVAILABLE;
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm sm:col-span-2 sm:mt-0 ${empty ? 'text-slate-500' : 'text-slate-900'}`}>{children}</dd>
    </div>
  );
}

function Overview({ school: s }: { school: SchoolDetail }) {
  const yesNo = (v: boolean | null) => (v === null ? null : formatYesNo(v));
  // [label, value]; null = not published by any source yet.
  const facts: [string, string | null][] = [
    ['School category', schoolTypeLabel[s.schoolType]],
    ['Management', s.management ? managementLabel[s.management] : null],
    ['Run by (trust / society)', s.managingBody],
    ['Principal / head', s.principalName],
    ['Education board', s.board ? s.board.name : null],
    ['Board affiliation no.', s.affiliationNumber],
    ['UDISE+ code', s.udiseCode],
    ['District', s.district ? s.district.name : null],
    ['State / UT', s.stateName],
    ['Classes offered', s.classesOffered.length
      ? `${s.classesOffered[0].name} to ${s.classesOffered[s.classesOffered.length - 1].name} (${s.classesOffered.length} levels listed)`
      : null],
    ['Medium of instruction', s.mediumOfInstruction],
    ['Gender', s.genderType ? genderLabel[s.genderType] : null],
    ['Established', s.establishedYear !== null ? String(s.establishedYear) : null],
    ['School timings', s.schoolTimings],
    ['Student–teacher ratio', s.studentTeacherRatio ? `${s.studentTeacherRatio} : 1` : null],
    ['Transport', yesNo(s.hasTransport)],
    ['Day or boarding', s.hasHostel === null ? null : s.hasHostel ? 'Boarding (hostel available)' : 'Day school'],
    ['Accessibility', s.accessibilityFeatures],
  ];
  const known = facts.filter(([, v]) => v !== null && v !== '');
  const unknown = facts.filter(([, v]) => v === null || v === '').map(([label]) => label);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card p-6">
        {s.description && <p className="mb-4 leading-relaxed text-slate-700">{s.description}</p>}
        <dl className="divide-y divide-slate-100">
          {known.map(([label, value]) => <Fact key={label} label={label}>{value}</Fact>)}
        </dl>
        {unknown.length > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <p>
              <span className="font-medium text-ink">Not yet published by an official source:</span>{' '}
              {unknown.join(' · ')}.
            </p>
            <p className="mt-1">
              We only show facts we can link to a source.{' '}
              <Link to={`/suggest?school=${encodeURIComponent(s.slug)}`} className="link">
                Know where the school publishes these? Tell us
              </Link>
            </p>
          </div>
        )}
      </section>
      <aside className="space-y-4">
        <RankingSummary schoolId={s.id} />
        <section className="card p-5">
          <h2 className="font-semibold">Contact</h2>
          <p className="mt-1 text-xs text-slate-500">Publicly listed by the school.</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-slate-500">Phone</dt><dd>{s.phone ? <a className="link" href={`tel:${s.phone.split(',')[0].replace(/[^\d+]/g, '')}`}>{s.phone}</a> : NOT_AVAILABLE}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{s.email ? <a className="link break-all" href={`mailto:${s.email}`}>{s.email}</a> : NOT_AVAILABLE}</dd></div>
            <div><dt className="text-slate-500">Website</dt><dd>{s.websiteUrl ? <a className="link break-all" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">{s.websiteUrl}</a> : NOT_AVAILABLE}</dd></div>
            <div><dt className="text-slate-500">Admission portal</dt><dd>{s.admissionPortalUrl ? <a className="link break-all" href={s.admissionPortalUrl} target="_blank" rel="noopener noreferrer">Open portal ↗</a> : NOT_AVAILABLE}</dd></div>
          </dl>
        </section>
        <section className="card p-5 text-sm">
          <h2 className="font-semibold">Data sources</h2>
          <p className="mt-2 text-slate-600">
            Profile retrieved {formatDate(s.sourceRetrievedDate)}
            {s.lastVerifiedDate ? `; verified by an administrator on ${formatDate(s.lastVerifiedDate)}.` : '; not yet verified by an administrator.'}
          </p>
          <div className="mt-2"><SourceLink url={s.sourceUrl} /></div>
          <p className="mt-3 text-xs text-slate-500">
            India School Finder is independent; listing a school does not mean the school endorses this site.
          </p>
          <Link to={`/suggest?school=${encodeURIComponent(s.slug)}&topic=CORRECTION`} className="btn-secondary mt-3 w-full text-xs">
            <Icon name="info" className="h-4 w-4" /> Report incorrect information
          </Link>
        </section>
      </aside>
    </div>
  );
}

function AdmissionsTab({ schoolId, portal, inDelhi }: { schoolId: number; portal: string | null; inDelhi: boolean }) {
  const state = useApi(() => schoolService.admissions(schoolId), [schoolId]);
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState title="No admission schedule has been recorded for this school yet.">
          <span className="block">
            {portal ? <a href={portal} className="link" target="_blank" rel="noopener noreferrer">Check the school’s admission page ↗</a> : 'Please check the school’s official website.'}
          </span>
          <span className="mt-2 block">
            {inDelhi && (
              <>Delhi nursery / entry-level and EWS/DG admissions follow the Directorate of Education schedule:{' '}
                <a href="https://www.edudel.nic.in/" className="link" target="_blank" rel="noopener noreferrer">edudel.nic.in ↗</a>.{' '}</>
            )}
            Kendriya Vidyalayas follow the KVS schedule; residential schools use entrance exams — see our <Link to="/exams" className="link">exam guides</Link>.
          </span>
        </EmptyState>
      }>
      {(admissions) => (
        <div className="space-y-4">
          {admissions.map((a) => <AdmissionCard key={a.id} admission={a} />)}
          <p className="text-xs text-slate-500">
            {inDelhi
              ? 'EWS/DG and CWSN admissions to private schools in Delhi are usually run centrally by the Directorate of Education; their eligibility rules differ from general admissions.'
              : 'Seats reserved under the Right to Education Act (25% for disadvantaged groups) are usually allotted through a state-run process; eligibility rules differ from general admissions.'}
          </p>
        </div>
      )}
    </AsyncContent>
  );
}

export function AdmissionCard({ admission: a, showSchool = false }: { admission: Admission; showSchool?: boolean }) {
  const docs = a.requirements.filter((r) => r.type === 'DOCUMENT');
  const criteria = a.requirements.filter((r) => r.type !== 'DOCUMENT');
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {showSchool && a.schoolSlug && <Link to={`/schools/${a.schoolSlug}?tab=admissions`} className="link">{a.schoolName}</Link>}
          <h3 className="font-semibold">
            {a.className} · {a.academicYear} · <span className="text-brand-700">{admissionCategoryLabel[a.category]}</span>
          </h3>
          <p className="text-sm text-slate-600">
            {a.applicationStartDate && a.applicationEndDate
              ? <>Applications: {formatDate(a.applicationStartDate)} → {formatDate(a.applicationEndDate)}</>
              : a.applicationEndDate ? <>Last date to apply: {formatDate(a.applicationEndDate)}</>
                : a.applicationStartDate ? <>Applications open from {formatDate(a.applicationStartDate)}</>
                  : <>Application dates: {formatDate(null)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdmissionStatusBadge status={a.status} overridden={a.statusOverridden} />
          <VerificationBadge status={a.verificationStatus} date={a.lastVerifiedDate} />
        </div>
      </div>
      {a.statusOverridden && a.statusOverrideReason && <p className="mt-2 text-xs text-slate-500">* {a.statusOverrideReason}</p>}
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="font-medium">Age eligibility</dt><dd className="text-slate-700">{orNotAvailable(a.ageEligibility)}</dd></div>
        <div><dt className="font-medium">Selection criteria</dt><dd className="whitespace-pre-line text-slate-700">{orNotAvailable(a.selectionCriteria)}</dd></div>
        {criteria.length > 0 && (
          <div><dt className="font-medium">Eligibility & points</dt>
            <dd><ul className="list-disc pl-5 text-slate-700">{criteria.map((c, i) => <li key={i}>{c.description}{c.points !== null && ` — ${c.points} points`}</li>)}</ul></dd>
          </div>
        )}
        {docs.length > 0 && (
          <div><dt className="font-medium">Documents</dt>
            <dd><ul className="list-disc pl-5 text-slate-700">{docs.map((d, i) => <li key={i}>{d.description}{!d.mandatory && ' (if applicable)'}</li>)}</ul></dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Only an open or upcoming cycle gets the prominent "Apply" button; a closed one links the portal plainly. */}
        {a.applicationUrl && (a.status === 'OPEN' || a.status === 'UPCOMING'
          ? <a href={a.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 text-xs">Apply on official portal ↗</a>
          : <a href={a.applicationUrl} target="_blank" rel="noopener noreferrer" className="link text-sm">Admission portal ↗</a>)}
        {a.officialNotificationUrl && <a href={a.officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="link text-sm">Official notification ↗</a>}
        <SourceLink url={a.sourceUrl} />
      </div>
    </article>
  );
}

function FeesTab({ schoolId, inDelhi }: { schoolId: number; inDelhi: boolean }) {
  const state = useApi(() => schoolService.fees(schoolId), [schoolId]);
  const [year, setYear] = useState<string | null>(null);
  const [classCode, setClassCode] = useState<string | null>(null);
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState title="No fee schedule has been published here yet.">
          We only show fees taken from the school’s official fee circular or website. CBSE-affiliated schools publish their
          fee structure in the “Mandatory Public Disclosure” section of their website.
          {inDelhi && (
            <> In Delhi, private school fee regulation is overseen by the{' '}
              <a href="https://www.edudel.nic.in/" className="link" target="_blank" rel="noopener noreferrer">Directorate of Education ↗</a>.</>
          )}
        </EmptyState>
      }>
      {(fees) => {
        const years = [...new Set(fees.map((f) => f.academicYear))];
        const selectedYear = year ?? years[0];
        const ofYear = fees.filter((f) => f.academicYear === selectedYear);
        const selected = ofYear.find((f) => f.classCode === classCode) ?? ofYear[0];
        const chip = (active: boolean) =>
          `chip px-3 py-1.5 text-sm ring-1 ring-inset transition ${active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300'}`;
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="card space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-28 text-sm font-medium text-slate-600">Academic year</span>
                  {years.map((y) => (
                    <button key={y} type="button" onClick={() => setYear(y)} className={chip(y === selectedYear)}>{y}</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-28 text-sm font-medium text-slate-600">Class</span>
                  {ofYear.map((f) => (
                    <button key={f.classCode} type="button" onClick={() => setClassCode(f.classCode)} className={chip(f === selected)}>
                      {f.className.replace('Class ', '')}
                    </button>
                  ))}
                </div>
              </div>
              {selected && <FeeTable fee={selected} />}
            </div>
            <aside className="space-y-4">
              <div className="card p-5">
                <p className="font-display font-bold text-ink">Annual fee by class · {selectedYear}</p>
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {ofYear.map((f) => (
                    <li key={f.classCode}>
                      <button type="button" onClick={() => setClassCode(f.classCode)}
                        className={`flex w-full items-center justify-between py-2 text-left hover:text-brand-700 ${f === selected ? 'font-semibold text-brand-700' : 'text-slate-700'}`}>
                        <span>{f.className}</span>
                        <span className="tabular-nums">{f.recurringAnnualOfficial !== null ? formatMoneyCompact(f.recurringAnnualOfficial) : <span className="text-slate-500">Incomplete</span>}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to={`/fees?school=${schoolId}`} className="btn-primary w-full rounded-full">
                <Icon name="rupee" className="h-4 w-4" /> Estimate total cost
              </Link>
            </aside>
          </div>
        );
      }}
    </AsyncContent>
  );
}

function FacilitiesTab({ school }: { school: SchoolDetail }) {
  const state = useApi(() => schoolService.facilities(school.id), [school.id]);
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={<EmptyState title="No facilities have been recorded yet." />}>
      {(facilities) => {
        const groups = facilities.reduce<Record<string, typeof facilities>>((acc, f) => {
          (acc[f.category] ??= []).push(f);
          return acc;
        }, {});
        return (
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groups).map(([category, items]) => (
                <section key={category} className="card p-4">
                  <h3 className="font-semibold">{facilityCategoryLabel[category as FacilityCategory]}</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {items.map((f) => (
                      <li key={f.id} className="flex gap-2">
                        <span aria-hidden className={f.available === false ? 'text-slate-400' : 'text-emerald-600'}>{f.available === false ? '✕' : '✓'}</span>
                        {f.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              As listed on the school’s official website. <SourceLink url={facilities[0]?.sourceUrl} />
            </p>
          </div>
        );
      }}
    </AsyncContent>
  );
}

function PhotosTab({ schoolId }: { schoolId: number }) {
  const state = useApi(() => schoolService.images(schoolId), [schoolId]);
  return <AsyncContent state={state}>{(images) => <ImageGallery images={images} />}</AsyncContent>;
}

function LocationTab({ school: s }: { school: SchoolDetail }) {
  const hasCoords = s.latitude !== null && s.longitude !== null;
  const nearby = useApi(
    () => schoolService.nearby(s.latitude as number, s.longitude as number, 5, 6, s.id),
    [s.id],
    hasCoords,
  );
  const mapSchools = useMemo(
    () => [
      { id: s.id, name: s.name, slug: s.slug, latitude: s.latitude, longitude: s.longitude },
      ...(nearby.data ?? []).map((n) => ({ ...n, subtitle: n.distanceKm !== null ? `${n.distanceKm.toFixed(1)} km` : undefined })),
    ],
    [s, nearby.data],
  );
  const contact = (
    <section className="card grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><p className="text-slate-500">Address</p><p>{[s.addressLine, s.pinCode].filter(Boolean).join(' – ') || NOT_AVAILABLE}</p></div>
      <div><p className="text-slate-500">Phone</p><p>{s.phone ? <a className="link" href={`tel:${s.phone.split(',')[0].replace(/[^\d+]/g, '')}`}>{s.phone}</a> : NOT_AVAILABLE}</p></div>
      <div><p className="text-slate-500">Email</p><p className="break-all">{s.email ? <a className="link" href={`mailto:${s.email}`}>{s.email}</a> : NOT_AVAILABLE}</p></div>
      <div><p className="text-slate-500">Website</p><p className="break-all">{s.websiteUrl ? <a className="link" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">{s.websiteUrl}</a> : NOT_AVAILABLE}</p></div>
    </section>
  );
  if (!hasCoords) {
    const address = [s.addressLine, s.city, s.district?.name, s.stateName, s.pinCode].filter(Boolean).join(', ');
    return (
      <div className="space-y-6">
        {contact}
        <EmptyState title="Map location not available yet.">
          We only plot schools whose coordinates have been confirmed.
          {s.addressLine && (
            <span className="mt-3 block">
              <a className="btn-secondary text-sm" target="_blank" rel="noopener noreferrer"
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}>
                Look up the postal address on OpenStreetMap ↗
              </a>
              <span className="mt-1 block text-xs text-slate-500">A search for the address, not a confirmed position.</span>
            </span>
          )}
        </EmptyState>
        <SchoolsInSamePlace school={s} />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {contact}
      <SchoolMap schools={mapSchools} highlightId={s.id} />
      <div className="flex flex-wrap gap-3">
        <a href={directionsUrl(s.latitude as number, s.longitude as number)} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">Get directions ↗</a>
        <Link to={`/nearby?lat=${s.latitude}&lon=${s.longitude}`} className="btn-secondary text-sm">Explore this area</Link>
      </div>
      <section>
        <h2 className="text-lg font-semibold">Other schools within 5 km</h2>
        <div className="mt-3">
          <AsyncContent state={nearby} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No other mapped schools within 5 km yet." />}>
            {(list) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((n) => <SchoolCard key={n.id} school={n} />)}</div>}
          </AsyncContent>
        </div>
      </section>
    </div>
  );
}

/**
 * Nearby schools for a profile without coordinates: the same town, else the same PIN code, else the same district, as
 * the source records them. Distances are never guessed.
 */
function SchoolsInSamePlace({ school: s }: { school: SchoolDetail }) {
  const place = s.city ? { city: s.city, label: s.city }
    : s.pinCode ? { pinCode: s.pinCode, label: `PIN code ${s.pinCode}` }
      : s.district ? { district: s.district.slug, label: `${s.district.name} district` } : null;
  const state = useApi(
    () => schoolService.search({ state: s.stateCode, city: place?.city, pinCode: place?.pinCode, district: place?.district, size: 7 }),
    [s.id],
    place !== null,
  );
  if (!place) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">Other schools in {place.label}</h2>
      <div className="mt-3">
        <AsyncContent state={state} isEmpty={(d) => d.content.every((n) => n.id === s.id)}
          empty={<EmptyState title={`No other schools listed in ${place.label} yet.`} />}>
          {(page) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {page.content.filter((n) => n.id !== s.id).slice(0, 6).map((n) => <SchoolCard key={n.id} school={n} />)}
            </div>
          )}
        </AsyncContent>
      </div>
    </section>
  );
}

/**
 * Ranking information at a glance: our evidence-based status and any published ranking verified by an editor. A school
 * missing from published rankings says "Not listed" — never an estimated position.
 */
function RankingSummary({ schoolId }: { schoolId: number }) {
  const state = useApi(() => schoolService.ranking(schoolId), [schoolId]);
  const r = state.data;
  if (!r) return null;
  // The API returns verified entries only; paid or featured listings are not rankings.
  const published = r.externalRankings.filter((e) => !e.sponsored);
  return (
    <section className="card p-5 text-sm">
      <h2 className="font-semibold">Rankings</h2>
      <p className="mt-2 text-slate-700">
        <span className="text-slate-500">India School Finder score: </span>
        {r.siteRanking?.rankPosition ? `Rank #${r.siteRanking.rankPosition} in India (${r.siteRanking.totalScore.toFixed(1)}/100)`
          : r.siteRanking ? `Provisional (${r.siteRanking.totalScore.toFixed(1)}/100, not enough verified evidence for a rank)`
            : 'Not yet ranked'}
      </p>
      <p className="mt-2 text-slate-500">Published rankings:</p>
      {published.length === 0 ? <p className="text-slate-700">Not listed in any published ranking we have verified.</p> : (
        <ul className="mt-1 space-y-1">
          {published.map((e) => (
            <li key={e.id} className="text-slate-700">
              <strong className="text-ink">{e.rankPosition ? `#${e.rankPosition}` : 'Listed'}</strong> · {e.publisher} {e.rankingName} {e.rankingYear}
              {(e.category || e.region) && <span className="text-slate-500"> · {[e.category, e.region].filter(Boolean).join(' · ')}</span>}
            </li>
          ))}
        </ul>
      )}
      <Link to="?tab=ranking" className="link mt-2 inline-block">Ranking details and sources →</Link>
    </section>
  );
}

function RankingTab({ schoolId }: { schoolId: number }) {
  const state = useApi(() => schoolService.ranking(schoolId), [schoolId]);
  return (
    <AsyncContent state={state}>
      {(r) => (
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold">India School Finder score</h2>
            {r.siteRanking ? (
              <>
                <div className="mt-3 flex flex-wrap items-baseline gap-4">
                  <p className="text-4xl font-bold">{r.siteRanking.totalScore.toFixed(1)}<span className="text-lg text-slate-500">/100</span></p>
                  {r.siteRanking.rankPosition ? <p className="text-lg font-semibold text-brand-700">Rank #{r.siteRanking.rankPosition} in India</p> : <ProvisionalBadge />}
                  <p className="text-sm text-slate-600">
                    Evidence share {r.siteRanking.coveragePercent}% ({r.siteRanking.verifiedCoveragePercent ?? 0}% verified) ·{' '}
                    {r.siteRanking.academicYear}
                  </p>
                </div>
                {r.siteRanking.provisional && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    Provisional: too little of this score is backed by verified evidence for a rank. Criteria marked
                    “documented, not verified” reflect what a cited source documents, not a judgement of quality.
                  </p>
                )}
                <div className="mt-4">
                  <Suspense fallback={<Spinner label="Loading chart…" />}><RankingBreakdown breakdown={r.siteRanking.breakdown} /></Suspense>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">Not yet ranked</span>
                There is no source-linked evidence for this school’s ranking criteria yet. We do not estimate missing data.
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500">{r.disclaimer} <Link to="/rankings/methodology" className="link">Methodology</Link></p>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold">Independently published rankings</h2>
            {r.externalRankings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                Not listed in any published ranking we have checked. <Link to="/rankings/published" className="link">Published rankings</Link>
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {r.externalRankings.map((e) => (
                  <li key={e.id} className="py-2">
                    <span className="font-medium">{e.publisher}</span> — {e.rankingName} ({e.rankingYear})
                    {e.category && `, ${e.category}`}{e.region && `, ${e.region}`}:{' '}
                    {e.sponsored ? <span className="chip bg-amber-50 text-amber-900">Sponsored listing, not a ranking</span>
                      : e.rankPosition ? `#${e.rankPosition}` : e.scoreText ?? 'listed'}{' '}
                    <SourceLink url={e.sourceUrl} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AsyncContent>
  );
}

function ReviewsTab({ schoolId }: { schoolId: number }) {
  const [page, setPage] = useState(0);
  const state = useApi(() => schoolService.reviews(schoolId, page), [schoolId, page]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <AsyncContent state={state} isEmpty={(d) => d.content.length === 0}
          empty={<EmptyState title="No published reviews yet.">Be the first parent to share your experience.</EmptyState>}>
          {(reviews) => (
            <>
              <ul className="space-y-4">
                {reviews.content.map((r) => (
                  <li key={r.id} className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{r.title}</h3>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {r.reviewerName ?? 'Anonymous'} · {r.relationship.toLowerCase()} · {formatDate(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              <Pagination page={reviews.page} totalPages={reviews.totalPages} onChange={setPage} />
            </>
          )}
        </AsyncContent>
      </section>
      <ReviewForm schoolId={schoolId} />
    </div>
  );
}

function ReviewForm({ schoolId }: { schoolId: number }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReviewRequest>({
    defaultValues: { relationship: 'PARENT', rating: 5, consentGiven: false },
  });
  const [result, setResult] = useState<'sent' | ApiError | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await schoolService.submitReview(schoolId, { ...values, rating: Number(values.rating) });
      setResult('sent');
      reset();
    } catch (e) {
      setResult(e instanceof ApiError ? e : new ApiError('Could not submit the review.', 0));
    }
  });

  if (result === 'sent') {
    return (
      <div className="card h-fit border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        Thank you. Your review will appear after a moderator checks it against our <Link to="/privacy" className="link">review policy</Link>.
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="card h-fit space-y-3 p-5" noValidate>
      <h2 className="font-semibold">Write a review</h2>
      <p className="text-xs text-slate-500">
        Please don’t include children’s names, phone numbers or other personal details. Reviews are moderated before publication.
      </p>
      <div>
        <label className="label" htmlFor="rv-rating">Overall rating</label>
        <select id="rv-rating" className="input" {...register('rating', { required: true })}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rv-rel">You are a</label>
        <select id="rv-rel" className="input" {...register('relationship')}>
          <option value="PARENT">Parent</option>
          <option value="GUARDIAN">Guardian</option>
          <option value="ALUMNUS">Former student</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rv-title">Title</label>
        <input id="rv-title" className="input" {...register('title', { required: 'Add a short title', minLength: { value: 5, message: 'At least 5 characters' }, maxLength: 150 })} />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="rv-comment">Your experience</label>
        <textarea id="rv-comment" rows={5} className="input" {...register('comment', { required: 'Please describe your experience', minLength: { value: 30, message: 'At least 30 characters' }, maxLength: 3000 })} />
        {errors.comment && <p className="field-error">{errors.comment.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="rv-name">Display name (optional)</label>
        <input id="rv-name" className="input" placeholder="e.g. Parent of a Class III student" {...register('reviewerName', { maxLength: 80 })} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" {...register('consentGiven', { required: 'Consent is required to publish your review' })} />
        I agree that this review may be published on India School Finder, and it reflects my own experience.
      </label>
      {errors.consentGiven && <p className="field-error">{errors.consentGiven.message}</p>}
      {result instanceof ApiError && <p className="field-error">{result.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}
