import { describe, expect, it } from 'vitest';
// The deployed file itself, read through Vite (the app's types have no Node modules).
import conf from '../../nginx.conf?raw';

/**
 * nginx's redirect of old ?tab= section addresses (frontend/nginx.conf, map $sd_section_redirect), checked against the
 * map's own lines: each "~regex" "value" pair is read from the file and applied the way nginx applies a map (first
 * matching regex wins; $name in the value is that named capture). The patterns use only syntax that PCRE and
 * JavaScript read alike: named groups, (?:…), character classes and \?.
 */
const block = /map "\$uri\?\$args" \$sd_section_redirect \{([\s\S]*?)\n\}/.exec(conf)?.[1] ?? '';
const rules = [...block.matchAll(/^\s*"~([^"]+)"\s+"([^"]+)";/gm)].map(([, pattern, value]) => ({ re: new RegExp(pattern), value }));

/** What nginx's map gives for a request: the redirect target, or '' (no redirect). */
function target(uriAndArgs: string): string {
  for (const { re, value } of rules) {
    const m = re.exec(uriAndArgs);
    if (m) return value.replace(/\$([a-z_]+)/g, (_, name: string) => m.groups?.[name] ?? '');
  }
  return '';
}

describe('nginx: old ?tab= section addresses', () => {
  it('has the map and the server-level redirect that uses it', () => {
    expect(rules).toHaveLength(3);
    expect(conf).toMatch(/if \(\$sd_section_redirect\) \{\s*return 301 \$sd_section_redirect;\s*\}/);
  });

  it('sends a profile section to the profile, the section as its fragment', () => {
    expect(target('/schools/jnv-pulwama?tab=boarding')).toBe('/schools/jnv-pulwama#boarding');
    expect(target('/schools/navy-children-school-chanakyapuri-delhi?tab=ranking')).toBe('/schools/navy-children-school-chanakyapuri-delhi#ranking');
  });

  it('sends a preparation dashboard\'s old tab to its guide, and any other exam tab to that page', () => {
    expect(target('/exams/jnvst?tab=faq')).toBe('/exams/jnvst/guide#faq');
    expect(target('/exams/netarhat?tab=prep')).toBe('/exams/netarhat/guide#prep');
    expect(target('/exams/aissee?tab=dates')).toBe('/exams/aissee/guide#dates');
    expect(target('/exams/jnvst/guide?tab=dates')).toBe('/exams/jnvst/guide#dates');
    expect(target('/exams/jnv-class-9?tab=prep')).toBe('/exams/jnv-class-9#prep');
    expect(target('/exams/jnv-class-11?tab=pattern')).toBe('/exams/jnv-class-11#pattern');
  });

  it('leaves every other address alone', () => {
    for (const plain of [
      '/schools/jnv-pulwama?', // no query: nginx's "$uri?$args" ends in "?"
      '/schools/jnv-pulwama?tab=boarding&utm_source=wa', // more than the tab: served as before
      '/schools/jnv-pulwama?tab=Boarding',
      '/schools/jnv-pulwama?tab=',
      '/schools?tab=boarding',
      '/schools/a/b?tab=fees',
      '/rankings/government-boarding?tab=boarding', // the ranking hub's tab is a filter, not a section
      '/states/bihar/nalanda?page=1',
      '/exams/practice/session?tab=x',
      '/api/v1/schools/slug/jnv-pulwama?tab=boarding',
      '/__seo/schools/jnv-pulwama?tab=boarding', // the server-side include of the head
      '/index.html?tab=boarding',
    ]) {
      expect(target(plain), plain).toBe('');
    }
  });
});
