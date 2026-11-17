import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { classFromSlug, olympiadClassPath } from '../content/olympiad';
import { PracticeListPage } from './PracticePages';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The practice centre's data never arrives here: the redirect does not wait for it.
vi.mock('../services/publicApi', () => ({
  practiceService: { list: () => new Promise(() => {}), bank: () => new Promise(() => {}) },
  examService: { all: () => new Promise(() => {}) },
}));
vi.mock('../hooks/useMember', () => ({ useMember: () => ({ status: 'signedOut' }) }));

function Where() {
  const location = useLocation();
  return <p>{location.pathname}{location.search}</p>;
}

/** Where the app ends up after opening an address of the practice centre. */
function landing(entry: string): string {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/exams/practice" element={<PracticeListPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  const text = container.textContent ?? '';
  act(() => root.unmount());
  container.remove();
  return text;
}

describe('the Olympiad page address', () => {
  it('sends the old address on to the Olympiad page, keeping a chosen class and subject', () => {
    expect(landing('/exams/practice?category=OLYMPIAD')).toBe('/exams/olympiad');
    expect(landing('/exams/practice?category=OLYMPIAD&class=5&subject=Mathematics')).toBe('/exams/olympiad/class-5?subject=Mathematics');
    expect(landing('/exams/practice?category=OLYMPIAD&class=99')).toBe('/exams/olympiad');
  });

  it('reads and writes a class as people search for it', () => {
    expect(olympiadClassPath(5)).toBe('/exams/olympiad/class-5');
    expect(classFromSlug('class-10')).toBe(10);
    expect(classFromSlug('class-0')).toBeNull();
    expect(classFromSlug('class-13')).toBeNull();
    expect(classFromSlug('guide')).toBeNull();
    expect(classFromSlug(undefined)).toBeNull();
  });
});
