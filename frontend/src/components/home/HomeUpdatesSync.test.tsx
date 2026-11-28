import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REFRESH_MS } from '../../pages/HomePage';
import type { UpdateItem } from '../../services/publicApi';
import { render, type Rendered } from '../../test/render';
import { HomeUpdates, syncNoteText } from './HomeUpdates';
import { badgeFor } from './updateVisuals';

const list = vi.fn();
vi.mock('../../services/publicApi', () => ({ updateService: { list: (...a: unknown[]) => list(...a) } }));

const job = (title: string): UpdateItem => ({
  id: `official:${title}`, category: 'JOB', title, summary: 'Kendriya Vidyalaya Sangathan published this notice on 5 Nov 2026.',
  imageUrl: null, publishedOn: '2026-11-05', updatedAt: null, eventDate: null, eventLabel: null, deadline: false, badge: 'NEW',
  sourceUrl: 'https://cdnbbsr.s3waas.gov.in/x.pdf', sourceName: 'Kendriya Vidyalaya Sangathan (KVS)', linkPath: null,
  actionLabel: 'View Notice', verified: false, origin: 'OFFICIAL_SOURCE', topic: 'kvs',
});
const page = (items: UpdateItem[]) => ({ content: items, page: 0, size: 6, totalElements: items.length, totalPages: 1, first: true, last: true });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

/** The home page's updates section with a "refresh" button standing in for the 15-minute timer. */
function Harness() {
  const [refresh, setRefresh] = useState(0);
  const all = { data: page([]), loading: false, error: null, reload: () => {} };
  return (
    <>
      <button type="button" id="tick" onClick={() => setRefresh((n) => n + 1)}>tick</button>
      <HomeUpdates all={all} refresh={refresh}
        sync={{ lastCheckedAt: '2026-11-14T00:32:00Z', nextCheckAt: '2026-11-15T00:30:00Z', schedule: 'Daily at 6:00 AM IST', sources: 6 }} />
    </>
  );
}

describe('official-source updates on the home page', () => {
  let view: Rendered | undefined;
  beforeEach(() => {
    list.mockReset();
    localStorage.clear();
  });
  afterEach(() => view?.unmount());

  it('refreshes from our server every 15 minutes, never faster', () => {
    expect(REFRESH_MS).toBe(15 * 60 * 1000);
  });

  it('says the sources are checked daily and when they were last checked, in India time', () => {
    const status = { lastCheckedAt: '2026-11-14T00:32:00Z', nextCheckAt: null, schedule: 'Daily at 6:00 AM IST', sources: 6 };
    const text = syncNoteText(status) ?? '';
    expect(text).toContain('Official sources checked daily at 6:00 AM IST');
    expect(text).toMatch(/last checked 14 Nov,? 6:02\s?(am|AM)/);
    expect(text).not.toMatch(/real[- ]time|live/i);
    expect(syncNoteText({ ...status, lastCheckedAt: null })).toBe('Official sources checked daily at 6:00 AM IST.');
    expect(syncNoteText(null)).toBeNull();
  });

  it('shows the Expired badge for past updates', () => {
    expect(badgeFor({ badge: 'EXPIRED', updatedAt: null })?.label).toBe('Expired');
  });

  it('reloads the open tab on each refresh and keeps the last cards if the server cannot be reached', async () => {
    list.mockResolvedValueOnce(page([job('KVS: interview notice for Principal posts')]));
    view = render(<Harness />);
    expect(view.container.textContent).toContain('Official sources checked daily at 6:00 AM IST');

    const jobsTab = [...view.container.querySelectorAll('[role="tab"]')].find((t) => t.textContent?.includes('Jobs')) as HTMLButtonElement;
    act(() => jobsTab.click());
    await flush();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenLastCalledWith({ category: 'JOB', size: 6 });
    expect(view.container.textContent).toContain('KVS: interview notice for Principal posts');

    // The next refresh reads the new notice the daily check stored: no new deploy needed.
    list.mockResolvedValueOnce(page([job('KVS: extension of last date for Superintending Engineer'), job('KVS: interview notice for Principal posts')]));
    act(() => (view!.container.querySelector('#tick') as HTMLButtonElement).click());
    await flush();
    expect(list).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).toContain('KVS: extension of last date for Superintending Engineer');

    // A refresh that fails leaves the last good cards on screen.
    list.mockRejectedValueOnce(new Error('offline'));
    act(() => (view!.container.querySelector('#tick') as HTMLButtonElement).click());
    await flush();
    expect(list).toHaveBeenCalledTimes(3);
    expect(view.container.textContent).toContain('KVS: extension of last date for Superintending Engineer');
    expect(view.container.textContent).not.toContain('could not be loaded');
  });
});
