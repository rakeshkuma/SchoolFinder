import { Link, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { track } from '../utils/analytics';

const contactLink = (topic: 'CLAIM' | 'ADVERTISING', subject: string) =>
  `/contact?topic=${topic}&subject=${encodeURIComponent(subject)}`;

function Feature({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <li className="card p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name={icon} className="h-5 w-5" /></span>
      <h3 className="mt-3 font-display font-bold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
    </li>
  );
}

/** For schools and education businesses. States plainly what is paid, how it is labelled, and what is never for sale. */
export function AdvertisePage() {
  useDocumentTitle('Advertise with SchoolDhundo');
  return (
    <>
      <PageHeader eyebrow="For schools and education brands" title="Advertise with SchoolDhundo"
        subtitle="Reach parents who are choosing a school and students preparing for school entrance exams, with promotion that is always clearly labelled." />
      <div className="container-page space-y-12 py-8">
        <section aria-labelledby="ways-h">
          <h2 id="ways-h" className="section-title">Ways to work with us</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon="star" title="Featured school listing">
              Your school shown first in its city and board pages and on the home page, marked “Featured”. Your profile’s facts still
              come from official sources.
            </Feature>
            <Feature icon="mail" title="Admission enquiries">
              Parents send enquiries from your profile with their consent. We pass them to your admissions office.
            </Feature>
            <Feature icon="building" title="Managed school profile">
              Keep photos, fee schedules, admission notices and contact details up to date, checked by our editors against your
              documents.
            </Feature>
            <Feature icon="layers" title="Sponsored cards">
              A sponsored card beside relevant schools or exam pages, labelled “Sponsored”, for schools, coaching institutes and
              education services.
            </Feature>
            <Feature icon="book" title="Books and learning resources">
              Relevant books and learning resources recommended on exam preparation pages, with affiliate links disclosed.
            </Feature>
            <Feature icon="target" title="Exam preparation partners">
              Partner with us on mock tests and practice for JNVST, AISSEE, Netarhat and other entrance exams.
            </Feature>
          </ul>
        </section>

        <section aria-labelledby="rules-h" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 id="rules-h" className="font-display text-xl font-bold text-ink">What is never for sale</h2>
          <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {[
              'Ranking positions. Published rankings stay under their publisher’s name; our own score uses only evidence.',
              'Reviews or ratings. We never write, buy or remove reviews for payment.',
              'Facts on a profile. Fees, results and admission dates come from official documents, paid or not.',
              'Parents’ details. An enquiry goes only to the school the parent chose, with their consent.',
            ].map((t) => <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {t}</li>)}
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Paid placements are always labelled “Featured”, “Sponsored” or “Advertisement”. See our <Link to="/editorial-policy" className="link">editorial policy</Link>.
          </p>
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-bold text-white">Talk to us</p>
            <p className="mt-1 text-sm text-slate-300">Tell us about your school or organisation and what you would like to achieve. We reply with options and prices.</p>
          </div>
          <Link to={contactLink('ADVERTISING', 'Advertising enquiry')} className="btn-accent shrink-0">Send an advertising enquiry</Link>
        </section>
      </div>
    </>
  );
}

/** For a school's own staff: how to take over its profile, and how we check that the request really comes from the school. */
export function ClaimSchoolPage() {
  useDocumentTitle('Claim your school profile');
  const [params] = useSearchParams();
  const school = params.get('school');
  const subject = school ? `Claim profile: ${school}` : 'Claim a school profile';
  return (
    <>
      <PageHeader eyebrow="For schools" title="Claim your school profile"
        subtitle="Make sure parents see your school’s correct fees, admission dates, photos and contact details." />
      <div className="container-page grid gap-10 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="why-h">
            <h2 id="why-h" className="section-title">Why claim it</h2>
            <ul className="mt-4 space-y-3 text-slate-700">
              {[
                'Publish your official fee schedule and admission notice, linked to your own documents.',
                'Add photographs and your logo, and keep contact details current.',
                'Receive admission enquiries from parents who chose your school.',
                'Correct anything out of date, with an editor’s check.',
              ].map((t) => <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /> {t}</li>)}
            </ul>
          </section>
          <section aria-labelledby="how-h">
            <h2 id="how-h" className="section-title">How it works</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['Write to us', 'Send the claim from an email address on the school’s own domain, or attach a letter on school letterhead signed by the principal.'],
                ['We check it', 'An editor confirms that the request comes from the school, usually by calling the number published by the school or its board.'],
                ['Send your updates', 'Share fee circulars, admission notices and photos. Each change is linked to its source and shows when it was checked.'],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-bold text-white">{i + 1}</span>
                  <span><span className="block font-semibold text-ink">{title}</span><span className="block text-sm text-slate-600">{text}</span></span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="h-fit rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
          <h2 className="font-display text-lg font-bold text-ink">Start your claim</h2>
          <p className="mt-2 text-sm text-slate-600">
            Claiming a profile is free. It does not change rankings, which are never for sale.
          </p>
          <Link to={contactLink('CLAIM', subject)} className="btn-primary mt-4 w-full" onClick={() => track('school_claim', { step: 'start', school: school ?? undefined })}>
            Claim {school ? 'this' : 'your'} school
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Want promotion as well? See <Link to="/advertise" className="link">advertising options</Link>.
          </p>
        </aside>
      </div>
    </>
  );
}
