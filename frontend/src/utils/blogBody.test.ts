import { describe, expect, it } from 'vitest';
import { contents, parseBody, parseInline } from './blogBody';

describe('blog article text', () => {
  it('reads headings, paragraphs and lists', () => {
    const blocks = parseBody('Intro line\nstill intro\n\n## First step\n- one\n- two\n\n### Detail\n1. a\n2. b');
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'h2', 'ul', 'h3', 'ol']);
    expect(blocks[0]).toEqual({ kind: 'p', text: 'Intro line still intro' });
    expect(contents(blocks)).toEqual([{ id: 'first-step', text: 'First step' }]);
  });

  it('gives repeated headings different anchors', () => {
    expect(contents(parseBody('## Fees\n\n## Fees')).map((c) => c.id)).toEqual(['fees', 'fees-2']);
  });

  it('reads bold text and links', () => {
    expect(parseInline('See **this** and [the guide](/admissions/guide).')).toEqual([
      { kind: 'text', text: 'See ' }, { kind: 'bold', text: 'this' }, { kind: 'text', text: ' and ' },
      { kind: 'link', text: 'the guide', href: '/admissions/guide' }, { kind: 'text', text: '.' },
    ]);
  });

  it('never turns an unsafe address into a link', () => {
    expect(parseInline('[x](javascript:alert(1))').some((p) => p.kind === 'link')).toBe(false);
    expect(parseInline('[x](//evil.example)').some((p) => p.kind === 'link')).toBe(false);
    expect(parseInline('<script>alert(1)</script>')).toEqual([{ kind: 'text', text: '<script>alert(1)</script>' }]);
  });
});
