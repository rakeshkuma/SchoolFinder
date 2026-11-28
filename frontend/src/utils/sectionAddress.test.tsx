import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { examGuideSection, sectionOf, useSectionAddress, withoutTab } from './sectionAddress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('section addresses', () => {
  it('reads a section from the fragment, only as a plain lower-case id', () => {
    expect(sectionOf('#fees')).toBe('fees');
    expect(sectionOf('fees')).toBe('fees');
    expect(sectionOf('')).toBeNull();
    expect(sectionOf('#')).toBeNull();
    expect(sectionOf('#Fees')).toBeNull();
    expect(sectionOf('#fees-2')).toBeNull();
    expect(sectionOf('#%3Cscript%3E')).toBeNull();
  });

  it('links a section of an exam guide at the guide, never with ?tab=', () => {
    expect(examGuideSection('rimc', 'dates')).toBe('/exams/rimc#dates');
    // The preparation dashboards keep their guide at /guide.
    expect(examGuideSection('jnvst', 'pattern')).toBe('/exams/jnvst/guide#pattern');
    expect(examGuideSection('netarhat', 'papers')).toBe('/exams/netarhat/guide#papers');
    expect(examGuideSection('aissee', 'faq')).not.toContain('?');
  });

  it('drops only a card link\'s section request from the navigation state', () => {
    expect(withoutTab({ tab: 'fees' })).toBeNull();
    expect(withoutTab({ tab: 'fees', from: '/exams?class=6' })).toEqual({ from: '/exams?class=6' });
    const kept = { from: '/exams' };
    expect(withoutTab(kept)).toBe(kept);
    expect(withoutTab(null)).toBeNull();
    expect(withoutTab(undefined)).toBeUndefined();
  });
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let open: (id: string) => void = () => {};

function Probe() {
  const section = useSectionAddress('overview');
  const { pathname, search, hash, state } = useLocation();
  open = section.open;
  return <p>{`${section.requested}|${pathname}${search}${hash}|${JSON.stringify(state ?? null)}`}</p>;
}

/** Renders the probe at an address (with an optional navigation state) and returns what it shows. */
function render(entry: string, state?: unknown): () => string {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<MemoryRouter initialEntries={[{ pathname: entry.split(/[?#]/)[0], search: /\?[^#]*/.exec(entry)?.[0] ?? '', hash: /#.*/.exec(entry)?.[0] ?? '', state }]}><Probe /></MemoryRouter>);
  });
  return () => container!.textContent ?? '';
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('useSectionAddress', () => {
  it('opens the section the fragment names, and the first one without a fragment', () => {
    expect(render('/schools/x#fees')()).toBe('fees|/schools/x#fees|null');
  });

  it('starts on the first section when the address names none', () => {
    expect(render('/schools/x')()).toBe('overview|/schools/x|null');
  });

  it('moves an old ?tab= value into the fragment, keeping the other parameters', () => {
    expect(render('/schools/x?tab=boarding')()).toBe('boarding|/schools/x#boarding|null');
    act(() => root?.unmount());
    container?.remove();
    expect(render('/exams/rimc?utm_source=wa&tab=dates')()).toBe('dates|/exams/rimc?utm_source=wa#dates|null');
  });

  it('moves a card link\'s section request into the fragment and keeps the rest of the state', () => {
    expect(render('/schools/x', { tab: 'ranking' })()).toBe('ranking|/schools/x#ranking|null');
    act(() => root?.unmount());
    container?.remove();
    expect(render('/exams/rimc', { from: '/exams?class=6' })()).toBe('overview|/exams/rimc|{"from":"/exams?class=6"}');
  });

  it('writes the opened section into the fragment, and none for the first section', () => {
    const shown = render('/exams/rimc', { from: '/exams?class=6' });
    act(() => open('pattern'));
    expect(shown()).toBe('pattern|/exams/rimc#pattern|{"from":"/exams?class=6"}');
    act(() => open('overview'));
    expect(shown()).toBe('overview|/exams/rimc|{"from":"/exams?class=6"}');
  });
});
