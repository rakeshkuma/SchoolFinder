import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../services/http';
import { schoolService } from '../../services/publicApi';
import type { SchoolDetail } from '../../types/api';
import { track } from '../../utils/analytics';
import { Icon } from '../common/Icon';

/** Classes a parent can ask about when the school's own classes are not recorded. */
const ALL_CLASSES: { code: string; name: string }[] = [
  { code: 'NURSERY', name: 'Nursery' }, { code: 'LKG', name: 'LKG' }, { code: 'UKG', name: 'UKG' },
  ...['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((c) => ({ code: c, name: `Class ${c}` })),
];

/** The next two academic years ("2027-28"), the ones parents enquire about. */
export function enquiryYears(today = new Date()): string[] {
  // Sessions start in April; from October parents are already asking about the next one.
  const start = today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear();
  return [start, start + 1].map((y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`);
}

/** The same check the server applies: an Indian mobile number, with or without +91, 0, spaces or hyphens. */
export const validPhone = (phone: string) => /^(?:\+91|0)?[\s-]*[6-9](?:[\s-]*\d){9}$/.test(phone.trim());

interface Form { parentName: string; phone: string; email: string; classCode: string; academicYear: string; message: string }

/**
 * "Enquire about admission": a button that opens a short form. It asks only what the school needs to reply, and the
 * parent must agree to the details being shared with this school. SchoolDhundo staff pass it on; nothing is sold or
 * shared with anyone else.
 */
export function EnquiryButton({ school, className = 'btn-primary whitespace-nowrap rounded-full px-4 py-1.5 text-sm' }: {
  school: Pick<SchoolDetail, 'id' | 'name' | 'classesOffered'>; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="mail" className="h-4 w-4" /> Enquire about admission
      </button>
      {open && <EnquiryDialog school={school} onClose={() => setOpen(false)} />}
    </>
  );
}

function EnquiryDialog({ school, onClose }: { school: Pick<SchoolDetail, 'id' | 'name' | 'classesOffered'>; onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const years = enquiryYears();
  const classes = school.classesOffered.length > 0 ? school.classesOffered : ALL_CLASSES;
  const [form, setForm] = useState<Form>({ parentName: '', phone: '', email: '', classCode: classes[0].code, academicYear: years[0], message: '' });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const problems = [
    form.parentName.trim().length < 2 && 'your name',
    !validPhone(form.phone) && 'a 10-digit mobile number',
    form.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && 'a valid email (or leave it empty)',
    !consent && 'your agreement to share the details with the school',
  ].filter(Boolean) as string[];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problems.length > 0) {
      setError(`Please add ${problems.join(', ')}.`);
      return;
    }
    setState('sending');
    setError(null);
    try {
      await schoolService.enquire(school.id, { ...form, email: form.email.trim() || null, consent, website });
      setState('sent');
      track('generate_lead', { lead_type: 'admission_enquiry', school_id: school.id, class_code: form.classCode });
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError
        ? (err.status === 429 ? 'Too many enquiries from this connection. Please try again later.' : err.message)
        : 'Your enquiry could not be sent. Please try again in a few minutes.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lift sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Admission enquiry</p>
            <h2 id={titleId} className="mt-1 font-display text-xl font-bold text-ink">{school.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 rounded-full p-0" aria-label="Close">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {state === 'sent' ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-900" role="status">
            <p className="flex items-center gap-2 font-semibold"><Icon name="check" className="h-5 w-5" /> Your enquiry has been received.</p>
            <p className="mt-2 text-sm">
              We will pass it to {school.name}, who should contact you on the number you gave. For dates and the official process,
              always check the school&apos;s own admission notice.
            </p>
            <button type="button" onClick={onClose} className="btn-primary mt-4">Done</button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
            <p className="text-sm text-slate-600">
              Ask about seats, eligibility, fees or hostel. We share it only with this school, and only because you agree below.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="label">Parent&apos;s name</span>
                <input className="input" autoComplete="name" maxLength={100} value={form.parentName} onChange={set('parentName')} required />
              </label>
              <label className="block">
                <span className="label">Mobile number</span>
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="98765 43210"
                  value={form.phone} onChange={set('phone')} required />
              </label>
              <label className="block">
                <span className="label">Email <span className="font-normal text-slate-500">(optional)</span></span>
                <input className="input" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} />
              </label>
              <label className="block">
                <span className="label">Class</span>
                <select className="input" value={form.classCode} onChange={set('classCode')}>
                  {classes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Academic year</span>
                <select className="input" value={form.academicYear} onChange={set('academicYear')}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Your question <span className="font-normal text-slate-500">(optional)</span></span>
                <textarea className="input min-h-[84px]" maxLength={1000} value={form.message} onChange={set('message')}
                  placeholder="For example: Is there a hostel? When does the admission form come out?" />
              </label>
            </div>
            {/* Honeypot: hidden from people, filled only by bots. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)}
              className="hidden" aria-hidden />
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(null); }} />
              <span>
                I agree that SchoolDhundo may share these details with {school.name} for this admission enquiry, and contact me about it.
                Details are removed once the enquiry is closed. <Link to="/privacy#enquiries" className="link" target="_blank">Privacy policy</Link>
              </span>
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send enquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
