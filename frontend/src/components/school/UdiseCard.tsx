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

/** How the board's own number is called, so a CBSE affiliation number is never mistaken for a UDISE+ code. */
function affiliationLabel(board: SchoolDetail['board']): string {
  if (board?.code === 'CBSE') return 'CBSE affiliation no.';
  if (board?.code === 'CISCE') return 'CISCE school code';
  return board ? `${board.code === 'STATE' ? 'Board' : board.code} affiliation no.` : 'Affiliation no.';
}

/**
 * "Official School Information & UDISE+": the government's Know Your School portal, the school's board record and its
 * own website, in one place. Nothing is fetched from the portal (the profile works the same when it is down), and the
 * card never calls a school "verified": the button only opens the portal, and finding the school there is up to the
 * visitor unless an editor has checked a direct link. `boardRecord` is the board-list text kept as the description.
 */
export function UdiseCard({ school: s, boardRecord }: { school: SchoolDetail; boardRecord?: string | null }) {
  const link = udiseLink(s);
  const where = [s.city ?? s.district?.name, s.stateName].filter(Boolean).join(', ');
  return (
    <section className="card overflow-hidden" aria-labelledby="udise-h">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-royal-50/70 to-white px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white" aria-hidden>
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="udise-h" className="font-display text-lg font-bold text-navy">Official School Information &amp; UDISE+</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            UDISE+ is the Ministry of Education’s school register. Its Know Your School portal shows the details a school
            reports to the government, such as its management, classes, teachers and facilities.
          </p>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="btn-primary bg-navy hover:bg-navy-800 active:bg-navy-900">
            {link.kind === 'direct' ? 'View Official UDISE+ Details' : 'Find This School on UDISE+'}
            <Icon name="external" className="h-4 w-4" />
            <span className="sr-only"> (government website, opens in a new tab)</span>
          </a>
          <span className="text-xs text-slate-500">kys.udiseplus.gov.in · Government of India</span>
        </div>
        {link.kind === 'direct' ? (
          link.checkedOn && <p className="text-xs text-slate-500">Link checked on {formatDate(link.checkedOn)}: it opens this school’s own page on the portal.</p>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
            <span className="font-semibold text-slate-700">The portal opens on its search page.</span>{' '}
            {link.code
              ? <>Choose “Search by UDISE code” and paste the code below.</>
              : <>Search for <span className="font-medium text-slate-700">{s.name}</span>{where ? <> in {where}</> : null} by state, district and school name.</>}
          </p>
        )}
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">UDISE+ code</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2">
              {link.code
                ? <><span className="font-mono font-semibold tracking-wide text-ink">{link.code}</span><CopyCode code={link.code} /></>
                : <span className="text-slate-500">Not recorded here yet</span>}
            </dd>
          </div>
          {s.affiliationNumber && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{affiliationLabel(s.board)}</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold tracking-wide text-ink">{s.affiliationNumber}</span>
                {s.board?.code === 'CBSE' && (
                  <a className="link text-xs" href="https://saras.cbse.gov.in/saras/AffiliatedList/ListOfSchdirReport" target="_blank" rel="noopener noreferrer">
                    Check on CBSE SARAS ↗
                  </a>
                )}
              </dd>
            </div>
          )}
          {s.websiteUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Official school website</dt>
              <dd className="mt-0.5"><a className="link break-all" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">{s.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗</a></dd>
            </div>
          )}
        </dl>
        {boardRecord && (
          <div className="rounded-xl border border-slate-100 px-3.5 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">As listed by the board</p>
            <p className="mt-1 break-words text-sm leading-relaxed text-slate-700">{boardRecord}</p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          A UDISE+ code is the school’s government register number; it is different from a board affiliation number.
          SchoolDhundo is independent and is not endorsed by the Ministry of Education.
        </p>
      </div>
    </section>
  );
}
