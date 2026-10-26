import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { click, render, type Rendered } from '../../test/render';
import type { Facility, FacilityQueueItem } from '../../types/api';

const verifyBatch = vi.fn();
vi.mock('../../services/adminApi', () => ({ adminService: { verifyBatch: (...args: unknown[]) => verifyBatch(...args) } }));

const { SchoolQueueCard } = await import('./AdminFacilityVerificationPage');

const facility = (id: number, name: string, sourceUrl: string, status: Facility['verificationStatus'] = 'UNVERIFIED'): Facility => ({
  id, category: 'LIBRARY', name, description: null, available: true, sourceUrl, verificationStatus: status, lastVerifiedDate: null,
});

/** Test fixture; describes no real school. */
const ITEM: FacilityQueueItem = {
  schoolId: 5, schoolName: 'Fixture School', slug: 'fixture-school', stateCode: 'DL', stateName: 'Delhi',
  websiteUrl: 'https://fixture.example.org', sourceUrl: 'https://fixture.example.org/about', unverifiedCount: 2,
  facilities: [
    facility(1, 'Library', 'https://fixture.example.org/facilities'),
    facility(2, 'Reading room', 'https://fixture.example.org/facilities'),
    facility(3, 'Old lab', 'https://fixture.example.org/old', 'VERIFIED'),
  ],
};

describe('SchoolQueueCard', () => {
  let view: Rendered | undefined;
  afterEach(() => { view?.unmount(); verifyBatch.mockReset(); });

  it('only offers unverified records, prefills the cited source and sends one batch decision', async () => {
    verifyBatch.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const onDone = vi.fn();
    view = render(<SchoolQueueCard item={ITEM} onDone={onDone} />);
    const verifyButton = [...view.container.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Verify'));
    expect(verifyButton?.disabled).toBe(true); // nothing selected yet

    // The verified record has no checkbox; "select all" picks the two unverified ones.
    expect(view.container.querySelector('input[aria-label="Select Old lab"]')).toBeNull();
    click(view.container.querySelector('input[aria-label="Select all unverified"]'));
    const source = view.container.querySelector<HTMLInputElement>('input[type="url"]');
    expect(source?.value).toBe('https://fixture.example.org/facilities');

    await act(async () => {
      verifyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(verifyBatch).toHaveBeenCalledWith(5, {
      entityType: 'FACILITY', entityIds: [1, 2], status: 'VERIFIED', sourceUrl: 'https://fixture.example.org/facilities', notes: null,
    });
    expect(onDone).toHaveBeenCalledWith(expect.stringContaining('2 records marked verified'));
  });
});
