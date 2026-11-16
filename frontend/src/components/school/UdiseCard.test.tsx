import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { SchoolDetail } from '../../types/api';
import { UDISE_SEARCH_URL, UdiseCard, udiseLink } from './UdiseCard';

const LINK = 'https://kys.udiseplus.gov.in/#/schooldetail/2823379086/11';
const base = { udiseCode: null, udiseProfileUrl: null, udiseVerifiedOn: null, udiseMatchStatus: null };

describe('UDISE+ link', () => {
  it('opens the school’s own page only for an editor-checked, safe portal link', () => {
    expect(udiseLink({ ...base, udiseCode: '28233790861', udiseProfileUrl: LINK, udiseMatchStatus: 'VERIFIED_MATCH', udiseVerifiedOn: '2026-11-14' }))
      .toEqual({ kind: 'direct', url: LINK, code: '28233790861', checkedOn: '2026-11-14' });
  });

  it('falls back to the portal search when there is no checked link', () => {
    expect(udiseLink({ ...base, udiseCode: '28233790861' })).toEqual({ kind: 'search', url: UDISE_SEARCH_URL, code: '28233790861' });
    expect(udiseLink(base)).toEqual({ kind: 'search', url: UDISE_SEARCH_URL, code: null });
    // A link waiting for review is not used.
    expect(udiseLink({ ...base, udiseProfileUrl: LINK, udiseMatchStatus: 'PENDING_REVIEW' }).kind).toBe('search');
  });

  it('never builds a link from a code and refuses unsafe or malformed values', () => {
    for (const url of ['http://kys.udiseplus.gov.in/#/schooldetail/1/1', 'https://evil.example.com/#/schooldetail/1/1', 'javascript:alert(1)',
      'https://kys.udiseplus.gov.in.evil.com/#/schooldetail/1/1', 'https://kys.udiseplus.gov.in/#/schooldetail/1/1?x=https://evil.example.com']) {
      expect(udiseLink({ ...base, udiseProfileUrl: url, udiseMatchStatus: 'VERIFIED_MATCH' })).toEqual({ kind: 'search', url: UDISE_SEARCH_URL, code: null });
    }
    expect(udiseLink({ ...base, udiseCode: '1234' }).code).toBeNull();
    expect(udiseLink({ ...base, udiseCode: '28233790861' }).url).toBe(UDISE_SEARCH_URL);
  });
});

describe('UdiseCard', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());
  const school = (over: Partial<SchoolDetail>) => ({
    name: 'Dashmesh Public School', city: 'Delhi', district: { name: 'East Delhi', slug: 'east-delhi' }, stateName: 'Delhi', ...base, ...over,
  }) as unknown as SchoolDetail;

  it('shows the checked link in a new tab with the code and date', () => {
    view = render(<UdiseCard school={school({ udiseCode: '07040123456', udiseProfileUrl: LINK, udiseMatchStatus: 'VERIFIED_MATCH', udiseVerifiedOn: '2026-11-14' })} />);
    const a = view.container.querySelector('a')!;
    expect(a.textContent).toContain('View Official UDISE+ Details');
    expect(a.getAttribute('href')).toBe(LINK);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(view.container.textContent).toContain('07040123456');
    expect(view.container.textContent).toContain('Link checked on');
    expect(view.container.textContent).not.toMatch(/government verified/i);
  });

  it('offers the portal search with the school’s name and place when nothing is known', () => {
    view = render(<UdiseCard school={school({})} />);
    const a = view.container.querySelector('a')!;
    expect(a.textContent).toContain('Find This School on UDISE+');
    expect(a.getAttribute('href')).toBe(UDISE_SEARCH_URL);
    expect(view.container.textContent).toContain('Dashmesh Public School in Delhi, Delhi');
    expect([...view.container.querySelectorAll('button')].some((b) => b.getAttribute('aria-label')?.startsWith('Copy'))).toBe(false);
  });

  it('keeps the board affiliation number apart from the UDISE+ code and never claims verification', () => {
    view = render(<UdiseCard school={school({ affiliationNumber: '3420006', board: { code: 'CBSE', name: 'Central Board of Secondary Education', websiteUrl: null, description: null },
      websiteUrl: 'https://www.netarhatvidyalaya.com/' })} boardRecord={'Listed by CBSE as "NETARHAT AWASIYA VIDYALAYA" (affiliation no. 3420006).'} />);
    const text = view.container.textContent ?? '';
    expect(view.container.querySelector('h2')?.textContent).toBe('Official School Information & UDISE+');
    expect(text).toContain('CBSE affiliation no.3420006');
    expect(text).toContain('UDISE+ codeNot recorded here yet');
    expect(text).toContain('As listed by the board');
    expect(text).toContain('netarhatvidyalaya.com');
    expect(text).toContain('it is different from a board affiliation number');
    expect(text).not.toMatch(/government verified|fully verified|government approved/i);
    // The UDISE+ button stays the card's first link, opening the portal's search in a new tab.
    const a = view.container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe(UDISE_SEARCH_URL);
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('offers to copy a known code when there is no checked link', () => {
    view = render(<UdiseCard school={school({ udiseCode: '07040123456' })} />);
    expect([...view.container.querySelectorAll('button')].some((b) => b.getAttribute('aria-label') === 'Copy UDISE+ code 07040123456')).toBe(true);
    expect(view.container.textContent).toContain('Search by UDISE code');
  });
});
