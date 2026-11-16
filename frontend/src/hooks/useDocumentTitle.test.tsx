import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../test/render';
import { serverHeadInPlace, useDocumentTitle } from './useDocumentTitle';

const SERVER_TITLE = 'Sainik Schools in India: list and admission | SchoolDhundo';

function Page({ title, description }: { title: string; description?: string }) {
  useDocumentTitle(title, description);
  return null;
}

function serverHead({ noindex = false } = {}) {
  document.title = SERVER_TITLE;
  document.head.innerHTML = '<title>' + SERVER_TITLE + '</title>'
    + '<meta name="description" content="Server description" />'
    + '<link rel="canonical" href="https://schooldhundo.in/" />'
    + (noindex ? '<meta name="robots" content="noindex" />' : '');
}

const description = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;

let view: Rendered | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
  document.head.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('useDocumentTitle', () => {
  it('keeps the title and description the server wrote for the page first loaded', () => {
    serverHead();
    expect(serverHeadInPlace()).toBe(true);
    view = render(<Page title="Sainik Schools" description="Shorter app description" />);
    expect(document.title).toBe(SERVER_TITLE);
    expect(description()).toBe('Server description');
  });

  it('sets its own title on a page the server marked noindex', () => {
    serverHead({ noindex: true });
    view = render(<Page title="My account" />);
    expect(document.title).toBe('My account · SchoolDhundo');
  });

  it('sets its own title and description once the app has moved to another page', () => {
    serverHead();
    window.history.pushState(null, '', '/exams/aissee');
    expect(serverHeadInPlace()).toBe(false);
    view = render(<Page title="AISSEE preparation" description="App description" />);
    expect(document.title).toBe('AISSEE preparation · SchoolDhundo');
    expect(description()).toBe('App description');
  });

  it('sets its own title when the server sent no page head (the fallback block has no canonical link)', () => {
    view = render(<Page title="Compare schools" />);
    expect(document.title).toBe('Compare schools · SchoolDhundo');
  });
});
