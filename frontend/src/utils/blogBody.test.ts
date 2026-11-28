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

describe('tables and notes in articles', () => {
  it('reads a table with its header and skips the divider row', () => {
    const [table] = parseBody('| Document | Why |\n| --- | --- |\n| Birth certificate | Age proof |\n| Address proof | Distance rules |');
    expect(table).toEqual({ kind: 'table', head: ['Document', 'Why'], rows: [['Birth certificate', 'Age proof'], ['Address proof', 'Distance rules']] });
  });

  it('joins note lines into one note and keeps ordinary lines apart', () => {
    const blocks = parseBody('> Dates change every year.\n> Check the official notice.\n\nA paragraph | with a bar');
    expect(blocks[0]).toEqual({ kind: 'note', text: 'Dates change every year. Check the official notice.' });
    expect(blocks[1].kind).toBe('p');
  });
});
