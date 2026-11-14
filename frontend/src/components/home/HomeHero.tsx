import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rememberSearch } from '../../hooks/usePersonal';
import { Icon, type IconName } from '../common/Icon';
import { SchoolSuggestInput } from '../school/SearchAutocomplete';
import { HomePhoto } from './HomePhoto';

interface Stat { to: string; icon: IconName; tone: string; title: string; sub: string; label: string }

/**
 * The hero photograph's sizes. The server preloads the same file set for wide screens (SeoHeadService.HOME_HERO_PRELOAD),
 * so this and that must stay identical or the browser downloads the picture twice.
 */
export const HERO_SIZES = '(min-width: 1024px) 48vw, calc(100vw - 32px)';

/**
 * The home page's opening: the promise, the school search (with the same suggestions as the directory) and four ways
 * in. Counts appear only once the server has answered; until then each stat says what it opens, never a made-up number.
 */
export function HomeHero({ schools, practiceSets }: { schools: number | null; practiceSets: number | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) rememberSearch(term);
    navigate(term ? `/schools?q=${encodeURIComponent(term)}#directory` : '/schools#directory');
  };
  const stats: Stat[] = [
    {
      to: '/schools', icon: 'institution', tone: 'bg-royal-50 text-royal-600',
      title: schools ? schools.toLocaleString('en-IN') : 'Schools', sub: schools ? 'Schools listed' : 'Across India',
      label: schools ? `${schools.toLocaleString('en-IN')} schools listed: search them` : 'Search schools across India',
    },
    { to: '/rankings', icon: 'trophy', tone: 'bg-amber-50 text-amber-500', title: 'Rankings', sub: 'Top schools', label: 'Rankings: top schools' },
    { to: '/admissions', icon: 'file', tone: 'bg-sky-50 text-sky-600', title: 'Admissions', sub: 'Latest updates', label: 'Admissions: latest updates' },
    {
      to: '/exams/practice', icon: 'target', tone: 'bg-violet-50 text-violet-600',
      title: 'Mock Tests', sub: practiceSets ? `${practiceSets} practice sets` : 'Exam preparation',
      label: practiceSets ? `Mock tests: ${practiceSets} practice sets` : 'Mock tests and exam preparation',
    },
  ];

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-[linear-gradient(115deg,#eaf1ff_0%,#f6f8ff_46%,#f3efff_100%)]">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-royal-100/60 blur-3xl" aria-hidden />
      <div className="container-wide relative">
        <div className="max-w-[620px] pb-8 pt-9 sm:pt-12 lg:min-h-[500px] lg:w-[52%] lg:max-w-none lg:py-14 lg:pr-10 xl:w-[50%] xl:py-16">
          <h1 id="hero-heading" className="font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-navy min-[400px]:text-[38px] sm:text-5xl sm:leading-[1.06] lg:text-[46px] xl:text-[54px]">
            Find the Right School <br className="hidden sm:block" />for{' '}
            <span className="relative inline-block whitespace-nowrap text-flame-600">
              Your Child
              <svg aria-hidden viewBox="0 0 240 18" preserveAspectRatio="none" className="absolute -bottom-2.5 left-0 h-3 w-full text-flame-500 sm:-bottom-3 sm:h-3.5">
                <path d="M4 13C62 4 150 1.5 236 7" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-slate-700 sm:text-lg">
            Discover, compare and prepare for the best schools across India — from admissions and rankings to exam updates,
            preparation and more, all in one place.
          </p>

          <form onSubmit={submit} role="search" aria-label="Search schools"
            className="hero-search mt-7 flex flex-col gap-2 rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-22px_rgba(15,37,87,0.5)] ring-1 ring-slate-200/90 transition focus-within:ring-2 focus-within:ring-royal-500 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SchoolSuggestInput id="home-search" value={q} onChange={setQ} placeholder="Search school, city, board or location" />
            </div>
            <button type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-royal-600 px-7 text-[15px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(11,92,213,0.9)] transition hover:bg-royal-700 active:bg-royal-800">
              Explore Schools <Icon name="arrowRight" className="h-5 w-5" />
            </button>
          </form>

          <ul aria-label="Explore SchoolDhundo" className="mt-7 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-0 lg:grid-cols-2 lg:gap-x-3 xl:grid-cols-4 xl:gap-x-0">
            {stats.map((s, i) => (
              // A divider between stats in a single row (tablets and wide screens); none in the two-by-two grid.
              <li key={s.to} className={`min-w-0 ${i > 0 ? 'sm:border-l sm:border-slate-300/70 sm:pl-3 lg:border-l-0 lg:pl-0 xl:border-l xl:pl-3' : ''}`}>
                <Link to={s.to} aria-label={s.label} className="group flex items-center gap-2 rounded-xl">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.tone}`}><Icon name={s.icon} className="h-[22px] w-[22px]" /></span>
                  <span className="min-w-0 leading-tight">
                    <span className="block whitespace-nowrap font-display text-[15px] font-extrabold tabular-nums text-navy group-hover:text-royal-700">{s.title}</span>
                    <span className="block text-[12px] text-slate-600">{s.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* One photograph, under the text on phones and tablets and a curved panel on the right from lg. */}
      <div className="relative mx-4 mb-8 sm:mx-6 lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:w-[48%] xl:w-[50%]">
        <div aria-hidden className="absolute inset-y-0 -left-2 right-0 hidden bg-gradient-to-b from-royal-400 via-royal-600 to-royal-300 lg:block lg:hero-arc" />
        <div className="relative overflow-hidden rounded-3xl shadow-[0_24px_48px_-28px_rgba(15,37,87,0.6)] lg:absolute lg:inset-0 lg:rounded-none lg:shadow-none lg:hero-arc">
          <HomePhoto id="hero-students" priority alt="Smiling schoolchildren in uniform on a green school campus" sizes={HERO_SIZES}
            className="aspect-[16/10] w-full object-cover object-[50%_40%] sm:aspect-[16/8] lg:aspect-auto lg:h-full" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/25 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-[13px] font-semibold text-navy shadow-lg backdrop-blur sm:bottom-5 sm:left-5 lg:bottom-8 lg:left-[16%]">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon name="shield" className="h-4 w-4" /></span>
            Official sources linked
          </p>
        </div>
      </div>
    </section>
  );
}
