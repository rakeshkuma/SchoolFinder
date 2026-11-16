import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { PlaceSummary } from '../../types/api';
import { PlaceOverview, PlaceQuestions } from './PlaceSummary';

const summary: PlaceSummary = {
  place: 'Dholpur',
  placeFull: 'Dholpur, Rajasthan',
  total: 12,
  intro: 'SchoolDhundo lists 12 schools in Dholpur, Rajasthan, each linked to an official source.',
  boards: [{ code: 'CBSE', label: 'CBSE', count: 12 }],
  types: [{ code: 'PRIVATE', label: 'Private (unaided)', count: 9 }, { code: 'GOVERNMENT', label: 'Government', count: 3 }],
  networks: [{ code: 'KENDRIYA_VIDYALAYA', label: 'Kendriya Vidyalaya', count: 2 }],
  genders: [],
  boarding: 0,
  seniorSecondary: 8,
  withAdmissionDates: 0,
  oldest: [],
  faqs: [{ question: 'How many schools are there in Dholpur?', answer: 'SchoolDhundo lists 12 schools in Dholpur, Rajasthan.' }],
  related: [{ href: '/admissions/guide', label: 'School admission guide' }],
};

describe('PlaceOverview and PlaceQuestions', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('shows the introduction and every count the server sent, plural where needed', () => {
    view = render(<PlaceOverview summary={summary} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Dholpur at a glance');
    expect(text).toContain('SchoolDhundo lists 12 schools in Dholpur, Rajasthan');
    expect(text).toContain('Kendriya Vidyalayas2');
    expect(text).toContain('Up to Class XII8');
    // No boarding schools are recorded, so no boarding tile.
    expect(text).not.toContain('With boarding');
  });

  it('lists the questions and related pages', () => {
    view = render(<PlaceQuestions summary={summary} />);
    expect(view.container.textContent).toContain('Questions about schools in Dholpur');
    expect(view.container.querySelector('a[href="/admissions/guide"]')?.textContent).toBe('School admission guide');
  });

  it('shows nothing for a place with no listed schools', () => {
    const empty = { ...summary, total: 0, intro: null, faqs: [], related: [] };
    view = render(<><PlaceOverview summary={empty} /><PlaceQuestions summary={empty} /></>);
    expect(view.container.textContent).toBe('');
  });
});
