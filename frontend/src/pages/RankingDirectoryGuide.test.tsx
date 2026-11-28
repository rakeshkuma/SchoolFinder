import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../test/render';
import type { DirectoryGuide } from '../services/publicApi';
import { DirectoryGuidePanel, GUIDED_VIEWS } from './RankingDirectory';

/** Test fixture in the shape the backend's DirectoryGuides sends; not the real text. */
const guide: DirectoryGuide = {
  heading: 'About fixture schools in India',
  intro: 'What to know first.',
  sections: [
    { heading: 'What it is', paragraphs: ['A fixture paragraph.'], points: [] },
    { heading: 'The stages', paragraphs: [], points: ['Stage one: ages 3 to 12.', 'Stage two: ages 11 to 16.'] },
  ],
  faqs: [{ question: 'Is this list a ranking?', answer: 'No. The schools are listed A to Z.' }],
  sources: [{ title: 'Fixture authority: find a school', url: 'https://authority.example.org/find' }],
  checkedOn: '2026-11-23',
};

describe('DirectoryGuidePanel', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('shows every section, point, question and source, with the date the facts were checked', () => {
    view = render(<DirectoryGuidePanel guide={guide} />);
    const text = view.container.textContent ?? '';
    expect(view.container.querySelector('h2')?.textContent).toBe('About fixture schools in India');
    expect([...view.container.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['What it is', 'The stages', 'Questions parents ask']);
    expect(view.container.querySelectorAll('li')).toHaveLength(3); // two points and one source
    expect(view.container.querySelector('dt')?.textContent).toBe('Is this list a ranking?');
    expect(text).toContain('No. The schools are listed A to Z.');
    expect(text).toContain('23 Nov 2026');
    const source = view.container.querySelector('a[href="https://authority.example.org/find"]');
    expect(source?.getAttribute('target')).toBe('_blank');
    expect(source?.getAttribute('rel')).toContain('noopener');
  });

  it('is offered only on the views that have an explainer', () => {
    expect([...GUIDED_VIEWS].sort()).toEqual(['cambridge-schools', 'ib-schools']);
  });
});
