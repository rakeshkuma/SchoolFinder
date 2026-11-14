import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rememberSearch } from '../../hooks/usePersonal';
import { Icon, type IconName } from '../common/Icon';
import { SchoolSuggestInput } from '../school/SearchAutocomplete';
import { HomePhoto } from './HomePhoto';

interface Stat { to: string; icon: IconName; tone: string; title: string; sub: string; label: string }

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
        <div className="max-w-[640px] pb-8 pt-9 sm:pt-12 lg:w-[52%] lg:max-w-none lg:py-14 lg:pr-8 xl:w-[49%] xl:py-16">
          <h1 id="hero-heading" className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-navy min-[400px]:text-[38px] sm:text-5xl sm:leading-[1.08] lg:text-[46px] xl:text-[56px]">
            Find the Right School <br className="hidden sm:block" />for{' '}
            <span className="relative inline-block whitespace-nowrap text-flame-600">
              Your Child
              <svg aria-hidden viewBox="0 0 240 18" preserveAspectRatio="none" className="absolute -bottom-2.5 left-0 h-3 w-full text-flame-500 sm:-bottom-3 sm:h-3.5">
                <path d="M4 13C62 4 150 1.5 236 7" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-700 sm:text-lg">
            Discover, compare and prepare for the best schools across India — from admissions and rankings to exam updates,
            preparation and more, all in one place.
          </p>

          <form onSubmit={submit} role="search" aria-label="Search schools"
            className="hero-search mt-7 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_20px_44px_-22px_rgba(15,37,87,0.45)] ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-royal-500 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SchoolSuggestInput id="home-search" value={q} onChange={setQ} placeholder="Search school, city, board or location" />
            </div>
            <button type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-royal-600 px-6 text-[15px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(11,92,213,0.9)] transition hover:bg-royal-700 active:bg-royal-800">
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

      {/* One set of pictures for every width: under the text on phones and tablets, a curved panel on the right from lg. */}
      <div aria-hidden className="relative mx-4 mb-14 sm:mx-6 lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:w-[48%] xl:w-[51%]">
        <div className="absolute inset-y-0 -left-2.5 right-0 hidden bg-gradient-to-b from-royal-500 via-royal-600 to-royal-200 lg:block lg:hero-arc" />
        <div className="relative overflow-hidden rounded-3xl bg-royal-100 shadow-[0_24px_48px_-28px_rgba(15,37,87,0.6)] lg:absolute lg:inset-0 lg:rounded-none lg:shadow-none lg:hero-arc">
          {/* The campus sits low in a tall sky: zoomed from the bottom so the building and assembly fill the panel. */}
          <HomePhoto id="hero-campus" priority sizes="(min-width: 1024px) 52vw, calc(100vw - 32px)"
            className="aspect-[16/10] w-full origin-bottom scale-[1.18] object-cover object-[50%_100%] sm:aspect-[16/8] lg:aspect-auto lg:h-full lg:scale-[1.45]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy/15 to-transparent" />
        </div>
        <div className="absolute -bottom-10 right-4 w-[44%] max-w-[260px] -rotate-2 overflow-hidden rounded-2xl border-4 border-white shadow-[0_22px_44px_-18px_rgba(15,37,87,0.6)] sm:right-8 lg:bottom-10 lg:left-[7%] lg:right-auto lg:w-[40%] lg:max-w-[300px] lg:rounded-3xl">
          <HomePhoto id="hero-students" eager sizes="(min-width: 1024px) 300px, 44vw" className="aspect-[3/2] w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
