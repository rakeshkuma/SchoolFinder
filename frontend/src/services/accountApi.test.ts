import { describe, expect, it } from 'vitest';
import { googleSignInUrl, safeNext } from './accountApi';

describe('googleSignInUrl', () => {
  it('passes only a safe return path and the keep-signed-in choice', () => {
    expect(googleSignInUrl('/exams/jnvst?tab=dates', true))
      .toBe('/api/v1/account/oauth2/authorization/google?next=%2Fexams%2Fjnvst%3Ftab%3Ddates&remember=1');
    expect(googleSignInUrl('https://evil.example')).toBe('/api/v1/account/oauth2/authorization/google?next=%2Faccount');
  });
});

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    expect(safeNext('/exams/jnvst?tab=dates#top')).toBe('/exams/jnvst?tab=dates#top');
    expect(safeNext('/saved')).toBe('/saved');
  });

  it('falls back for anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'exams', '/a\r\nb', '', null, undefined]) {
      expect(safeNext(bad)).toBe('/account');
    }
    expect(safeNext('//evil.example', '/')).toBe('/');
  });
});
