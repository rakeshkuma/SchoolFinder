import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import { SchoolImage } from './SchoolImage';

describe('SchoolImage', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('puts the photo in the shared frame, lazily, with the credit as its tooltip and not on the picture', () => {
    view = render(<SchoolImage src="/a.jpg" name="Baldwin Academy" credit="A Photographer / Wikimedia Commons" />);
    const img = view.container.querySelector('.school-image > img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.title).toBe('Photo: A Photographer / Wikimedia Commons');
    expect(view.container.textContent).not.toContain('Photographer');
  });

  it('keeps the label on an illustration', () => {
    view = render(<SchoolImage src="/a.jpg" name="A School" credit="Illustration only" illustrative />);
    expect(view.container.textContent).toContain('Illustration only');
  });

  it('falls back to the generated cover with no photo, or when a photo fails, and keeps what is drawn over it', () => {
    view = render(<SchoolImage src={null} name="Baldwin Academy"><span>Name</span></SchoolImage>);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.textContent).toContain('BA');
    expect(view.container.textContent).toContain('Name');
    view.unmount();
    view = render(<SchoolImage src="/broken.jpg" name="Baldwin Academy" />);
    act(() => { view!.container.querySelector('img')!.dispatchEvent(new Event('error')); });
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('.school-image')).not.toBeNull();
  });
});
