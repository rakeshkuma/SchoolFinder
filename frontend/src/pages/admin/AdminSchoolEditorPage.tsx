import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VerificationBadge } from '../../components/common/Badges';
import { ErrorState, Spinner } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { locationService, referenceService } from '../../services/publicApi';
import type { GenderType, SchoolDetail, SchoolManagement, SchoolNetwork, SchoolRequest, SchoolType } from '../../types/api';
import { genderLabel, managementLabel, networkLabel, schoolTypeLabel } from '../../utils/format';
import { AdmissionPanel, EvidencePanel, FacilityPanel, FeePanel, ImagePanel, StatusPanel, VerifyPanel } from './AdminSchoolPanels';
import { applyServerErrors, optionalNumber } from './formUtils';

type TriState = '' | 'true' | 'false';
interface ProfileForm extends Omit<SchoolRequest, 'hasTransport' | 'hasHostel' | 'boardCode' | 'genderType' | 'management' | 'network'> {
  boardCode: string;
  genderType: GenderType | '';
  management: SchoolManagement | '';
  network: SchoolNetwork | '';
  hasTransport: TriState;
  hasHostel: TriState;
}

const triToBool = (v: TriState) => (v === '' ? null : v === 'true');
const boolToTri = (v: boolean | null): TriState => (v === null ? '' : v ? 'true' : 'false');

function toForm(s: SchoolDetail): ProfileForm {
  return {
    name: s.name, description: s.description, schoolType: s.schoolType, boardCode: s.board?.code ?? '',
    management: s.management ?? '', network: s.network ?? '', affiliationNumber: s.affiliationNumber, udiseCode: s.udiseCode,
    principalName: s.principalName, managingBody: s.managingBody,
    genderType: s.genderType ?? '', mediumOfInstruction: s.mediumOfInstruction, classCodes: s.classesOffered.map((c) => c.code),
    websiteUrl: s.websiteUrl, admissionPortalUrl: s.admissionPortalUrl, phone: s.phone, email: s.email,
    addressLine: s.addressLine, locality: s.locality, city: s.city, district: s.district?.name ?? null, stateCode: s.stateCode,
    pinCode: s.pinCode, latitude: s.latitude, longitude: s.longitude,
    studentTeacherRatio: s.studentTeacherRatio, schoolTimings: s.schoolTimings, establishedYear: s.establishedYear,
    hasTransport: boolToTri(s.hasTransport), hasHostel: boolToTri(s.hasHostel), accessibilityFeatures: s.accessibilityFeatures,
    logoUrl: s.logoUrl, sourceUrl: s.sourceUrl, sourceRetrievedDate: s.sourceRetrievedDate,
  };
}

function toRequest(f: ProfileForm): SchoolRequest {
  const text = (v: string | null | undefined) => (v === undefined || v === null || v.trim() === '' ? null : v.trim());
  return {
    ...f,
    description: text(f.description), mediumOfInstruction: text(f.mediumOfInstruction), websiteUrl: text(f.websiteUrl),
    admissionPortalUrl: text(f.admissionPortalUrl), phone: text(f.phone), email: text(f.email), addressLine: text(f.addressLine),
    locality: text(f.locality), pinCode: text(f.pinCode), schoolTimings: text(f.schoolTimings),
    accessibilityFeatures: text(f.accessibilityFeatures), logoUrl: text(f.logoUrl), sourceRetrievedDate: text(f.sourceRetrievedDate),
    boardCode: text(f.boardCode), genderType: f.genderType === '' ? null : f.genderType,
    management: f.management === '' ? null : f.management, network: f.network === '' ? null : f.network,
    affiliationNumber: text(f.affiliationNumber), udiseCode: text(f.udiseCode), city: text(f.city), district: text(f.district),
    principalName: text(f.principalName), managingBody: text(f.managingBody),
    hasTransport: triToBool(f.hasTransport), hasHostel: triToBool(f.hasHostel), classCodes: f.classCodes ?? [],
  };
}

export function AdminSchoolEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const schoolId = isNew ? null : Number(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const boards = useApi(() => referenceService.boards(), []);
  const classes = useApi(() => referenceService.classes(), []);
  const states = useApi(() => locationService.states(), []);
  useDocumentTitle(isNew ? 'Admin · New school' : `Admin · ${school?.name ?? 'School'}`);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    defaultValues: {
      schoolType: 'PRIVATE', classCodes: [], hasTransport: '', hasHostel: '', boardCode: '', genderType: '',
      management: '', network: '', stateCode: '',
    },
  });

  useEffect(() => {
    if (schoolId === null) return;
    adminService.school(schoolId).then((s) => { setSchool(s); reset(toForm(s)); }).catch((e) => setLoadError(e as ApiError));
  }, [schoolId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      if (isNew) {
        const created = await adminService.createSchool(toRequest(values));
        navigate(`/admin/schools/${created.id}`, { replace: true });
      } else if (school) {
        const updated = await adminService.updateSchool(school.id, toRequest(values), school.version);
        setSchool(updated);
        reset(toForm(updated));
        setMessage({ ok: true, text: 'Saved. The profile is now pending re-verification.' });
      }
    } catch (e) {
      setMessage({ ok: false, text: applyServerErrors(e, setError) });
    }
  });

  if (loadError) return <ErrorState error={loadError} />;
  if (!isNew && !school) return <Spinner />;

  const err = (field: keyof ProfileForm) => errors[field]?.message && <p className="field-error">{String(errors[field]?.message)}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/admin/schools" className="text-sm text-slate-500 hover:text-slate-800">← Schools</Link>
          <h1 className="text-2xl font-bold">{isNew ? 'Add school' : school?.name}</h1>
        </div>
        {school && (
          <div className="flex items-center gap-2">
            <VerificationBadge status={school.verificationStatus} date={school.lastVerifiedDate} />
            {!school.active && <span className="chip bg-red-50 text-red-700">Inactive</span>}
            {school.active && <Link to={`/schools/${school.slug}`} className="btn-secondary py-1.5 text-xs">View public page</Link>}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="card space-y-6 p-6" noValidate>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Enter only facts published by an official source and cite that source. Leave a field empty when the information is not published.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="name">School name *</label>
            <input id="name" className="input" {...register('name', { required: 'Name is required', maxLength: 200 })} />{err('name')}
          </div>
          <div>
            <label className="label" htmlFor="schoolType">School type *</label>
            <select id="schoolType" className="input" {...register('schoolType', { required: true })}>
              {(Object.keys(schoolTypeLabel) as SchoolType[]).map((t) => <option key={t} value={t}>{schoolTypeLabel[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="management">Management (UDISE+ category)</label>
            <select id="management" className="input" {...register('management')}>
              <option value="">Not published</option>
              {(Object.keys(managementLabel) as SchoolManagement[]).map((m) => <option key={m} value={m}>{managementLabel[m]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="network">School system</label>
            <select id="network" className="input" {...register('network')}>
              <option value="">None / not stated</option>
              {(Object.keys(networkLabel) as SchoolNetwork[]).map((n) => <option key={n} value={n}>{networkLabel[n]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="boardCode">Education board</label>
            <select id="boardCode" className="input" {...register('boardCode')}>
              <option value="">Not published</option>
              {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
            </select>{err('boardCode')}
          </div>
          <div>
            <label className="label" htmlFor="affiliationNumber">Board affiliation no.</label>
            <input id="affiliationNumber" className="input" {...register('affiliationNumber')} />{err('affiliationNumber')}
          </div>
          <div>
            <label className="label" htmlFor="principalName">Principal / head (as published)</label>
            <input id="principalName" className="input" {...register('principalName')} />{err('principalName')}
          </div>
          <div>
            <label className="label" htmlFor="managingBody">Managing trust / society</label>
            <input id="managingBody" className="input" {...register('managingBody')} />{err('managingBody')}
          </div>
          <div>
            <label className="label" htmlFor="udiseCode">UDISE+ code (11 digits)</label>
            <input id="udiseCode" className="input" inputMode="numeric" maxLength={11}
              {...register('udiseCode', { pattern: { value: /^\d{11}$/, message: 'Must be exactly 11 digits' } })} />{err('udiseCode')}
          </div>
          <div>
            <label className="label" htmlFor="genderType">Co-education</label>
            <select id="genderType" className="input" {...register('genderType')}>
              <option value="">Not published</option>
              {(Object.keys(genderLabel) as GenderType[]).map((g) => <option key={g} value={g}>{genderLabel[g]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="medium">Medium of instruction</label>
            <input id="medium" className="input" {...register('mediumOfInstruction')} />
          </div>
          <fieldset className="md:col-span-2">
            <legend className="label">Classes offered</legend>
            <div className="flex flex-wrap gap-3">
              {(classes.data ?? []).map((c) => (
                <label key={c.code} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" value={c.code} {...register('classCodes')} /> {c.name}
                </label>
              ))}
            </div>{err('classCodes')}
          </fieldset>
          <div className="md:col-span-2">
            <label className="label" htmlFor="description">Description (neutral, factual)</label>
            <textarea id="description" rows={3} className="input" {...register('description')} />
          </div>
        </div>

        <h2 className="font-semibold">Location & contact</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label" htmlFor="addressLine">Address</label><input id="addressLine" className="input" {...register('addressLine')} /></div>
          <div>
            <label className="label" htmlFor="stateCode">State / UT *</label>
            <select id="stateCode" className="input" {...register('stateCode', { required: 'State or union territory is required' })}>
              <option value="">Choose…</option>
              {(states.data ?? []).map((st) => <option key={st.code} value={st.code}>{st.name}</option>)}
            </select>{err('stateCode')}
          </div>
          <div>
            <label className="label" htmlFor="district">District</label>
            <input id="district" className="input" placeholder="As named by the state / UDISE+" {...register('district')} />{err('district')}
            <p className="mt-1 text-xs text-slate-500">A district typed for the first time is created (and audited) — check the spelling.</p>
          </div>
          <div><label className="label" htmlFor="city">City / town</label><input id="city" className="input" {...register('city')} />{err('city')}</div>
          <div><label className="label" htmlFor="locality">Locality</label><input id="locality" className="input" {...register('locality')} /></div>
          <div><label className="label" htmlFor="pinCode">PIN code</label><input id="pinCode" className="input" inputMode="numeric" {...register('pinCode')} />{err('pinCode')}</div>
          <div><label className="label" htmlFor="latitude">Latitude</label><input id="latitude" className="input" type="number" step="any" {...register('latitude', optionalNumber)} />{err('latitude')}</div>
          <div><label className="label" htmlFor="longitude">Longitude</label><input id="longitude" className="input" type="number" step="any" {...register('longitude', optionalNumber)} />{err('longitude')}</div>
          <div><label className="label" htmlFor="phone">Public phone</label><input id="phone" className="input" {...register('phone')} />{err('phone')}</div>
          <div><label className="label" htmlFor="email">Public email</label><input id="email" type="email" className="input" {...register('email')} />{err('email')}</div>
          <div><label className="label" htmlFor="websiteUrl">Official website</label><input id="websiteUrl" className="input" {...register('websiteUrl')} />{err('websiteUrl')}</div>
          <div><label className="label" htmlFor="admissionPortalUrl">Admission portal</label><input id="admissionPortalUrl" className="input" {...register('admissionPortalUrl')} />{err('admissionPortalUrl')}</div>
        </div>

        <h2 className="font-semibold">Operations</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="label" htmlFor="schoolTimings">Timings</label><input id="schoolTimings" className="input" {...register('schoolTimings')} /></div>
          <div><label className="label" htmlFor="establishedYear">Established</label><input id="establishedYear" type="number" className="input" {...register('establishedYear', optionalNumber)} />{err('establishedYear')}</div>
          <div><label className="label" htmlFor="ratio">Student–teacher ratio (students per teacher)</label><input id="ratio" type="number" step="0.1" className="input" {...register('studentTeacherRatio', optionalNumber)} />{err('studentTeacherRatio')}</div>
          <div><label className="label" htmlFor="hasTransport">Transport</label>
            <select id="hasTransport" className="input" {...register('hasTransport')}><option value="">Not published</option><option value="true">Yes</option><option value="false">No</option></select></div>
          <div><label className="label" htmlFor="hasHostel">Hostel</label>
            <select id="hasHostel" className="input" {...register('hasHostel')}><option value="">Not published</option><option value="true">Yes</option><option value="false">No</option></select></div>
          <div><label className="label" htmlFor="logoUrl">Logo URL</label><input id="logoUrl" className="input" {...register('logoUrl')} />{err('logoUrl')}</div>
          <div className="md:col-span-3"><label className="label" htmlFor="accessibility">Accessibility features</label><input id="accessibility" className="input" {...register('accessibilityFeatures')} /></div>
        </div>

        <h2 className="font-semibold">Source</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div><label className="label" htmlFor="sourceUrl">Source URL *</label>
            <input id="sourceUrl" className="input" placeholder="https://…" {...register('sourceUrl', { required: 'A source URL is required' })} />{err('sourceUrl')}</div>
          <div><label className="label" htmlFor="retrieved">Retrieved on</label><input id="retrieved" type="date" className="input" {...register('sourceRetrievedDate')} /></div>
        </div>

        {message && <p role="status" className={message.ok ? 'text-sm text-emerald-700' : 'field-error'}>{message.text}</p>}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isNew ? 'Create school' : 'Save profile'}</button>
      </form>

      {school && (
        <div className="grid gap-6 xl:grid-cols-2">
          <VerifyPanel school={school} onChange={() => adminService.school(school.id).then((s) => { setSchool(s); reset(toForm(s)); })} />
          {isAdmin && <StatusPanel school={school} onChange={setSchool} />}
          <FeePanel schoolId={school.id} />
          <AdmissionPanel schoolId={school.id} />
          <FacilityPanel schoolId={school.id} />
          <ImagePanel schoolId={school.id} />
          <EvidencePanel schoolId={school.id} />
        </div>
      )}
    </div>
  );
}
