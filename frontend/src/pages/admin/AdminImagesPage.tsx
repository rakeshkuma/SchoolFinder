import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { ImageCandidate, ImagePermission, ImageType, SchoolDetail, SchoolImage } from '../../types/api';
import { formatDate, imageTypeLabel, verificationLabel } from '../../utils/format';
import { permissionLabel } from './formUtils';

const PUBLISHABLE: ImagePermission[] = ['PUBLIC_DOMAIN', 'OPEN_LICENCE', 'WRITTEN_PERMISSION', 'PURCHASED_LICENCE', 'OWN_WORK'];

const message = (e: unknown) => (e instanceof ApiError ? [e.message, ...e.fieldErrors.map((f) => f.message)].join(' · ') : 'Something went wrong.');

/** The permission a stored licence most likely supports; the admin still chooses. */
export function permissionForLicence(licence: string | null | undefined): ImagePermission {
  const l = (licence ?? '').toLowerCase();
  if (/public domain|^pd|cc0/.test(l)) return 'PUBLIC_DOMAIN';
  if (/^cc[ -]by|gfdl/.test(l)) return 'OPEN_LICENCE';
  if (/permission/.test(l)) return 'WRITTEN_PERMISSION';
  return 'OPEN_LICENCE';
}

/** Search presets: a school's name with the words that usually find its own photographs. */
export function queryPresets(s: Pick<SchoolDetail, 'name' | 'city' | 'stateName'>): string[] {
  const place = s.city ?? s.stateName;
  return [
    s.name,
    s.city ? `${s.name} ${s.city}` : null,
    s.stateName ? `${s.name} ${s.stateName}` : null,
    `${s.name} campus`,
    `${s.name} building`,
    `${s.name} hostel`,
    place ? `${s.name} ${place} school` : null,
  ].filter((q, i, all): q is string => !!q && all.indexOf(q) === i);
}

function SchoolPicker() {
  const [, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const results = useApi(() => adminService.schools(q, undefined, 0, 8), [q], q.trim().length >= 2);
  return (
    <section className="card p-5">
      <label htmlFor="image-school" className="font-semibold">Choose a school</label>
      <input id="image-school" className="input mt-2" placeholder="Type at least 2 letters of the school's name" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 divide-y text-sm">
        {(q.trim().length >= 2 ? results.data?.content ?? [] : []).map((s) => (
          <li key={s.id}>
            <button type="button" className="w-full px-2 py-2 text-left hover:bg-slate-50" onClick={() => setParams({ school: String(s.id) })}>
              {s.name} <span className="text-slate-500">· {[s.city, s.stateName].filter(Boolean).join(', ')}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImageCard({ school, image, isMain, onChange }: { school: SchoolDetail; image: SchoolImage; isMain: boolean; onChange: (text: string) => void }) {
  const [mode, setMode] = useState<'view' | 'approve' | 'reject' | 'edit'>('view');
  const [permission, setPermission] = useState<ImagePermission>(permissionForLicence(image.license));
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState('');
  const [edit, setEdit] = useState({
    imageType: image.imageType, altText: image.altText, caption: image.caption ?? '', author: image.author ?? '',
    attributionText: image.attributionText ?? '', license: image.license, credit: image.credit ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const published = PUBLISHABLE.includes(image.permissionStatus);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode('view');
      onChange(done);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const nul = (v: string) => (v.trim() === '' ? null : v.trim());

  return (
    <li className="card overflow-hidden">
      <a href={image.url} target="_blank" rel="noopener noreferrer">
        <img src={image.thumbnailUrl ?? image.url} alt={image.altText} loading="lazy" className="h-40 w-full bg-slate-100 object-cover" />
      </a>
      <div className="space-y-1 p-3 text-xs">
        <p className="flex flex-wrap gap-1">
          <span className="chip">{imageTypeLabel[image.imageType]}</span>
          {isMain && <span className="chip">Main photo</span>}
          <span className={`chip ${published ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
            {published ? 'Published' : image.permissionStatus === 'REVOKED' ? 'Rejected · hidden' : 'Pending · hidden'}
          </span>
        </p>
        <p className="text-slate-700">{image.title ?? image.altText}</p>
        <p className="text-slate-600">
          {image.license}{image.author ? ` · ${image.author}` : ''}
        </p>
        {image.attributionText && <p className="text-slate-500">Credit: {image.attributionText}</p>}
        <p className="text-slate-500">
          {verificationLabel[image.verificationStatus]}{image.lastVerifiedDate ? ` ${formatDate(image.lastVerifiedDate)}` : ''}
          {image.width && image.height ? ` · ${image.width}×${image.height}` : ''}
          {image.createdAt ? ` · added ${formatDate(image.createdAt)}` : ''}
        </p>
        {image.permissionNote && <p className="text-slate-500">{image.permissionNote}</p>}
        <a className="link" href={image.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {image.sourceWebsite ?? 'page'} ↗</a>

        {mode === 'view' && (
          <div className="flex flex-wrap gap-1 pt-2">
            {!published && <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={() => setMode('approve')}>Approve</button>}
            {image.permissionStatus !== 'REVOKED' && <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMode('reject')}>Reject</button>}
            <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMode('edit')}>Edit</button>
            {!isMain && published && (
              <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={busy}
                onClick={() => act(() => adminService.makePrimaryImage(school.id, image.id), 'Main photo changed.')}>Set as main photo</button>
            )}
            {image.sourceWebsite === 'commons.wikimedia.org' && (
              <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={busy}
                onClick={() => act(() => adminService.refreshImage(school.id, image.id), 'Re-read from Wikimedia Commons.')}>Refresh from Commons</button>
            )}
            <button type="button" className="px-2 py-1 text-xs text-red-700 hover:underline" disabled={busy}
              onClick={() => window.confirm('Delete this image record?') && act(() => adminService.deleteImage(school.id, image.id), 'Image deleted.')}>Delete</button>
          </div>
        )}

        {mode === 'approve' && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-2">
            <select className="input text-xs" aria-label="Publish under" value={permission} onChange={(e) => setPermission(e.target.value as ImagePermission)}>
              {PUBLISHABLE.map((p) => <option key={p} value={p}>{permissionLabel[p]}</option>)}
            </select>
            {permission === 'WRITTEN_PERMISSION' && (
              <input className="input text-xs" placeholder="Who granted permission, and when" value={note} onChange={(e) => setNote(e.target.value)} />
            )}
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>I opened the source page: this photo shows <strong>{school.name}</strong> (this branch, not a namesake), and its licence is the one shown above.</span>
            </label>
            <div className="flex gap-1">
              <button type="button" className="btn-primary px-2 py-1 text-xs" disabled={!checked || busy}
                onClick={() => act(() => adminService.approveImage(school.id, image.id, permission, nul(note) ?? undefined), 'Image approved and published.')}>Publish</button>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMode('view')}>Cancel</button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-2">
            <input className="input text-xs" placeholder="Reason, e.g. shows a different branch" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-1">
              <button type="button" className="btn-primary px-2 py-1 text-xs" disabled={!note.trim() || busy}
                onClick={() => act(() => adminService.rejectImage(school.id, image.id, note.trim()), 'Image rejected and hidden.')}>Reject</button>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMode('view')}>Cancel</button>
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-2">
            <select className="input text-xs" aria-label="Category" value={edit.imageType} onChange={(e) => setEdit({ ...edit, imageType: e.target.value as ImageType })}>
              {(Object.keys(imageTypeLabel) as ImageType[]).map((t) => <option key={t} value={t}>{imageTypeLabel[t]}</option>)}
            </select>
            <input className="input text-xs" aria-label="Alt text" placeholder="Alt text *" value={edit.altText} onChange={(e) => setEdit({ ...edit, altText: e.target.value })} />
            <input className="input text-xs" aria-label="Caption" placeholder="Caption" value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} />
            <input className="input text-xs" aria-label="Author" placeholder="Author / photographer" value={edit.author} onChange={(e) => setEdit({ ...edit, author: e.target.value })} />
            <input className="input text-xs" aria-label="Licence" placeholder="Licence *" value={edit.license} onChange={(e) => setEdit({ ...edit, license: e.target.value })} />
            <input className="input text-xs" aria-label="Attribution" placeholder="Attribution text" value={edit.attributionText} onChange={(e) => setEdit({ ...edit, attributionText: e.target.value })} />
            {published && <p className="text-amber-800">Changing the licence takes the image down until it is approved again.</p>}
            <div className="flex gap-1">
              <button type="button" className="btn-primary px-2 py-1 text-xs" disabled={busy}
                onClick={() => act(() => adminService.updateImage(school.id, image.id, {
                  imageType: edit.imageType, altText: edit.altText.trim(), caption: nul(edit.caption), author: nul(edit.author),
                  title: image.title, credit: nul(edit.credit), license: edit.license.trim(), attributionText: nul(edit.attributionText),
                  permissionStatus: image.permissionStatus, permissionNote: image.permissionNote,
                }), 'Details saved.')}>Save</button>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setMode('view')}>Cancel</button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
    </li>
  );
}

function CandidateCard({ school, candidate, onAdded }: { school: SchoolDetail; candidate: ImageCandidate; onAdded: (text: string) => void }) {
  const [type, setType] = useState<ImageType>('CAMPUS');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(candidate.alreadyAdded);
  const usable = candidate.suggestedPermission !== null;

  const add = async () => {
    setError(null);
    try {
      await adminService.registerImage(school.id, {
        imageType: type,
        url: candidate.imageUrl,
        thumbnailUrl: candidate.thumbnailUrl,
        altText: `${imageTypeLabel[type]} of ${school.name}`,
        caption: null,
        credit: candidate.author,
        license: candidate.licence ?? 'Unknown',
        attributionText: candidate.attributionText,
        permissionStatus: 'PENDING',
        sourceUrl: candidate.pageUrl ?? candidate.imageUrl,
        author: candidate.author,
        title: candidate.title,
        width: candidate.width,
        height: candidate.height,
        sortOrder: 99,
      });
      setAdded(true);
      onAdded(`Added "${candidate.title}" as pending. Check it, then approve it above.`);
    } catch (e) {
      setError(message(e));
    }
  };

  return (
    <li className="card overflow-hidden">
      <img src={candidate.thumbnailUrl ?? candidate.imageUrl} alt={candidate.description ?? candidate.title} loading="lazy" className="h-36 w-full bg-slate-100 object-cover" />
      <div className="space-y-1 p-3 text-xs">
        <p className="font-medium text-slate-800">{candidate.title.replace(/^File:/, '')}</p>
        <p className="text-slate-500">{candidate.source}{candidate.width && candidate.height ? ` · ${candidate.width}×${candidate.height}` : ''}</p>
        <p className={usable ? 'text-slate-700' : 'font-medium text-red-700'}>
          {candidate.licence ?? 'No licence stated'}{usable ? '' : ' · cannot be used here'}
        </p>
        {candidate.author && <p className="text-slate-600">By {candidate.author}</p>}
        {candidate.description && <p className="line-clamp-3 text-slate-500">{candidate.description}</p>}
        {candidate.pageUrl && <a className="link" href={candidate.pageUrl} target="_blank" rel="noopener noreferrer">Open source page ↗</a>}
        {usable && !added && (
          <div className="flex gap-1 pt-2">
            <select className="input py-1 text-xs" aria-label="Category" value={type} onChange={(e) => setType(e.target.value as ImageType)}>
              {(Object.keys(imageTypeLabel) as ImageType[]).filter((t) => t !== 'LOGO').map((t) => <option key={t} value={t}>{imageTypeLabel[t]}</option>)}
            </select>
            <button type="button" className="btn-primary shrink-0 px-2 py-1 text-xs" onClick={add}>Add as pending</button>
          </div>
        )}
        {added && <p className="pt-2 text-emerald-700">Added</p>}
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
    </li>
  );
}

function SchoolImages({ schoolId }: { schoolId: number }) {
  const [, setParams] = useSearchParams();
  const [nonce, setNonce] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const school = useApi(() => adminService.school(schoolId), [schoolId]);
  const images = useApi(() => adminService.images(schoolId), [schoolId, nonce]);
  const [query, setQuery] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const candidates = useApi(() => adminService.imageCandidates(schoolId, query ?? undefined), [schoolId, query], query !== null);
  const changed = (text: string) => {
    setStatus(text);
    setNonce((n) => n + 1);
  };
  const s = school.data;
  if (!s) return <p className="text-sm text-slate-500">{school.error ? school.error.message : 'Loading…'}</p>;
  const presets = queryPresets(s);
  const googleQuery = draft.trim() || presets[1] || presets[0];
  const list = images.data ?? [];
  // Cards show the first published photograph, then the first published illustration.
  const shown = list.filter((i) => PUBLISHABLE.includes(i.permissionStatus));
  const mainId = (shown.find((i) => !i.illustrative) ?? shown[0])?.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{s.name}</h1>
          <p className="text-sm text-slate-500">{[s.city, s.stateName].filter(Boolean).join(', ')} · <Link className="link" to={`/admin/schools/${s.id}`}>Edit school</Link> · <Link className="link" to={`/schools/${s.slug}`}>Public page</Link></p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => setParams({})}>Choose another school</button>
      </header>
      {status && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{status}</p>}

      <section>
        <h2 className="mb-2 font-semibold">Images on file ({list.length})</h2>
        <p className="mb-3 text-xs text-slate-500">Only published images appear on the site. The main photo is used on cards and at the top of the gallery.</p>
        {list.length === 0 ? <p className="text-sm text-slate-500">No images yet.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((img) => <ImageCard key={`${img.id}-${img.permissionStatus}-${img.sortOrder}`} school={s} image={img} isMain={img.id === mainId} onChange={changed} />)}
          </ul>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Find photographs</h2>
        <p className="text-xs text-slate-600">
          Searches Wikimedia Commons and the lead images of Wikipedia articles, which state a licence for every file. Nothing is saved until you add a
          result, and added images stay hidden until you approve them. Many results show other schools with similar names: open the source page and check
          the place before adding.
        </p>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button key={p} type="button" className={`chip ${query === p ? 'ring-2 ring-brand-500' : ''}`} onClick={() => { setDraft(p); setQuery(p); }}>{p}</button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setQuery(draft.trim()); }}>
          <input className="input" aria-label="Search words" placeholder="Search words" maxLength={200} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="btn-primary shrink-0">Search</button>
        </form>
        <p className="text-xs text-slate-600">
          Not on Commons?{' '}
          <a className="link" href={`https://www.google.com/search?tbm=isch&tbs=sur:fmc&q=${encodeURIComponent(googleQuery)}`} target="_blank" rel="noopener noreferrer">
            Search Google Images by hand ↗
          </a>{' '}
          Google's licence filter is only a hint and Google is not the source. Open the page that published the photo, confirm its licence or ask the
          school for written permission, then add it on the <Link className="link" to={`/admin/schools/${s.id}`}>school editor</Link> as pending.
        </p>
        {query !== null && (
          candidates.loading ? <p className="text-sm text-slate-500">Searching…</p>
            : candidates.error ? <p role="alert" className="field-error">{candidates.error.message}</p>
              : (candidates.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No files found for "{query}".</p>
                : (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(candidates.data ?? []).map((c) => <CandidateCard key={c.title} school={s} candidate={c} onAdded={changed} />)}
                  </ul>
                )
        )}
      </section>
    </div>
  );
}

/** Finding, checking and publishing school photographs. */
export function AdminImagesPage() {
  useDocumentTitle('Images · Admin');
  const [params] = useSearchParams();
  const id = Number(params.get('school'));
  return Number.isInteger(id) && id > 0 ? <SchoolImages schoolId={id} /> : (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">School images</h1>
      <p className="text-sm text-slate-600">Find licensed photographs, check them and publish them. Nothing is shown on the site until an editor approves it.</p>
      <SchoolPicker />
    </div>
  );
}
