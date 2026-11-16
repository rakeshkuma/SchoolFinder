import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { click, render, type Rendered } from '../../test/render';
import { labelledBy, SchoolProfileNav, type ProfileSection } from './SchoolProfileNav';

const sections: ProfileSection[] = [
  { id: 'overview', label: 'Overview', primary: true },
  { id: 'admissions', label: 'Admissions', primary: true },
  { id: 'photos', label: 'Gallery', count: 3, primary: true },
  { id: 'reviews', label: 'Reviews', count: 0, primary: false },
  { id: 'sources', label: 'Sources', primary: false },
];

const key = (el: Element | null, k: string) => act(() => {
  el?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
});

describe('SchoolProfileNav', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('shows the main sections as tabs, with counts, and only the active one in the tab order', () => {
    view = render(<SchoolProfileNav sections={sections} active="admissions" onChange={() => {}} />);
    const tabs = [...view.container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Admissions', 'Gallery3']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    // Secondary sections are not tabs in the bar, and a count of 0 is not shown.
    expect(view.container.textContent).not.toContain('Reviews');
  });

  it('moves between tabs with the arrow keys, Home and End', () => {
    const onChange = vi.fn();
    view = render(<SchoolProfileNav sections={sections} active="overview" onChange={onChange} />);
    const first = view.container.querySelector('#school-tab-overview');
    key(first, 'ArrowRight');
    key(first, 'ArrowLeft');
    key(first, 'End');
    key(first, 'Home');
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['admissions', 'photos', 'photos', 'overview']);
  });

  it('keeps the other sections under "More", names the open one there, and closes with Escape', () => {
    const onChange = vi.fn();
    view = render(<SchoolProfileNav sections={sections} active="reviews" onChange={onChange} />);
    const more = view.container.querySelector<HTMLButtonElement>('#school-tab-more')!;
    expect(more.textContent).toContain('Reviews');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    const items = [...view.container.querySelectorAll('[role="menuitem"]')];
    expect(items.map((i) => i.textContent)).toEqual(['Reviews', 'Sources']);
    key(items[0], 'Escape');
    expect(view.container.querySelector('[role="menu"]')).toBeNull();
    click(more);
    click(view.container.querySelectorAll('[role="menuitem"]')[1]);
    expect(onChange).toHaveBeenCalledWith('sources');
    expect(view.container.querySelector('[role="menu"]')).toBeNull();
  });

  it('labels the panel by its tab, or by "More" for a secondary section', () => {
    expect(labelledBy(sections, 'photos')).toBe('school-tab-photos');
    expect(labelledBy(sections, 'sources')).toBe('school-tab-more');
  });
});
