import { useState, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AdmissionStatusBadge, VerificationBadge } from '../../components/common/Badges';
import { useApi } from '../../hooks/useApi';
import { adminService } from '../../services/adminApi';
import { rankingService, referenceService, schoolService } from '../../services/publicApi';
import type {
  AdmissionCategory,
  AdmissionRequest,
  AdmissionStatus,
  CriterionScoreRequest,
  FacilityCategory,
  FeeRequest,
  ImagePermission,
  ImageRequest,
  ImageType,
  RequirementType,
  SchoolDetail,
  VerifiableEntityType,
  VerificationStatus,
  VerifyRequest,
} from '../../types/api';
import { admissionCategoryLabel, admissionStatusLabel, facilityCategoryLabel, formatDate, formatMoney, imageTypeLabel, verificationLabel } from '../../utils/format';
import { applyServerErrors, blankToNull, currentAcademicYear, optionalNumber, permissionLabel } from './formUtils';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p role="status" className={msg.ok ? 'text-sm text-emerald-700' : 'field-error'}>{msg.text}</p>;
}

function useClasses() {
  return useApi(() => referenceService.classes(), []);
}

// ---------------------------------------------------------------------------------------------

export function VerifyPanel({ school, onChange }: { school: SchoolDetail; onChange: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  const history = useApi(() => adminService.verificationHistory(school.id), [school.id, nonce]);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<VerifyRequest>({
    defaultValues: { entityType: 'SCHOOL', status: 'VERIFIED', sourceUrl: school.sourceUrl },
  });
  const submit = handleSubmit(async (v) => {
    try {
      await adminService.verify(school.id, { ...v, entityId: v.entityType === 'SCHOOL' ? null : Number(v.entityId) });
      setMsg({ ok: true, text: 'Verification recorded.' });
      reset({ ...v, notes: '' });
      setNonce((n) => n + 1);
      onChange();
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  return (
    <Panel title="Verify against a source">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <label className="text-sm"><span className="label">Record</span>
          <select className="input" {...register('entityType')}>
            {(['SCHOOL', 'FEE', 'ADMISSION', 'IMAGE', 'FACILITY', 'CRITERION_SCORE'] as VerifiableEntityType[]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label className="text-sm"><span className="label">Record id (not for SCHOOL)</span><input className="input" type="number" {...register('entityId')} />{errors.entityId && <span className="field-error">{errors.entityId.message}</span>}</label>
        <label className="text-sm"><span className="label">New status</span>
          <select className="input" {...register('status')}>
            {(Object.keys(verificationLabel) as VerificationStatus[]).map((s) => <option key={s} value={s}>{verificationLabel[s]}</option>)}
          </select></label>
        <label className="text-sm"><span className="label">Source checked *</span><input className="input" {...register('sourceUrl', { required: 'Cite the source' })} />{errors.sourceUrl && <span className="field-error">{errors.sourceUrl.message}</span>}</label>
        <label className="text-sm sm:col-span-2"><span className="label">Notes</span><input className="input" {...register('notes')} /></label>
        <div className="sm:col-span-2 flex items-center gap-3"><button className="btn-primary" disabled={isSubmitting}>Record verification</button><Feedback msg={msg} /></div>
      </form>
      <h3 className="mt-5 text-sm font-semibold">History</h3>
      <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-600">
        {(history.data ?? []).map((h) => (
          <li key={h.id}>{formatDate(h.verifiedAt)} · {h.entityType} #{h.entityId}: {h.previousStatus ?? '—'} → {h.newStatus} by {h.verifiedBy}{h.notes && ` — ${h.notes}`}</li>
        ))}
        {history.data?.length === 0 && <li>No verification recorded yet.</li>}
      </ul>
    </Panel>
  );
}

export function StatusPanel({ school, onChange }: { school: SchoolDetail; onChange: (s: SchoolDetail) => void }) {
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const toggle = async () => {
    try {
      onChange(await adminService.setStatus(school.id, !school.active, reason));
      setMsg({ ok: true, text: school.active ? 'School hidden from the public site.' : 'School published.' });
      setReason('');
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };
  return (
    <Panel title="Publication status">
      <p className="text-sm text-slate-600">Currently {school.active ? 'visible on the public site' : 'hidden from the public site'}.</p>
      <label className="mt-3 block text-sm"><span className="label">Reason (required, kept in the audit log)</span><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={school.active ? 'btn-danger' : 'btn-primary'} disabled={!reason.trim()} onClick={toggle}>
          {school.active ? 'Deactivate' : 'Activate'}
        </button>
        <Feedback msg={msg} />
      </div>
    </Panel>
  );
}

export function FeePanel({ schoolId }: { schoolId: number }) {
  const classes = useClasses();
  const [nonce, setNonce] = useState(0);
  const fees = useApi(() => schoolService.fees(schoolId), [schoolId, nonce]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FeeRequest>({
    defaultValues: { classCode: 'NURSERY', academicYear: currentAcademicYear(), tuitionMonths: 12, securityDepositRefundable: true },
  });
  const submit = handleSubmit(async (v) => {
    try {
      await adminService.upsertFee(schoolId, blankToNull(v as unknown as Record<string, unknown>) as unknown as FeeRequest);
      setMsg({ ok: true, text: 'Fee schedule saved (pending verification).' });
      setNonce((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  const money = (name: keyof FeeRequest, label: string) => (
    <label className="text-sm"><span className="label">{label}</span>
      <input className="input" type="number" step="0.01" min={0} placeholder="Not published" {...register(name, optionalNumber)} />
      {errors[name] && <span className="field-error">{String(errors[name]?.message)}</span>}
    </label>
  );
  return (
    <Panel title="Fee schedule (per class and academic year)">
      <p className="mb-3 text-xs text-slate-500">Leave a field empty if it is not published. Enter 0 only when the source states there is no such charge.</p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3" noValidate>
        <label className="text-sm"><span className="label">Class</span>
          <select className="input" {...register('classCode')}>{(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label className="text-sm"><span className="label">Academic year</span><input className="input" {...register('academicYear', { required: true })} />{errors.academicYear && <span className="field-error">{errors.academicYear.message}</span>}</label>
        <label className="text-sm"><span className="label">Tuition months</span><input className="input" type="number" min={1} max={12} {...register('tuitionMonths', optionalNumber)} /></label>
        {money('registrationFee', 'Registration (one-time)')}
        {money('admissionFee', 'Admission (one-time)')}
        {money('monthlyTuition', 'Monthly tuition')}
        {money('monthlyCharges', 'Other monthly charges')}
        <label className="text-sm"><span className="label">Monthly charges include</span><input className="input" placeholder="e.g. development fund, smart class" {...register('monthlyChargesDescription')} /></label>
        {money('annualCharges', 'Annual charges')}
        {money('developmentCharges', 'Development charges (annual)')}
        {money('otherCharges', 'Other charges (annual)')}
        {money('securityDeposit', 'Security deposit')}
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" {...register('securityDepositRefundable')} />Deposit refundable</label>
        {money('transportMonthly', 'Transport per month')}
        <label className="text-sm"><span className="label">Transport months</span><input className="input" type="number" min={1} max={12} {...register('transportMonths', optionalNumber)} /></label>
        {money('booksUniformEstimate', 'Books & uniform (estimate)')}
        <label className="text-sm sm:col-span-3"><span className="label">Fee circular / source URL *</span><input className="input" {...register('sourceUrl', { required: 'A source is required' })} />{errors.sourceUrl && <span className="field-error">{errors.sourceUrl.message}</span>}</label>
        <div className="flex items-center gap-3 sm:col-span-3"><button className="btn-primary" disabled={isSubmitting}>Save fees</button><Feedback msg={msg} /></div>
      </form>
      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        {(fees.data ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2">#{f.id} · {f.className} {f.academicYear} · annual {formatMoney(f.recurringAnnualOfficial)} <VerificationBadge status={f.verificationStatus} /></li>
        ))}
      </ul>
    </Panel>
  );
}

interface AdmissionForm extends Omit<AdmissionRequest, 'statusOverride' | 'requirements'> {
  statusOverride: AdmissionStatus | '';
  requirements: { type: RequirementType; description: string; points: string }[];
}

export function AdmissionPanel({ schoolId }: { schoolId: number }) {
  const classes = useClasses();
  const [nonce, setNonce] = useState(0);
  const list = useApi(() => schoolService.admissions(schoolId), [schoolId, nonce]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const nextYear = (() => { const [a] = currentAcademicYear().split('-').map(Number); return `${a + 1}-${String((a + 2) % 100).padStart(2, '0')}`; })();
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AdmissionForm>({
    defaultValues: { classCode: 'NURSERY', academicYear: nextYear, category: 'GENERAL', statusOverride: '', requirements: [] },
  });
  const reqs = useFieldArray({ control, name: 'requirements' });
  const submit = handleSubmit(async (v) => {
    const body: AdmissionRequest = {
      ...(blankToNull(v as unknown as Record<string, unknown>) as unknown as AdmissionRequest),
      statusOverride: v.statusOverride === '' ? null : v.statusOverride,
      requirements: v.requirements.filter((r) => r.description.trim()).map((r) => ({ type: r.type, description: r.description, points: r.points === '' ? null : Number(r.points) })),
    };
    try {
      await adminService.upsertAdmission(schoolId, body);
      setMsg({ ok: true, text: 'Admission cycle saved (pending verification).' });
      setNonce((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  return (
    <Panel title="Admission cycle">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3" noValidate>
        <label className="text-sm"><span className="label">Class</span>
          <select className="input" {...register('classCode')}>{(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label className="text-sm"><span className="label">Academic year</span><input className="input" {...register('academicYear', { required: true })} /></label>
        <label className="text-sm"><span className="label">Category</span>
          <select className="input" {...register('category')}>{(Object.keys(admissionCategoryLabel) as AdmissionCategory[]).map((c) => <option key={c} value={c}>{admissionCategoryLabel[c]}</option>)}</select></label>
        <label className="text-sm"><span className="label">Applications open</span><input type="date" className="input" {...register('applicationStartDate')} /></label>
        <label className="text-sm"><span className="label">Applications close</span><input type="date" className="input" {...register('applicationEndDate')} /></label>
        <label className="text-sm"><span className="label">Status override</span>
          <select className="input" {...register('statusOverride')}><option value="">Derive from dates</option>
            {(Object.keys(admissionStatusLabel) as AdmissionStatus[]).map((s) => <option key={s} value={s}>{admissionStatusLabel[s]}</option>)}</select></label>
        <label className="text-sm sm:col-span-3"><span className="label">Override reason (from official notice)</span><input className="input" {...register('statusOverrideReason')} /></label>
        <label className="text-sm sm:col-span-3"><span className="label">Age eligibility</span><input className="input" {...register('ageEligibility')} /></label>
        <label className="text-sm sm:col-span-3"><span className="label">Selection criteria</span><textarea rows={2} className="input" {...register('selectionCriteria')} /></label>
        <label className="text-sm"><span className="label">Notification URL</span><input className="input" {...register('officialNotificationUrl')} /></label>
        <label className="text-sm"><span className="label">Application URL</span><input className="input" {...register('applicationUrl')} /></label>
        <label className="text-sm"><span className="label">Source URL *</span><input className="input" {...register('sourceUrl', { required: 'A source is required' })} />{errors.sourceUrl && <span className="field-error">{errors.sourceUrl.message}</span>}</label>
        <div className="sm:col-span-3">
          <p className="label">Documents, eligibility and points</p>
          {reqs.fields.map((f, i) => (
            <div key={f.id} className="mb-2 grid gap-2 sm:grid-cols-[170px_1fr_90px_auto]">
              <select className="input" {...register(`requirements.${i}.type` as const)}>
                <option value="DOCUMENT">Document</option><option value="ELIGIBILITY">Eligibility</option><option value="SELECTION_CRITERION">Selection criterion</option>
              </select>
              <input className="input" placeholder="Description" {...register(`requirements.${i}.description` as const)} />
              <input className="input" type="number" placeholder="Points" {...register(`requirements.${i}.points` as const)} />
              <button type="button" className="btn-secondary px-3" onClick={() => reqs.remove(i)}>×</button>
            </div>
          ))}
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => reqs.append({ type: 'DOCUMENT', description: '', points: '' })}>+ Add requirement</button>
        </div>
        {errors.root && <p className="field-error">{errors.root.message}</p>}
        <div className="flex items-center gap-3 sm:col-span-3"><button className="btn-primary" disabled={isSubmitting}>Save admission cycle</button><Feedback msg={msg} /></div>
      </form>
      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        {(list.data ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2">#{a.id} · {a.className} {a.academicYear} {admissionCategoryLabel[a.category]} <AdmissionStatusBadge status={a.status} overridden={a.statusOverridden} /> <VerificationBadge status={a.verificationStatus} /></li>
        ))}
      </ul>
    </Panel>
  );
}

export function FacilityPanel({ schoolId }: { schoolId: number }) {
  const [nonce, setNonce] = useState(0);
  const list = useApi(() => schoolService.facilities(schoolId), [schoolId, nonce]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<{ category: FacilityCategory; name: string; sourceUrl: string }>({ defaultValues: { category: 'SPORTS' } });
  const submit = handleSubmit(async (v) => {
    try {
      await adminService.addFacility(schoolId, { ...v, available: true });
      setMsg({ ok: true, text: 'Facility added.' });
      reset({ ...v, name: '' });
      setNonce((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  return (
    <Panel title="Facilities">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3" noValidate>
        <select className="input" aria-label="Category" {...register('category')}>
          {(Object.keys(facilityCategoryLabel) as FacilityCategory[]).map((c) => <option key={c} value={c}>{facilityCategoryLabel[c]}</option>)}
        </select>
        <input className="input" placeholder="Facility name" {...register('name', { required: 'Name required' })} />
        <input className="input" placeholder="Source URL" {...register('sourceUrl', { required: 'Source required' })} />
        {(errors.name || errors.sourceUrl) && <p className="field-error sm:col-span-3">{errors.name?.message ?? errors.sourceUrl?.message}</p>}
        <div className="flex items-center gap-3 sm:col-span-3"><button className="btn-primary" disabled={isSubmitting}>Add facility</button><Feedback msg={msg} /></div>
      </form>
      <p className="mt-3 text-xs text-slate-600">{(list.data ?? []).map((f) => `#${f.id} ${f.name}`).join(' · ') || 'None yet.'}</p>
    </Panel>
  );
}

export function ImagePanel({ schoolId }: { schoolId: number }) {
  const [nonce, setNonce] = useState(0);
  const list = useApi(() => adminService.images(schoolId), [schoolId, nonce]);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ImageRequest>({
    defaultValues: { imageType: 'CAMPUS', permissionStatus: 'PENDING', illustrative: false },
  });
  const submit = handleSubmit(async (raw) => {
    const v = blankToNull({ ...raw }) as ImageRequest;
    try {
      if (file) await adminService.uploadImage(schoolId, file, { ...v, url: 'https://upload.pending' });
      else await adminService.registerImage(schoolId, v);
      setMsg({ ok: true, text: v.permissionStatus === 'PENDING' ? 'Image stored; it stays hidden until permission is confirmed.' : 'Image added (pending verification).' });
      setNonce((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  const remove = async (imageId: number) => {
    await adminService.deleteImage(schoolId, imageId);
    setNonce((n) => n + 1);
  };
  return (
    <Panel title="Photos and logo">
      <p className="mb-3 text-xs text-slate-500">
        Only official photos or photos with a clear licence/permission. Editing, cropping or filtering a copyrighted image does not make it usable.
        Upload uses Cloudinary when configured; otherwise register the official image URL.
        <Link className="link ml-1" to={`/admin/images?school=${schoolId}`}>Find, approve and order photos →</Link>
      </p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <select className="input" aria-label="Image type" {...register('imageType')}>
          {(Object.keys(imageTypeLabel) as ImageType[]).map((t) => <option key={t} value={t}>{imageTypeLabel[t]}</option>)}
        </select>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {!file && <input className="input sm:col-span-2" placeholder="Image URL (if not uploading)" {...register('url', { validate: (v) => !!file || !!v || 'Provide a URL or a file' })} />}
        <input className="input" placeholder="Alt text *" {...register('altText', { required: 'Alt text required' })} />
        <input className="input" placeholder="Caption" {...register('caption')} />
        <input className="input" placeholder="Credit (e.g. school name)" {...register('credit')} />
        <input className="input" placeholder="Licence / permission *" {...register('license', { required: 'Licence required' })} />
        <input className="input sm:col-span-2" placeholder="Source page URL *" {...register('sourceUrl', { required: 'Source required' })} />
        <select className="input" aria-label="Permission" {...register('permissionStatus')}>
          {(Object.keys(permissionLabel) as ImagePermission[]).map((p) => <option key={p} value={p}>{permissionLabel[p]}</option>)}
        </select>
        <input className="input" placeholder="Attribution text (required for open licences)" {...register('attributionText')} />
        <input className="input" placeholder="Permission details (who granted it, when)" {...register('permissionNote')} />
        {!file && <input className="input" placeholder="Thumbnail URL (optional)" {...register('thumbnailUrl')} />}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" {...register('illustrative')} /> Generic illustration, not a photograph of this school
        </label>
        {Object.values(errors).length > 0 && <p className="field-error sm:col-span-2">{Object.values(errors).map((e) => e?.message).filter(Boolean).join(' · ')}</p>}
        <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{file ? 'Upload image' : 'Register image'}</button><Feedback msg={msg} /></div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {(list.data ?? []).map((img) => (
          <figure key={img.id} className="relative w-28">
            <img src={img.url} alt={img.altText} className="h-20 w-28 rounded object-cover" />
            <figcaption className="text-[10px] text-slate-500">
              #{img.id} {img.imageType}{img.illustrative ? ' · illustration' : ''}
              <span className={img.permissionStatus === 'PENDING' || img.permissionStatus === 'REVOKED' ? ' block text-red-600' : ' block'}>
                {img.permissionStatus === 'PENDING' || img.permissionStatus === 'REVOKED' ? `${img.permissionStatus.toLowerCase()} · hidden` : img.permissionStatus.toLowerCase().replace('_', ' ')}
              </span>
            </figcaption>
            <button type="button" onClick={() => remove(img.id)} className="absolute right-1 top-1 rounded bg-white/90 px-1 text-xs text-red-600" aria-label="Delete image">✕</button>
          </figure>
        ))}
      </div>
    </Panel>
  );
}

export function EvidencePanel({ schoolId }: { schoolId: number }) {
  const [nonce, setNonce] = useState(0);
  const scores = useApi(() => adminService.criterionScores(schoolId), [schoolId, nonce]);
  const methodology = useApi(() => rankingService.methodology(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CriterionScoreRequest>({
    defaultValues: { academicYear: currentAcademicYear(), maxScore: 100 },
  });
  const submit = handleSubmit(async (v) => {
    try {
      await adminService.upsertCriterionScore(schoolId, { ...v, rawScore: Number(v.rawScore), maxScore: Number(v.maxScore) });
      setMsg({ ok: true, text: 'Evidence saved. Verify it (record type CRITERION_SCORE) for it to count in rankings.' });
      setNonce((n) => n + 1);
    } catch (e) {
      setMsg({ ok: false, text: applyServerErrors(e, setError) });
    }
  });
  return (
    <Panel title="Ranking evidence">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <select className="input" aria-label="Criterion" {...register('criterionCode', { required: true })}>
          {(methodology.data?.criteria ?? []).filter((c) => c.code !== 'PARENT_FEEDBACK').map((c) => <option key={c.code} value={c.code}>{c.name} ({c.weight}%)</option>)}
        </select>
        <input className="input" placeholder="Academic year" {...register('academicYear', { required: true })} />
        <input className="input" type="number" step="0.01" placeholder="Raw score" {...register('rawScore', { required: 'Raw score required' })} />
        <input className="input" type="number" step="0.01" placeholder="Out of (max)" {...register('maxScore', { required: true })} />
        <input className="input sm:col-span-2" placeholder="Evidence notes" {...register('evidenceNotes')} />
        <input className="input sm:col-span-2" placeholder="Evidence source URL *" {...register('sourceUrl', { required: 'Source required' })} />
        {Object.values(errors).length > 0 && <p className="field-error sm:col-span-2">{Object.values(errors).map((e) => e?.message).filter(Boolean).join(' · ')}</p>}
        <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>Save evidence</button><Feedback msg={msg} /></div>
      </form>
      <ul className="mt-4 space-y-1 text-xs text-slate-600">
        {(scores.data ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2">#{s.id} · {s.criterionCode} {s.academicYear}: {s.normalizedScore}/100 <VerificationBadge status={s.verificationStatus} /></li>
        ))}
      </ul>
    </Panel>
  );
}
