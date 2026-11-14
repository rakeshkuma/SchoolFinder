/**
 * Blog articles are stored as plain text with light formatting: ## and ### headings, - and 1. lists, **bold**,
 * [links](url), tables (| a | b | rows, the first row being the header; a | --- | row is ignored) and notes (lines
 * starting with > , shown as a highlighted box). It is read into blocks and shown as React elements, so nothing in an article can run as HTML.
 */
export type Block =
  | { kind: 'h2' | 'h3'; text: string; id: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'note'; text: string };

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string };

const headingId = (text: string, used: Map<string, number>) => {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  const n = (used.get(base) ?? 0) + 1;
  used.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
};

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    const item = bullet ?? numbered;
    const cells = /^\|(.+)\|$/.exec(line);
    const note = /^>\s?(.*)$/.exec(line);
    if (cells) {
      flush();
      const row = cells[1].split('|').map((c) => c.trim());
      if (row.every((c) => /^:?-{3,}:?$/.test(c))) continue; // the | --- | line under the header
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'table') last.rows.push(row);
      else blocks.push({ kind: 'table', head: row, rows: [] });
    } else if (note) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'note') last.text += ' ' + note[1];
      else blocks.push({ kind: 'note', text: note[1] });
    } else if (!line) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2], id: headingId(heading[2], used) });
    } else if (item) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      if (last?.kind === kind) last.items.push(item[1]);
      else blocks.push({ kind, items: [item[1]] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** A link leaves this site only over http(s); anything else, such as javascript:, stays as plain text. */
const safeHref = (href: string) => /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//'));

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > at) out.push({ kind: 'text', text: text.slice(at, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] });
    else if (safeHref(m[3])) out.push({ kind: 'link', text: m[2], href: m[3] });
    else out.push({ kind: 'text', text: m[2] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  return out;
}

/** The article's main headings, for its table of contents. */
export const contents = (blocks: Block[]) => blocks.flatMap((b) => (b.kind === 'h2' ? [{ id: b.id, text: b.text }] : []));
