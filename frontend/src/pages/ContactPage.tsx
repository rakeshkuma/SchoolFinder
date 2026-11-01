import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { CONTACT_EMAIL } from '../content/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError, http } from '../services/http';

export type ContactTopic = 'FEEDBACK' | 'CORRECTION' | 'LISTING' | 'RANKING' | 'TECHNICAL';

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: 'FEEDBACK', label: 'Website feedback' },
  { value: 'CORRECTION', label: 'School information correction' },
  { value: 'LISTING', label: 'School listing request' },
  { value: 'RANKING', label: 'Ranking correction' },
  { value: 'TECHNICAL', label: 'Technical issue' },
];

interface Form { name: string; email: string; subject: string; message: string }

/** Field errors for the form, matching the server's rules; empty when it can be sent. */
export function contactProblems(f: Form): Partial<Record<keyof Form, string>> {
  const p: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) p.name = 'Enter your name.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) p.email = 'Enter a valid email address.';
  if (f.subject.trim().length < 3) p.subject = 'Enter a subject of at least 3 characters.';
  if (f.message.trim().length < 10) p.message = 'Enter a message of at least 10 characters.';
  return p;
}

/** The form saves to the server; it says a message was received only when the server has confirmed it. */
export function ContactPage() {
  useDocumentTitle('Contact us');
  const [params] = useSearchParams();
  const initial = CONTACT_TOPICS.find((t) => t.value === params.get('topic'))?.value ?? 'FEEDBACK';
  const [topic, setTopic] = useState<ContactTopic>(initial);
  const [form, setForm] = useState<Form>({ name: '', email: '', subject: '', message: '' });
  const [website, setWebsite] = useState(''); // honeypot: hidden from people
  const [problems, setProblems] = useState<Partial<Record<keyof Form, string>>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = contactProblems(form);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setState('sending');
    setError(null);
    try {
      await http.post('/contact', { topic, ...form, website });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError
        ? (err.status === 429 ? 'Too many messages from this connection. Please try again later, or email us.' : err.message)
        : `Your message could not be sent. Please try again, or email ${CONTACT_EMAIL}.`);
    }
  };

  const field = (k: keyof Form, label: string, input: React.ReactNode) => (
    <div>
      <label className="label" htmlFor={`contact-${k}`}>{label}</label>
      {input}
      {problems[k] && <p id={`contact-${k}-error`} className="field-error">{problems[k]}</p>}
    </div>
  );
  const common = (k: keyof Form) => ({
    id: `contact-${k}`, className: 'input', value: form[k], 'aria-invalid': !!problems[k] || undefined,
    'aria-describedby': problems[k] ? `contact-${k}-error` : undefined,
  });

  return (
    <>
      <PageHeader title="Contact us" subtitle="Feedback, corrections, school listings, rankings and technical problems." />
      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="font-display text-lg font-bold text-ink">Send a message</h2>
          {state === 'sent' ? (
            <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              Your message has been received. We will reply to {form.email.trim()} if a reply is needed.
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-4 space-y-4 text-sm">
              <div>
                <label className="label" htmlFor="contact-topic">What is this about?</label>
                <select id="contact-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value as ContactTopic)}>
                  {CONTACT_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {topic === 'CORRECTION' && (
                <p className="rounded-xl bg-brand-50 p-3 text-brand-900">
                  For a mistake on one school&apos;s page, the <Link to="/suggest" className="link">suggest an update</Link> form is quicker:
                  it attaches the school and asks for the official page.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {field('name', 'Name', <input {...common('name')} maxLength={100} autoComplete="name" onChange={(e) => set('name', e.target.value)} />)}
                {field('email', 'Email', <input {...common('email')} type="email" maxLength={254} autoComplete="email" onChange={(e) => set('email', e.target.value)} />)}
              </div>
              {field('subject', 'Subject', <input {...common('subject')} maxLength={150} onChange={(e) => set('subject', e.target.value)} />)}
              {field('message', 'Message', <textarea {...common('message')} rows={6} maxLength={4000} onChange={(e) => set('message', e.target.value)} />)}
              <div className="sr-only" aria-hidden>
                <label htmlFor="contact-website">Leave this empty</label>
                <input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              {error && <p role="alert" className="font-medium text-red-700">{error}</p>}
              <button type="submit" className="btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send message'}</button>
              <p className="text-xs text-slate-500">
                Please don&apos;t include information about children that we don&apos;t need. We use your name and email only to reply, and delete
                them when your message has been dealt with. <Link to="/privacy#contact" className="link">Privacy policy</Link>
              </p>
            </form>
          )}
        </section>
        <aside className="space-y-4">
          <section className="card p-5" aria-labelledby="contact-email-heading">
            <h2 id="contact-email-heading" className="font-display text-lg font-bold text-ink">Email</h2>
            <a href={`mailto:${CONTACT_EMAIL}`} className="link mt-2 inline-flex items-center gap-2 break-all text-sm">
              <Icon name="mail" className="h-4 w-4 shrink-0" /> {CONTACT_EMAIL}
            </a>
          </section>
          <section className="card p-5 text-sm text-slate-700" aria-labelledby="contact-school-heading">
            <h2 id="contact-school-heading" className="font-display text-lg font-bold text-ink">Schools</h2>
            <p className="mt-2">
              To correct a fee, date or fact, use <Link to="/suggest" className="link">suggest an update</Link> and link the official page
              that states it. An editor checks every suggestion before anything changes.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
