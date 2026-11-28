import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { AdmissionStatusBadge, ProvisionalBadge, SourceLink, Stars, TrustBadge, VerificationBadge } from '../components/common/Badges';
import { BoardingTab } from '../components/school/BoardingTab';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, ErrorState, Spinner } from '../components/common/States';
import { CompareButton } from '../components/school/CompareBar';
import { FeeTable } from '../components/school/FeeTable';
import { ImageGallery } from '../components/school/ImageGallery';
import { SchoolCard, SchoolCover } from '../components/school/SchoolCard';
import { Icon, type IconName } from '../components/common/Icon';
import { SaveButton } from '../components/school/SaveButton';
import { ClassesTab, SourcesTab, useSchoolSeo } from '../components/school/SchoolDetailSections';
import { labelledBy, PANEL_ID, SchoolProfileNav, type ProfileSection } from '../components/school/SchoolProfileNav';
import { SchoolMap } from '../components/school/SchoolMap';
import { useApi, type ApiState } from '../hooks/useApi';
import { serverPageHasPhoto, useDocumentTitle } from '../hooks/useDocumentTitle';
import { recentSchools, type SchoolRef } from '../hooks/usePersonal';
import { ApiError } from '../services/http';
import { schoolService } from '../services/publicApi';
import type { Admission, ExternalRanking, Fee, FacilityCategory, ReviewRequest, SchoolDetail, SchoolImage } from '../types/api';
import {
  admissionCategoryLabel,
  directionsUrl,
  entranceExamInfo,
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
import { aboutSummary, admissionFact, boardShortName, classesRange, feeFact, fullAddress, isBoardRecordText, locationSummary } from '../utils/schoolProfile';
import { SchoolOrStateNotFound } from './PlaceRedirect';
import { AD_SLOTS, AdSlot } from '../components/common/AdSlot';
import { track } from '../utils/analytics';
import { schoolFaqs } from '../utils/schoolFaq';
import { UdiseCard } from '../components/school/UdiseCard';
import { EnquiryButton } from '../components/school/EnquiryForm';
import { NETWORK_PAGES } from '../content/networks';
import { profileLink } from '../utils/profileLink';
import { PREP_EXAMS as PREP_PAGES, useSectionAddress } from '../utils/sectionAddress';

// The charts library is only needed in the Ranking tab, so it is not part of the profile's first download.
const RankingBreakdown = lazy(() => import('../components/school/RankingBreakdown').then((m) => ({ default: m.RankingBreakdown })));

const toRef = (s: SchoolDetail): SchoolRef => ({
  id: s.id, name: s.name, slug: s.slug, place: placeLine(s.locality, s.city, s.stateName),
});

/**
 * The profile's sections. A section's address is the profile's own with the id as its fragment (/schools/x#admissions,
 * see utils/sectionAddress); the ids are the ?tab= values links used before, and nginx sends every old ?tab= address to
 * the same section. Boarding is a main section only for schools with a boarding profile.
 */
function profileSections(s: SchoolDetail, photoCount: number): ProfileSection[] {
  return [
    { id: 'overview', label: 'Overview', primary: true },
    ...(s.boarding ? [{ id: 'boarding', label: 'Boarding', primary: true }] : []),
    { id: 'admissions', label: 'Admissions', primary: true },
    { id: 'fees', label: 'Fees', primary: true },
    { id: 'facilities', label: 'Facilities', primary: true },
    { id: 'photos', label: 'Gallery', count: photoCount, primary: true },
    { id: 'location', label: 'Contact', primary: true },
    { id: 'classes', label: 'Classes & curriculum', primary: false },
    { id: 'ranking', label: 'Ranking', primary: false },
    { id: 'reviews', label: 'Reviews', count: s.reviewCount, primary: false },
    { id: 'sources', label: 'Sources', primary: false },
  ];
}

export function SchoolDetailPage() {
  const { slug = '' } = useParams();
  // The open section is the address's #fragment. A card link (utils/profileLink) asks for one in the navigation state
  // and an old link may still say ?tab=; either is moved into the fragment, as a click on the section's tab would.
  const section = useSectionAddress('overview');
  // One request brings the profile and what its first view shows (photos, fees, admissions, questions, ranking).
  const school = useApi(() => schoolService.page(slug), [slug]);
  useDocumentTitle(school.data?.name);
  useSchoolSeo(school.data);
  const loaded = school.data;
  useEffect(() => {
    if (!loaded) return;
    recentSchools.add(toRef(loaded));
    track('school_profile_view', { school_slug: loaded.slug, state: loaded.stateCode, board: loaded.board?.code });
  }, [loaded]);
  // Photos, fees and admissions are loaded once and shared by the header, its facts and their sections.
  const images = useApi(() => schoolService.images(loaded!.id), [loaded?.id], !!loaded);
  const fees = useApi(() => schoolService.fees(loaded!.id), [loaded?.id], !!loaded);
  const admissions = useApi(() => schoolService.admissions(loaded!.id), [loaded?.id], !!loaded);
  // If the photo cannot be loaded the header shows the branded cover instead (no broken image).
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [loaded?.id]);
  const heroRef = useRef<HTMLElement>(null);
  const heroVisible = useVisible(heroRef, !!loaded);

  // /schools/bihar is a state rather than a school: SchoolOrStateNotFound sends it to the state page, or shows 404.
  if (school.error?.status === 404) return <SchoolOrStateNotFound slug={slug} />;
  if (school.error) return <div className="container-page py-10"><ErrorState error={school.error} onRetry={school.reload} /></div>;
  if (!school.data) return <Spinner label="Loading school…" />;

  const s = school.data;
  const gallery = (images.data ?? []).filter((i) => i.imageType !== 'LOGO');
  const photo = photoFailed ? undefined : gallery[0];
  const sections = profileSections(s, gallery.length);
  const tab = sections.some((x) => x.id === section.requested) ? section.requested : 'overview';
  const setTab = (id: string) => {
    section.open(id);
    // Read further down, a new section starts at its top (under the sticky bar), not mid-page.
    const top = document.getElementById('school-sections');
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  };

  const panel: Record<string, ReactNode> = {
    overview: <Overview school={s} onTab={setTab} />,
    boarding: s.boarding ? <BoardingTab boarding={s.boarding} /> : null,
    admissions: <AdmissionsSection school={s} state={admissions} />,
    fees: <FeesTab state={fees} schoolId={s.id} websiteUrl={s.websiteUrl} inDelhi={s.stateCode === 'DL'} />,
    facilities: <FacilitiesTab school={s} />,
    photos: <AsyncContent state={images}>{(list) => <ImageGallery images={list} />}</AsyncContent>,
    location: <LocationTab school={s} />,
    classes: <ClassesTab school={s} />,
    ranking: <RankingTab schoolId={s.id} />,
    reviews: <ReviewsTab schoolId={s.id} />,
    sources: <SourcesTab school={s} />,
  };

  return (
    <>
      <ProfileHero heroRef={heroRef} school={s} photo={photo} photoCount={gallery.length} imagesLoading={images.loading}
        onPhotoFail={() => setPhotoFailed(true)} fees={fees} admissions={admissions} onTab={setTab} />
      <SchoolProfileNav sections={sections} active={tab} onChange={setTab}
        action={!heroVisible && (
          <span className="flex items-center gap-3">
            <span className="max-w-[16rem] truncate font-display text-sm font-bold text-navy">{s.name}</span>
            <EnquiryButton school={s} className="btn-primary whitespace-nowrap rounded-full px-4 py-1.5 text-sm" />
          </span>
        )} />
      <div id="school-sections" className="container-page scroll-mt-[120px] py-6 lg:py-8">
        <div role="tabpanel" id={PANEL_ID} aria-labelledby={labelledBy(sections, tab)}>
          {panel[tab]}
        </div>
        <AdSlot slot={AD_SLOTS.schoolProfile} />
        <SchoolFaq school={s} />
        <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          <Icon name="building" className="h-4 w-4 text-slate-500" />
          Work at {s.name}? Keep its fees, admission notices and photos up to date.
          {/* Form links are nofollow: their per-school addresses are not pages for search engines (robots.txt). */}
          <Link to={`/claim-school?school=${encodeURIComponent(s.name)}`} rel="nofollow" className="link font-semibold">Claim this profile</Link>
        </p>
      </div>
    </>
  );
}

/** True while the element is on screen (true too where IntersectionObserver is missing, e.g. in tests). */
function useVisible(ref: React.RefObject<HTMLElement>, ready: boolean): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!ready || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '-120px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, ready]);
  return visible;
}

/**
 * Common questions about this school, answered only from its own record. The list comes from the server, which sends
 * the same questions to search engines as FAQPage data; if it cannot be loaded, the browser builds them from the profile.
 */
function SchoolFaq({ school: s }: { school: SchoolDetail }) {
  const remote = useApi(() => schoolService.faqs(s.id), [s.id]);
  const local = useMemo(() => schoolFaqs(s), [s]);
  const faqs = remote.data ?? (remote.error ? local : []);
  if (faqs.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="faq-h">
      <h2 id="faq-h" className="font-display text-xl font-bold text-navy">Questions about {s.name}</h2>
      <p className="mt-1 text-sm text-slate-500">Answered from the sources listed on this profile. Confirm important details with the school.</p>
      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {faqs.map((f) => (
          <details key={f.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-ink transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none group-open:text-navy">
              {f.question}
              <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="break-words px-5 pb-4 text-sm leading-relaxed text-slate-700">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** The school's phone, e-mail or website — the first one published — as the "contact" action; null when none is. */
function contactAction(s: SchoolDetail): { href: string; label: string; icon: IconName } | null {
  const phone = s.phone?.split(',')[0].trim();
  if (phone) return { href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: 'Call school', icon: 'phone' };
  if (s.email) return { href: `mailto:${s.email}`, label: 'Email school', icon: 'mail' };
  return null;
}

type HeroProps = {
  school: SchoolDetail; photo: SchoolImage | undefined; photoCount: number; imagesLoading: boolean; onPhotoFail: () => void;
  fees: ApiState<Fee[]>; admissions: ApiState<Admission[]>; onTab: (id: string) => void;
};

/**
 * The profile's header: the school's name and place, what kind of school it is (only what is recorded), the actions,
 * its photo (or a branded cover, never another school's picture) and four facts parents look for first.
 */
function ProfileHero({ heroRef, school: s, photo, photoCount, imagesLoading, onPhotoFail, fees, admissions, onTab }: HeroProps & { heroRef: React.Ref<HTMLElement> }) {
  const [copied, setCopied] = useState(false);
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
  const contact = contactAction(s);
  const board = boardShortName(s.board);
  const boarding = s.boarding || s.hasHostel === true ? 'Boarding' : s.hasHostel === false ? 'Day school' : null;
  const chips = [
    s.network ? networkLabel[s.network] : null,
    schoolTypeLabel[s.schoolType],
    s.genderType ? (s.genderType === 'CO_ED' ? 'Co-ed' : `${genderLabel[s.genderType]} only`) : null,
    boarding,
  ].filter((c): c is string => !!c);
  const place = locationSummary(s);
  return (
    <header ref={heroRef} className="border-b border-slate-200 bg-gradient-to-b from-white to-canvas">
      <div className="container-page py-5 lg:py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <Link to="/schools" className="hover:text-navy">Schools</Link>
          {s.stateSlug && (
            <><Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-400" /><Link to={`/states/${s.stateSlug}`} className="hover:text-navy">{s.stateName}</Link></>
          )}
          {s.stateSlug && s.district && (
            <><Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-400" /><Link to={`/states/${s.stateSlug}/${s.district.slug}`} className="hover:text-navy">{s.district.name}</Link></>
          )}
          {s.locality && (
            <><Icon name="chevronRight" className="h-3.5 w-3.5 text-slate-400" />
              <Link to={`/schools?state=${s.stateCode}&locality=${encodeURIComponent(s.locality)}`} className="hover:text-navy">{s.locality}</Link></>
          )}
        </nav>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              {s.logoUrl && <img src={s.logoUrl} alt={`${s.name} logo`} width={64} height={64} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1.5 shadow-card ring-1 ring-slate-200 sm:h-16 sm:w-16" />}
              <div className="min-w-0">
                <h1 className="break-words font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">{s.name}</h1>
                {place && (
                  <p className="mt-2 flex items-start gap-1.5 text-slate-600">
                    <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-flame-600" />
                    <span>{place}{s.pinCode ? <span className="text-slate-500"> · {s.pinCode}</span> : null}</span>
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="School type">
              {board && <li className="chip bg-navy px-3 py-1 text-white">{board}</li>}
              {chips.map((c) => <li key={c} className="chip bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">{c}</li>)}
              {s.verificationStatus !== 'UNVERIFIED' && <li><VerificationBadge status={s.verificationStatus} date={s.lastVerifiedDate} /></li>}
              {s.averageRating !== null && s.reviewCount > 0 && (
                <li className="chip bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200"><Stars rating={s.averageRating} /> <span className="text-slate-500">({s.reviewCount})</span></li>
              )}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <EnquiryButton school={s} className="btn-primary whitespace-nowrap rounded-full bg-flame-700 px-5 py-2 hover:bg-flame-800 active:bg-flame-800" />
              {s.websiteUrl && (
                <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary whitespace-nowrap rounded-full px-4 py-2">
                  <Icon name="globe" className="h-4 w-4" /> Official website <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {contact && (
                <a href={contact.href} className="btn-secondary whitespace-nowrap rounded-full px-4 py-2">
                  <Icon name={contact.icon} className="h-4 w-4" /> {contact.label}
                </a>
              )}
              <SaveButton school={toRef(s)} withLabel />
              <CompareButton id={s.id} name={s.name} slug={s.slug} size="md" />
              <button type="button" onClick={share} className="btn-secondary whitespace-nowrap rounded-full px-4 py-2" aria-live="polite">
                <Icon name="share" className="h-4 w-4" /> {copied ? 'Link copied' : 'Share'}
              </button>
            </div>
          </div>
          <HeroPhoto school={s} photo={photo} count={photoCount} loading={imagesLoading} onFail={onPhotoFail} onGallery={() => onTab('photos')} />
        </div>
        <QuickFacts school={s} fees={fees} admissions={admissions} onTab={onTab} />
      </div>
    </header>
  );
}

/**
 * The main photo with the credit and licence its source requires; while photos load, a placeholder of the same size
 * (no layout shift on wide screens); with none, the school's branded cover on wide screens (phones skip the empty frame).
 */
function HeroPhoto({ school: s, photo, count, loading, onFail, onGallery }: {
  school: SchoolDetail; photo: SchoolImage | undefined; count: number; loading: boolean; onFail: () => void; onGallery: () => void;
}) {
  if (!photo) {
    // When the server says this page has a photo, phones keep its frame (and caption line) while photos load too, so
    // nothing below moves when it arrives.
    const reserve = loading && serverPageHasPhoto();
    return (
      <div className={reserve ? undefined : 'hidden lg:block'} aria-hidden={loading || undefined} data-testid="hero-photo-placeholder">
        <div className={`aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-slate-200 ${loading ? 'animate-pulse bg-slate-200 motion-reduce:animate-none' : ''}`}>
          {!loading && <SchoolCover name={s.name} caption={s.city ?? s.district?.name} />}
        </div>
        {reserve && <p className="mt-2 text-[11px] leading-snug">&nbsp;</p>}
        {!loading && (
          <p className="mt-2 text-xs text-slate-500">
            No verified photo of this school yet. <Link to={`/claim-school?school=${encodeURIComponent(s.name)}`} rel="nofollow" className="link">School staff can add one</Link>
          </p>
        )}
      </div>
    );
  }
  return <HeroFigure key={photo.id} school={s} photo={photo} count={count} onFail={onFail} onGallery={onGallery} />;
}

/**
 * The photo itself. If the small version cannot be loaded (some stored thumbnails use a size the image host no longer
 * serves) it tries the full-size photo before giving up and showing the cover.
 */
function HeroFigure({ school: s, photo, count, onFail, onGallery }: {
  school: SchoolDetail; photo: SchoolImage; count: number; onFail: () => void; onGallery: () => void;
}) {
  const [fullSize, setFullSize] = useState(false);
  const small = fullSize ? photo.url : photo.thumbnailUrl ?? photo.url;
  const failed = () => (!fullSize && small !== photo.url ? setFullSize(true) : onFail());
  return (
    <figure className="min-w-0">
      <button type="button" onClick={onGallery} className="group relative block w-full overflow-hidden rounded-2xl shadow-lift ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label={`Open the photo gallery of ${s.name}`}>
        <span className="relative block aspect-[16/10] bg-slate-100">
          <img src={small} srcSet={!fullSize && photo.thumbnailUrl && photo.thumbnailUrl !== photo.url ? `${photo.thumbnailUrl} 1x, ${photo.url} 2x` : undefined}
            alt={photo.altText || `Campus of ${s.name}`} onError={failed} decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
        </span>
        {count > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-navy/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Icon name="layers" className="h-3.5 w-3.5" /> {count} photos
          </span>
        )}
      </button>
      <figcaption className="mt-2 text-[11px] leading-snug text-slate-500">
        {photo.illustrative ? 'Illustration, not a photo of this school' : (
          <>Photo: <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-navy hover:underline">{photo.credit ?? 'source'}</a>
            {photo.license ? ` · ${photo.license}` : ''}</>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Four facts parents look for first, from published records only. Fees and admissions open their sections; while they
 * load, a placeholder is shown rather than "not published", and missing admission dates are never shown as "closed".
 */
function QuickFacts({ school: s, fees, admissions, onTab }: {
  school: SchoolDetail; fees: ApiState<Fee[]>; admissions: ApiState<Admission[]>; onTab: (id: string) => void;
}) {
  const fee = feeFact(fees.data);
  const adm = admissionFact(admissions.data);
  const items: { label: string; value: string | null; hint?: string; tab?: string; tone?: string; loading?: boolean; icon: IconName }[] = [
    { label: 'Classes', value: classesRange(s), icon: 'graduation' },
    { label: 'Established', value: s.establishedYear ? String(s.establishedYear) : null, icon: 'calendar' },
    { label: 'Annual fee from', value: fee?.value ?? null, hint: fee ? `${fee.year} · latest published` : 'Official fees only, never estimates', tab: 'fees', loading: fees.loading, icon: 'rupee' },
    { label: 'Admissions', value: adm.value, hint: adm.hint, tab: 'admissions', tone: adm.tone, loading: admissions.loading, icon: 'calendar' },
  ];
  // Classes and year are shown only when recorded; fees and admissions always ("not published" is worth knowing there).
  const shown = items.filter((it) => it.tab || it.value !== null);
  const columns = shown.length === 4 ? 'lg:grid-cols-4' : shown.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  const valueClass = (it: (typeof items)[number]) => it.value === null ? 'text-slate-500'
    : it.tone === 'open' ? 'text-emerald-700' : it.tone === 'upcoming' ? 'text-royal-700' : it.tone === 'unknown' ? 'text-slate-600' : 'text-navy';
  return (
    <ul className={`mt-6 grid grid-cols-2 gap-3 ${columns}`} aria-label="Key facts">
      {shown.map((it) => {
        const body = (
          <>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Icon name={it.icon} className="h-3.5 w-3.5" />{it.label}
            </span>
            {it.loading ? <span className="mt-1.5 block h-5 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" aria-label="Loading" />
              : <span className={`mt-1 block font-display text-base font-bold sm:text-lg ${valueClass(it)}`}>{/* "2026-27" with a non-breaking hyphen, so an academic year never splits across lines. */}
                {(it.value ?? 'Not published').replace(/(\d{4})-(\d{2})/g, '$1‑$2')}</span>}
            {!it.loading && it.hint && <span className="mt-0.5 block text-xs text-slate-500">{it.hint}</span>}
          </>
        );
        return (
          <li key={it.label}>
            {it.tab ? (
              <button type="button" onClick={() => onTab(it.tab as string)}
                className="group block h-full w-full rounded-xl bg-white p-3.5 text-left ring-1 ring-slate-200 transition hover:ring-royal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {body}
                <span className="sr-only"> — show {it.tab === 'fees' ? 'fees' : 'admission'} details</span>
              </button>
            ) : <div className="h-full rounded-xl bg-white p-3.5 ring-1 ring-slate-200">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

type FactRow = { label: string; value: ReactNode | null; icon: IconName };

/** The overview: a short factual introduction, the recorded facts, the official information card and the sidebar. */
function Overview({ school: s, onTab }: { school: SchoolDetail; onTab: (id: string) => void }) {
  const boardRecord = isBoardRecordText(s.description) ? s.description : null;
  const ownDescription = s.description && !boardRecord ? s.description : null;
  const exam = s.boarding?.entranceExam ? entranceExamInfo[s.boarding.entranceExam] : null;
  const yesNo = (v: boolean | null) => (v === null ? null : formatYesNo(v));
  const classes = s.classesOffered.length
    ? `${s.classesOffered[0].name} to ${s.classesOffered[s.classesOffered.length - 1].name}`
    : s.affiliatedUpTo ? `Up to ${s.affiliatedUpTo} (as affiliated by ${s.board?.code === 'CISCE' ? 'CISCE' : s.board?.code ?? 'the board'}; the lowest class is not published)` : null;
  // Recorded facts only; the empty ones are named once, below, instead of as rows of "Not available".
  const facts: FactRow[] = [
    { label: 'Education board', value: s.board && s.board.code !== 'OTHER' ? s.board.name : null, icon: 'book' },
    { label: 'Classes', value: classes, icon: 'graduation' },
    { label: 'School category', value: schoolTypeLabel[s.schoolType], icon: 'building' },
    { label: 'Management', value: s.management ? managementLabel[s.management] : null, icon: 'institution' },
    { label: 'School network', value: s.network ? <NetworkLink network={s.network} /> : null, icon: 'flag' },
    { label: 'Run by (trust / society)', value: s.managingBody, icon: 'users' },
    { label: 'Principal / head', value: s.principalName, icon: 'user' },
    { label: 'Students', value: s.genderType ? genderLabel[s.genderType] : null, icon: 'users' },
    { label: 'Day or boarding', value: s.hasHostel === null ? (s.boarding ? 'Boarding' : null) : s.hasHostel ? 'Boarding (hostel available)' : 'Day school', icon: 'bed' },
    { label: 'Entrance exam', value: exam ? (exam.guide ? <Link to={`/exams/${exam.guide}`} className="link">{exam.label}</Link> : exam.label) : null, icon: 'target' },
    { label: 'Medium of instruction', value: s.mediumOfInstruction, icon: 'globe' },
    { label: 'Established', value: s.establishedYear !== null ? String(s.establishedYear) : null, icon: 'calendar' },
    { label: 'School timings', value: s.schoolTimings, icon: 'clock' },
    { label: 'Student–teacher ratio', value: s.studentTeacherRatio ? `${s.studentTeacherRatio} : 1` : null, icon: 'users' },
    { label: 'Transport', value: yesNo(s.hasTransport), icon: 'bus' },
    { label: 'Accessibility', value: s.accessibilityFeatures, icon: 'info' },
  ];
  const known = facts.filter((f) => f.value !== null && f.value !== '');
  // Only the facts a parent would expect; a missing network or entrance exam is not "unpublished".
  const expected = new Set(['Education board', 'Classes', 'Management', 'Principal / head', 'Students', 'Day or boarding', 'Medium of instruction', 'Established', 'School timings', 'Transport']);
  const unknown = facts.filter((f) => (f.value === null || f.value === '') && expected.has(f.label)).map((f) => f.label);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section className="card p-5 sm:p-6" aria-labelledby="about-h">
          <h2 id="about-h" className="font-display text-lg font-bold text-navy">About {s.name}</h2>
          <p className="mt-2 leading-relaxed text-slate-700">{aboutSummary(s)}</p>
          {ownDescription && <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{ownDescription}</p>}
          {(s.boarding || exam) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {s.boarding && (
                <button type="button" onClick={() => onTab('boarding')} className="btn-secondary rounded-full px-4 py-1.5 text-sm">
                  <Icon name="bed" className="h-4 w-4" /> Boarding details
                </button>
              )}
              {exam && (
                <button type="button" onClick={() => onTab('admissions')} className="btn-secondary rounded-full px-4 py-1.5 text-sm">
                  <Icon name="target" className="h-4 w-4" /> Admission through {exam.label}
                </button>
              )}
            </div>
          )}
        </section>
        <section className="card p-5 sm:p-6" aria-labelledby="facts-h">
          <h2 id="facts-h" className="font-display text-lg font-bold text-navy">Key information</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {known.map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-royal-700 ring-1 ring-slate-200" aria-hidden>
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-ink">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {unknown.length > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Not yet published by a source:</span> {unknown.join(' · ')}.{' '}
              <Link to={`/suggest?school=${encodeURIComponent(s.slug)}`} rel="nofollow" className="link">Know where the school publishes these? Tell us</Link>
            </p>
          )}
        </section>
        <UdiseCard school={s} boardRecord={boardRecord} />
      </div>
      <aside className="space-y-4" aria-label="Contact, rankings and sources">
        <ContactCard school={s} onTab={onTab} />
        <RankingSummary schoolId={s.id} onTab={onTab} />
        <SourcesCard school={s} onTab={onTab} />
      </aside>
    </div>
  );
}

/** Published contact details only; when none is published, it says so once and offers the enquiry instead. */
function ContactCard({ school: s, onTab }: { school: SchoolDetail; onTab: (id: string) => void }) {
  const address = fullAddress(s);
  const rows = [
    s.phone && { label: 'Phone', icon: 'phone' as IconName, node: <a className="link" href={`tel:${s.phone.split(',')[0].replace(/[^\d+]/g, '')}`}>{s.phone}</a> },
    s.email && { label: 'Email', icon: 'mail' as IconName, node: <a className="link break-all" href={`mailto:${s.email}`}>{s.email}</a> },
    s.websiteUrl && { label: 'Website', icon: 'globe' as IconName, node: <a className="link break-all" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">{s.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗</a> },
    s.admissionPortalUrl && { label: 'Admission portal', icon: 'external' as IconName, node: <a className="link" href={s.admissionPortalUrl} target="_blank" rel="noopener noreferrer">Open portal ↗</a> },
  ].filter((r): r is { label: string; icon: IconName; node: JSX.Element } => !!r);
  return (
    <section className="card p-5" aria-labelledby="contact-h">
      <h2 id="contact-h" className="font-display font-bold text-navy">Contact</h2>
      {address && (
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-700">
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{address}
        </p>
      )}
      {rows.length > 0 ? (
        <dl className="mt-3 space-y-2.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <Icon name={r.icon} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0"><dt className="sr-only">{r.label}</dt><dd>{r.node}</dd></div>
            </div>
          ))}
        </dl>
      ) : <p className="mt-3 text-sm text-slate-600">No phone number, e-mail or website has been published for this school yet.</p>}
      <button type="button" onClick={() => onTab('location')} className="link mt-3 inline-flex items-center gap-1 text-sm">
        {s.latitude !== null && s.longitude !== null ? 'Map, directions and nearby schools' : 'Location and nearby schools'} <Icon name="arrowRight" className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

/** "School information & sources": where this profile comes from, when, whether an editor checked it, and how to correct it. */
function SourcesCard({ school: s, onTab }: { school: SchoolDetail; onTab: (id: string) => void }) {
  return (
    <section className="card p-5 text-sm" aria-labelledby="sources-h">
      <h2 id="sources-h" className="font-display font-bold text-navy">School information &amp; sources</h2>
      <ul className="mt-3 space-y-2 text-slate-600">
        <li className="flex gap-2"><Icon name="file" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>Profile from the school’s official record{s.sourceRetrievedDate ? `, retrieved ${formatDate(s.sourceRetrievedDate)}` : ''}. <SourceLink url={s.sourceUrl} /></span></li>
        <li className="flex gap-2"><Icon name={s.lastVerifiedDate ? 'check' : 'info'} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{s.lastVerifiedDate ? `Checked by a SchoolDhundo editor on ${formatDate(s.lastVerifiedDate)}.` : 'Not yet checked by a SchoolDhundo editor.'}</span></li>
        <li className="flex gap-2"><Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>Record last updated {formatDate(s.updatedAt)}.</span></li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">Missing details are left blank, never estimated. SchoolDhundo is independent; listing a school does not mean the school endorses this site.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onTab('sources')} className="btn-secondary rounded-full px-3 py-1.5 text-xs">All sources</button>
        <Link to={`/suggest?school=${encodeURIComponent(s.slug)}&topic=CORRECTION`} rel="nofollow" className="btn-secondary rounded-full px-3 py-1.5 text-xs">
          <Icon name="info" className="h-3.5 w-3.5" /> Report incorrect information
        </Link>
      </div>
    </section>
  );
}

/**
 * The network's name, linked to its directory page when it has one (content/networks.ts). Until November 2026 no school
 * profile linked to its network page; the server's HTML links the same page (SeoBodyService.networkSlug).
 */
function NetworkLink({ network }: { network: NonNullable<SchoolDetail['network']> }) {
  const slug = Object.entries(NETWORK_PAGES).find(([, page]) => page.network === network)?.[0];
  return slug ? <Link to={`/network/${slug}`} className="link">{networkLabel[network]}</Link> : <>{networkLabel[network]}</>;
}

/** Admission through an entrance exam (from the boarding profile), with SchoolDhundo’s own guide and preparation pages. */
function EntranceExamCard({ school: s }: { school: SchoolDetail }) {
  const examKey = s.boarding?.entranceExam;
  if (!examKey) return null;
  const exam = entranceExamInfo[examKey];
  const prep = exam.guide && PREP_PAGES.has(exam.guide);
  return (
    <section className="mb-5 rounded-2xl border border-royal-100 bg-royal-50/60 p-5" aria-labelledby="exam-h">
      <h3 id="exam-h" className="flex items-center gap-2 font-display font-bold text-navy"><Icon name="target" className="h-5 w-5" /> Admission through the {exam.label}</h3>
      <p className="mt-1 text-sm text-slate-700">
        {s.boarding?.entryClasses ? `Entry: ${s.boarding.entryClasses}. ` : ''}
        Dates and eligibility are set in each year’s official notice.
      </p>
      {exam.guide && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prep && <Link to={`/exams/${exam.guide}`} className="btn-primary rounded-full bg-navy px-4 py-1.5 text-sm hover:bg-navy-800">Free practice and mock tests</Link>}
          <Link to={prep ? `/exams/${exam.guide}/guide` : `/exams/${exam.guide}`} className="btn-secondary rounded-full px-4 py-1.5 text-sm">Eligibility, dates and syllabus</Link>
        </div>
      )}
    </section>
  );
}

/** The way to ask the school a question, at the top of the admissions tab. */
function EnquiryCard({ school: s }: { school: SchoolDetail }) {
  return (
    <section className="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center">
      <div>
        <h3 className="font-display font-bold text-navy">Have a question about admission?</h3>
        <p className="mt-1 text-sm text-slate-600">Send your query about seats, eligibility, fees or hostel. We pass it to the school with your consent.</p>
      </div>
      <EnquiryButton school={s} className="btn-primary shrink-0 rounded-full bg-flame-700 hover:bg-flame-800 active:bg-flame-800" />
    </section>
  );
}

function AdmissionsSection({ school: s, state }: { school: SchoolDetail; state: ApiState<Admission[]> }) {
  return (
    <>
      <EntranceExamCard school={s} />
      <EnquiryCard school={s} />
      <AdmissionsTab state={state} portal={s.admissionPortalUrl} website={s.websiteUrl} inDelhi={s.stateCode === 'DL'} />
    </>
  );
}

function AdmissionsTab({ state, portal, website, inDelhi }: { state: ApiState<Admission[]>; portal: string | null; website: string | null; inDelhi: boolean }) {
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState title="No admission dates have been published here yet.">
          <span className="block">This does not mean admissions are closed: schools announce dates in their own notices.</span>
          <span className="mt-3 flex flex-wrap justify-center gap-2">
            {portal && <a href={portal} className="btn-secondary rounded-full px-4 py-1.5 text-sm" target="_blank" rel="noopener noreferrer">School’s admission page ↗</a>}
            {website && <a href={website} className="btn-secondary rounded-full px-4 py-1.5 text-sm" target="_blank" rel="noopener noreferrer">Official website ↗</a>}
          </span>
          <span className="mt-3 block">
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
          {showSchool && a.schoolSlug && <Link {...profileLink(a.schoolSlug, 'admissions')} className="link">{a.schoolName}</Link>}
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
          <TrustBadge status={a.verificationStatus} verifiedOn={a.lastVerifiedDate} updatedOn={a.updatedAt} hasSource={!!a.sourceUrl} />
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

function FeesTab({ state, schoolId, websiteUrl, inDelhi }: { state: ApiState<Fee[]>; schoolId: number; websiteUrl: string | null; inDelhi: boolean }) {
  const [year, setYear] = useState<string | null>(null);
  const [classCode, setClassCode] = useState<string | null>(null);
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState title="Fees have not been published here yet.">
          We only show fees taken from the school’s official fee circular or website, never estimates. CBSE-affiliated
          schools publish their fee structure in the “Mandatory Public Disclosure” section of their website.
          {inDelhi && (
            <> In Delhi, private school fee regulation is overseen by the{' '}
              <a href="https://www.edudel.nic.in/" className="link" target="_blank" rel="noopener noreferrer">Directorate of Education ↗</a>.</>
          )}
          {websiteUrl && (
            <span className="mt-3 block">
              <a href={websiteUrl} className="btn-secondary rounded-full px-4 py-1.5 text-sm" target="_blank" rel="noopener noreferrer">Official website ↗</a>
            </span>
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
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

const FACILITY_ICONS: Record<FacilityCategory, IconName> = {
  SPORTS: 'trophy', LIBRARY: 'bookOpen', LABORATORY: 'sparkle', COMPUTER: 'columns', TRANSPORT: 'bus', HOSTEL: 'bed',
  ACCESSIBILITY: 'users', EXTRACURRICULAR: 'star', ARTS: 'sun', HEALTH: 'shield', OTHER: 'layers',
};

/** What the school record itself states about a hostel and transport, shown when no facility list exists. */
function recordFacilities(s: SchoolDetail): string[] {
  return [s.hasHostel === true || s.boarding ? 'Hostel (boarding)' : null, s.hasTransport === true ? 'School transport' : null].filter((x): x is string => !!x);
}

function FacilitiesTab({ school }: { school: SchoolDetail }) {
  const state = useApi(() => schoolService.facilities(school.id), [school.id]);
  const fromRecord = recordFacilities(school);
  return (
    <AsyncContent state={state} isEmpty={(d) => d.length === 0}
      empty={
        <div className="space-y-4">
          {fromRecord.length > 0 && (
            <section className="card p-5">
              <h3 className="font-display font-bold text-navy">From the school record</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {fromRecord.map((f) => <li key={f} className="chip bg-emerald-50 px-3 py-1 text-emerald-800 ring-1 ring-emerald-100"><Icon name="check" className="h-3.5 w-3.5" />{f}</li>)}
              </ul>
            </section>
          )}
          <EmptyState title="No facility list has been recorded from the school’s sources yet.">
            This does not mean the school lacks them. Schools usually describe their library, laboratories and sports
            facilities on their own website{school.websiteUrl ? <> (<a href={school.websiteUrl} className="link" target="_blank" rel="noopener noreferrer">official website ↗</a>)</> : null}.
          </EmptyState>
        </div>
      }>
      {(facilities) => {
        const groups = facilities.reduce<Record<string, typeof facilities>>((acc, f) => {
          (acc[f.category] ??= []).push(f);
          return acc;
        }, {});
        return (
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groups).map(([category, items]) => (
                <section key={category} className="card p-5">
                  <h3 className="flex items-center gap-2.5 font-display font-bold text-navy">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-royal-50 text-royal-700" aria-hidden>
                      <Icon name={FACILITY_ICONS[category as FacilityCategory] ?? 'layers'} className="h-4 w-4" />
                    </span>
                    {facilityCategoryLabel[category as FacilityCategory]}
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                    {items.map((f) => (
                      <li key={f.id} className="flex gap-2">
                        <span aria-hidden className={f.available === false ? 'text-slate-400' : 'text-emerald-600'}>{f.available === false ? '✕' : '✓'}</span>
                        <span>{f.name}{f.available === false && <span className="sr-only"> (not available)</span>}</span>
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
  // Address parts and contact details as published; each missing one says so plainly, in one place.
  const place: [string, string | null][] = [
    ['Address', fullAddress(s) || null], ['Town / city', s.city], ['District', s.district?.name ?? null], ['State / UT', s.stateName], ['PIN code', s.pinCode],
  ];
  const contact = (
    <section className="card grid gap-6 p-5 text-sm sm:p-6 md:grid-cols-2" aria-labelledby="loc-h">
      <div>
        <h2 id="loc-h" className="font-display text-lg font-bold text-navy">Address</h2>
        <dl className="mt-3 space-y-2">
          {place.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
              <dt className="text-slate-500">{label}</dt><dd className={value ? 'break-words text-ink' : 'text-slate-500'}>{value ?? NOT_AVAILABLE}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h2 className="font-display text-lg font-bold text-navy">Contact the school</h2>
        <dl className="mt-3 space-y-2">
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Phone</dt><dd>{s.phone ? <a className="link" href={`tel:${s.phone.split(',')[0].replace(/[^\d+]/g, '')}`}>{s.phone}</a> : <span className="text-slate-500">{NOT_AVAILABLE}</span>}</dd></div>
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Email</dt><dd className="break-all">{s.email ? <a className="link" href={`mailto:${s.email}`}>{s.email}</a> : <span className="text-slate-500">{NOT_AVAILABLE}</span>}</dd></div>
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Website</dt><dd className="break-all">{s.websiteUrl ? <a className="link" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">{s.websiteUrl}</a> : <span className="text-slate-500">{NOT_AVAILABLE}</span>}</dd></div>
          {s.admissionPortalUrl && <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2"><dt className="text-slate-500">Admissions</dt><dd><a className="link" href={s.admissionPortalUrl} target="_blank" rel="noopener noreferrer">Admission portal ↗</a></dd></div>}
        </dl>
        <p className="mt-3 text-xs text-slate-500">Publicly listed by the school or its board. Please confirm details with the school before visiting.</p>
      </div>
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
function RankingSummary({ schoolId, onTab }: { schoolId: number; onTab: (id: string) => void }) {
  const state = useApi(() => schoolService.ranking(schoolId), [schoolId]);
  const r = state.data;
  if (!r) return null;
  // The API returns verified entries only; paid or featured listings are not rankings.
  const published = r.externalRankings.filter((e) => !e.sponsored);
  return (
    <section className="card p-5 text-sm">
      <h2 className="font-display font-bold text-navy">Rankings</h2>
      <p className="mt-2 text-slate-700">
        <span className="text-slate-500">SchoolDhundo score: </span>
        {r.siteRanking?.rankPosition ? `Rank #${r.siteRanking.rankPosition} in India (${r.siteRanking.totalScore.toFixed(1)}/100)`
          : r.siteRanking ? `Provisional (${r.siteRanking.totalScore.toFixed(1)}/100, not enough verified evidence for a rank)`
            : 'Not yet ranked'}
      </p>
      <p className="mt-2 text-slate-500">Published rankings:</p>
      {published.length === 0 ? <p className="text-slate-700">Not listed in any published ranking we have verified.</p> : (
        <ul className="mt-1 space-y-1">
          {published.map((e) => (
            <li key={e.id} className="text-slate-700">
              <strong className="text-ink">{rankLabel(e)}</strong> · {e.publisher} {e.rankingName} {e.rankingYear}
              {(e.category || e.region) && <span className="text-slate-500"> · {[e.category, e.region].filter(Boolean).join(' · ')}</span>}
            </li>
          ))}
        </ul>
      )}
      {/* A button like the profile's other section links: a ?tab= link would be one more address for this page. */}
      <button type="button" onClick={() => onTab('ranking')} className="link mt-2 inline-block">Ranking details and sources →</button>
    </section>
  );
}

/** National, state and city ranks are shown under their own names; a rating is not a rank. */
export function rankLabel(e: Pick<ExternalRanking, 'nationalRank' | 'stateRank' | 'cityRank' | 'rating' | 'rankPosition' | 'scoreText'>): string {
  const parts = [e.nationalRank != null && `National #${e.nationalRank}`, e.stateRank != null && `State #${e.stateRank}`, e.cityRank != null && `City #${e.cityRank}`].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (e.rating) return `${e.rating.charAt(0)}${e.rating.slice(1).toLowerCase()} rating`;
  return e.rankPosition ? `#${e.rankPosition}` : e.scoreText ?? 'Listed';
}

function RankingTab({ schoolId }: { schoolId: number }) {
  const state = useApi(() => schoolService.ranking(schoolId), [schoolId]);
  return (
    <AsyncContent state={state}>
      {(r) => (
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold">SchoolDhundo score</h2>
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
                Not listed in any published ranking we have checked. <Link to="/rankings" className="link">See rankings</Link>
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {r.externalRankings.map((e) => (
                  <li key={e.id} className="py-2">
                    <span className="font-medium">{e.publisher}</span> — {e.rankingName} ({e.rankingYear})
                    {e.category && `, ${e.category}`}{e.region && `, ${e.region}`}:{' '}
                    {e.sponsored ? <span className="chip bg-amber-50 text-amber-900">Sponsored listing, not a ranking</span>
                      : rankLabel(e)}
                    {e.score != null && <span className="text-slate-600"> · score {e.score}{e.maxScore != null ? ` / ${e.maxScore}` : ''}</span>}
                    {' '}<Link to="/rankings/methodology#sources" className="text-xs text-slate-500 underline">Source and method</Link>
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
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
        I agree that this review may be published on SchoolDhundo, and it reflects my own experience.
      </label>
      {errors.consentGiven && <p className="field-error">{errors.consentGiven.message}</p>}
      {result instanceof ApiError && <p className="field-error">{result.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}
