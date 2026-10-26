import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { CompareProvider } from '../hooks/useCompare';

// Tells React that updates in tests are wrapped in act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Charts measure their container; jsdom has no ResizeObserver.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

export interface Rendered {
  container: HTMLDivElement;
  unmount: () => void;
}

/** Renders inside a router and the compare provider, as the app does. No extra test libraries needed. */
export function render(ui: ReactNode): Rendered {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(<MemoryRouter><CompareProvider>{ui}</CompareProvider></MemoryRouter>);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element | null) {
  if (!el) throw new Error('element not found');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
