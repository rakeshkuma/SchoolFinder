import { describe, expect, it } from 'vitest';
import { activeLabel, NAV_MENUS, NAV_PILLARS, panelColumns } from './MainNav';

describe('main navigation', () => {
  it('has four menus and the Notifications link, in order', () => {
    expect(NAV_PILLARS.map((p) => p.label)).toEqual(['Schools', 'Rankings', 'Admissions', 'Exam Prep', 'Notifications']);
  });

  it('lights up the entry with the most specific matching path', () => {
    expect(activeLabel(NAV_PILLARS, '/schools/sainik-school-8')).toBe('Schools');
    expect(activeLabel(NAV_PILLARS, '/boarding/girls')).toBe('Schools');
    expect(activeLabel(NAV_PILLARS, '/network/jawahar-navodaya-vidyalaya')).toBe('Schools');
    expect(activeLabel(NAV_PILLARS, '/compare')).toBe('Schools');
    expect(activeLabel(NAV_PILLARS, '/rankings/states')).toBe('Rankings');
    expect(activeLabel(NAV_PILLARS, '/rankings/boarding-schools')).toBe('Rankings');
    expect(activeLabel(NAV_PILLARS, '/fees')).toBe('Admissions');
    expect(activeLabel(NAV_PILLARS, '/saved')).toBe('Admissions');
    expect(activeLabel(NAV_PILLARS, '/blog/cbse-vs-icse')).toBe('Admissions');
    expect(activeLabel(NAV_PILLARS, '/exams/aissee')).toBe('Exam Prep');
    expect(activeLabel(NAV_PILLARS, '/updates')).toBe('Notifications');
    expect(activeLabel(NAV_PILLARS, '/')).toBeNull();
  });
});

describe('Exam Prep menu', () => {
  const examPrep = NAV_MENUS.find((m) => m.label === 'Exam Prep')!;
  const links = examPrep.sections.flatMap((s) => s.items.map((i) => i.to));

  it('offers the kept destinations once each, and none of the retired ones', () => {
    expect(links).toEqual([
      '/exams/jnvst', '/exams/aissee', '/exams/netarhat', '/exams',
      '/exams/practice?category=OLYMPIAD',
      '/exams/practice', '/exams/practice/session?mode=DAILY&timer=1', '/exams/resources?type=QUESTION_PAPER',
      '/exams/practice/progress', '/exams/leaderboard',
    ]);
    expect(new Set(links).size).toBe(links.length);
    for (const retired of ['class10-maths-1', 'class12-maths-1', 'class12-physics-1', 'COMPETITIVE']) {
      expect(links.some((l) => l.includes(retired))).toBe(false);
    }
  });

  it('lays out two balanced columns, with no near-empty column', () => {
    const columns = panelColumns(examPrep.sections);
    expect(columns.map((c) => c.map((s) => s.title))).toEqual([['School entrance exams', 'Olympiads'], ['Practice & progress']]);
    expect(columns.map((c) => c.reduce((n, s) => n + s.items.length, 0))).toEqual([5, 5]);
  });

  it('leaves the other menus one column per section', () => {
    for (const menu of NAV_MENUS.filter((m) => m.label !== 'Exam Prep')) {
      expect(panelColumns(menu.sections)).toHaveLength(menu.sections.length);
    }
  });
});
