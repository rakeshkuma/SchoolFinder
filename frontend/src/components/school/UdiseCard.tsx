import { useState } from 'react';
import { Icon } from '../common/Icon';
import type { SchoolDetail } from '../../types/api';
import { formatDate } from '../../utils/format';

/** The Government of India's Know Your School portal (UDISE+). */
export const UDISE_SEARCH_URL = 'https://kys.udiseplus.gov.in/';
/** Only an https school-detail page on the official portal, as the portal's own search links to it. */
const PROFILE_URL = /^https:\/\/kys\.udiseplus\.gov\.in\/#\/schooldetail1?\/[0-9]{1,20}\/[0-9]{1,4}$/;
const CODE = /^[0-9]{11}$/;

export type UdiseLink =
  | { kind: 'direct'; url: string; code: string | null; checkedOn: string | null }
  | { kind: 'search'; url: string; code: string | null };

/**
 * Where the UDISE+ button goes: the school's own Know Your School page only when an editor checked that link (and it is a
 * safe portal address); otherwise the portal's search. A link is never built from a code.
 */
export function udiseLink(s: Pick<SchoolDetail, 'udiseCode' | 'udiseProfileUrl' | 'udiseVerifiedOn' | 'udiseMatchStatus'>): UdiseLink {
  const code = s.udiseCode && CODE.test(s.udiseCode) ? s.udiseCode : null;
  if (s.udiseProfileUrl && PROFILE_URL.test(s.udiseProfileUrl) && s.udiseMatchStatus === 'VERIFIED_MATCH') {
    return { kind: 'direct', url: s.udiseProfileUrl, code, checkedOn: s.udiseVerifiedOn ?? null };
  }
  return { kind: 'search', url: UDISE_SEARCH_URL, code };
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the code stays visible to copy by hand */
    }
  };
  return (
    <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
      aria-label={`Copy UDISE+ code ${code}`}>
      <Icon name={copied ? 'check' : 'file'} className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy code'}
    </button>
  );
}

/**
 * "Official UDISE+ School Information": a link to the school on the government's Know Your School portal. Nothing is
 * fetched from the portal; the profile works the same when the portal is down.
 */
export function UdiseCard({ school: s }: { school: SchoolDetail }) {
  const link = udiseLink(s);
  const where = [s.city ?? s.district?.name, s.stateName].filter(Boolean).join(', ');
  return (
    <section className="card p-5" aria-labelledby="udise-h">
      <h2 id="udise-h" className="font-semibold text-ink">Official UDISE+ School Information</h2>
      <p className="mt-1 text-sm text-slate-600">
        View available information about this school on the Government of India’s Know Your School portal.
      </p>
      {link.code && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">UDISE+ code</span>
          <span className="font-mono font-semibold tracking-wide text-ink">{link.code}</span>
          <CopyCode code={link.code} />
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className={link.kind === 'direct' ? 'btn-primary' : 'btn-secondary'}>
          {link.kind === 'direct' ? 'View Official UDISE+ Details' : 'Find This School on UDISE+'}
          <Icon name="external" className="h-4 w-4" />
          <span className="sr-only"> (government website, opens in a new tab)</span>
        </a>
        <span className="text-xs text-slate-500">kys.udiseplus.gov.in · government website</span>
      </div>
      {link.kind === 'direct' ? (
        link.checkedOn && <p className="mt-3 text-xs text-slate-500">Link checked on {formatDate(link.checkedOn)}.</p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {link.code
            ? <>On the portal, choose “Search by UDISE code” and paste the code above.</>
            : <>On the portal, search for <span className="font-medium text-slate-700">{s.name}</span>{where ? <> in {where}</> : null} by state, district and school name.</>}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">SchoolDhundo is independent and is not endorsed by the Ministry of Education.</p>
    </section>
  );
}
