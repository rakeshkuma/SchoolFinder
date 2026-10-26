import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { click, render, type Rendered } from '../test/render';
import { MAX_COMPARE, useCompare } from './useCompare';

function ReplaceWithSix() {
  const { items, replace } = useCompare();
  return (
    <>
      <button type="button" onClick={() => replace([1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `S${id}`, slug: `s${id}` })))}>go</button>
      <output>{items.map((i) => i.id).join(',')}</output>
    </>
  );
}

describe('useCompare.replace', () => {
  let view: Rendered | undefined;
  beforeEach(() => localStorage.clear());
  afterEach(() => view?.unmount());

  it('replaces the selection with the top schools, capped at the comparison limit', () => {
    localStorage.setItem('dsf.compare', JSON.stringify([{ id: 99, name: 'Old', slug: 'old' }]));
    view = render(<ReplaceWithSix />);
    expect(view.container.querySelector('output')?.textContent).toBe('99');
    click(view.container.querySelector('button'));
    expect(view.container.querySelector('output')?.textContent).toBe([1, 2, 3, 4].slice(0, MAX_COMPARE).join(','));
  });
});
