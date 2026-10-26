import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState } from '../components/common/States';
import { SchoolPicker } from '../components/school/SchoolPicker';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../services/http';
import { schoolService } from '../services/publicApi';
import type { SchoolDetail, UpdateSubmissionRequest, UpdateTopic } from '../types/api';
import { placeLine } from '../utils/format';

const TOPICS: { value: UpdateTopic; label: string }[] = [
  { value: 'FEES', label: 'Fees (new fee circular or schedule)' },
  { value: 'ADMISSIONS', label: 'Admissions (dates, classes, eligibility)' },
  { value: 'CLASSES', label: 'Classes offered' },
  { value: 'CONTACT', label: 'Address, phone, e-mail or website' },
  { value: 'FACILITIES', label: 'Facilities' },
  { value: 'PHOTOS', label: 'Photos the school is happy to share' },
  { value: 'CORRECTION', label: 'Something on the profile is wrong' },
  { value: 'OTHER', label: 'Something else' },
];

/**
 * Lets a school or a parent suggest an update, citing the official page that states it. Submissions go to editors,
 * who check the source before anything changes on the site.
 */
export function SuggestUpdatePage() {
  useDocumentTitle('Suggest an update');
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = searchParams.get('school') ?? '';
  const school = useApi(() => schoolService.bySlug(slug), [slug], slug.length > 0);

  return (
    <>
      <PageHeader eyebrow="Help keep profiles accurate" title="Suggest an update"
        subtitle="Schools and parents can tell us about new fees, admission dates, classes, contact details or mistakes. An editor checks every suggestion against the official page you link before anything changes." />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {!slug ? (
            <div className="card space-y-3 p-5">
              <h2 className="font-semibold">Which school is this about?</h2>
              <SchoolPicker onPick={(s) => setSearchParams({ school: s.slug, ...(searchParams.get('topic') ? { topic: searchParams.get('topic') as string } : {}) })} />
            </div>
          ) : (
            <AsyncContent state={school} empty={<EmptyState title="School not found." />}>
              {(s) => <SuggestForm school={s} initialTopic={searchParams.get('topic') as UpdateTopic | null} />}
            </AsyncContent>
          )}
        </div>
        <aside className="card h-fit space-y-3 p-5 text-sm text-slate-600">
          <h2 className="font-semibold text-ink">How suggestions are handled</h2>
          <p>We publish only facts we can link to an official source: the school&apos;s own website or documents, a board directory or a government page.</p>
          <p>An editor opens the page you link, checks it, and updates the profile with that page as the source. Social media posts and messages without a source can&apos;t be used.</p>
          <p>Your e-mail is optional and only used to reply to you. It is deleted once your suggestion has been handled.</p>
          <p>Please don&apos;t include information about children.</p>
        </aside>
      </div>
    </>
  );
}

function SuggestForm({ school: s, initialTopic }: { school: SchoolDetail; initialTopic: UpdateTopic | null }) {
  const valid = TOPICS.some((t) => t.value === initialTopic);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateSubmissionRequest>({
    defaultValues: { topic: valid ? (initialTopic as UpdateTopic) : 'FEES', role: 'PARENT', message: '', sourceUrl: '', contactEmail: '', website: '' },
  });
  const [result, setResult] = useState<'sent' | ApiError | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await schoolService.suggestUpdate(s.id, { ...values, contactEmail: values.contactEmail?.trim() || undefined });
      setResult('sent');
    } catch (e) {
      setResult(e instanceof ApiError ? e : new ApiError('Could not send your suggestion. Please try again.', 0));
    }
  });

  if (result === 'sent') {
    return (
      <div className="card space-y-3 border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900" role="status">
        <p className="font-semibold">Thank you — your suggestion for {s.name} has been received.</p>
        <p>An editor will check the page you linked. If it confirms the update, the profile will be changed with that page cited as the source.</p>
        <Link to={`/schools/${s.slug}`} className="link">Back to {s.name}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">School</p>
        <p className="font-display text-lg font-bold text-ink">{s.name}</p>
        <p className="text-sm text-slate-500">{placeLine(s.locality, s.city, s.stateName)}</p>
      </div>
      <div>
        <label className="label" htmlFor="su-topic">What is this about?</label>
        <select id="su-topic" className="input" {...register('topic')}>
          {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="su-message">What should change?</label>
        <textarea id="su-message" rows={5} className="input" aria-invalid={!!errors.message}
          placeholder="e.g. The fee schedule for 2026-27 (Nursery to Class XII) is published on the school website."
          {...register('message', { required: 'Please describe the update', minLength: { value: 20, message: 'At least 20 characters' }, maxLength: { value: 2000, message: 'At most 2,000 characters' } })} />
        {errors.message && <p className="field-error">{errors.message.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="su-source">Link to the official page that states this</label>
        <input id="su-source" type="url" inputMode="url" className="input" placeholder="https://" aria-invalid={!!errors.sourceUrl}
          {...register('sourceUrl', {
            required: 'A link is needed so an editor can check the update',
            pattern: { value: /^https?:\/\/\S+\.\S+/i, message: 'Enter a full web address starting with http:// or https://' },
          })} />
        <p className="mt-1 text-xs text-slate-500">The school&apos;s website, a fee circular or admission notice (PDF), a board directory or a government page.</p>
        {errors.sourceUrl && <p className="field-error">{errors.sourceUrl.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="su-role">You are</label>
        <select id="su-role" className="input" {...register('role')}>
          <option value="PARENT">A parent or guardian</option>
          <option value="SCHOOL">From the school</option>
          <option value="OTHER">Someone else</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="su-email">Your e-mail (optional, only to reply to you)</label>
        <input id="su-email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.contactEmail}
          {...register('contactEmail', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid e-mail address, or leave it empty' } })} />
        {errors.contactEmail && <p className="field-error">{errors.contactEmail.message}</p>}
      </div>
      {/* Honeypot: invisible to people (and skipped by keyboard and screen readers); bots that fill it are discarded. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="su-website">Website</label>
        <input id="su-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      {result instanceof ApiError && <p className="field-error" role="alert">{result.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send suggestion'}</button>
    </form>
  );
}
