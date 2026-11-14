import { describe, expect, it } from 'vitest';
import { activeLabel, NAV_PILLARS } from './MainNav';

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
