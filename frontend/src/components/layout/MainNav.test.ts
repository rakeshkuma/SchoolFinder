import { describe, expect, it } from 'vitest';
import { activeLabel, NAV_PILLARS } from './MainNav';

describe('main navigation', () => {
  it('has the five pillars, in order', () => {
    expect(NAV_PILLARS.map((p) => p.label)).toEqual(['Find Schools', 'Boarding Schools', 'Compare', 'Admissions & Fees', 'Exam Prep']);
  });

  it('lights up the pillar with the most specific matching path', () => {
    expect(activeLabel(NAV_PILLARS, '/schools/sainik-school-8')).toBe('Find Schools');
    expect(activeLabel(NAV_PILLARS, '/rankings/states')).toBe('Find Schools');
    expect(activeLabel(NAV_PILLARS, '/rankings/boarding-schools')).toBe('Boarding Schools');
    expect(activeLabel(NAV_PILLARS, '/network/jawahar-navodaya-vidyalaya')).toBe('Boarding Schools');
    expect(activeLabel(NAV_PILLARS, '/network/kendriya-vidyalaya')).toBe('Find Schools');
    expect(activeLabel(NAV_PILLARS, '/fees')).toBe('Admissions & Fees');
    expect(activeLabel(NAV_PILLARS, '/exams/aissee')).toBe('Exam Prep');
    expect(activeLabel(NAV_PILLARS, '/compare')).toBe('Compare');
    expect(activeLabel(NAV_PILLARS, '/')).toBeNull();
  });
});
