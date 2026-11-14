import { describe, expect, it } from 'vitest';
import { countPractice } from '../../pages/HomePage';
import type { UpdateItem } from '../../services/publicApi';
import type { PracticeSetSummary, SchoolSummary } from '../../types/api';
import { pickFeatured, prepFlag } from './HomeSections';
import { badgeFor, sourceLabel, tickerIcon, updateImage, updateTarget } from './updateVisuals';

const item = (over: Partial<UpdateItem>): UpdateItem => ({
  id: 'x', category: 'EXAM', title: 't', summary: 's', imageUrl: null, publishedOn: '2026-11-01', updatedAt: null, eventDate: null,
  eventLabel: null, deadline: false, badge: null, sourceUrl: null, sourceName: null, linkPath: null, actionLabel: null, verified: false,
  origin: 'EXAM_NOTICE', topic: null, ...over,
});

describe('update badges', () => {
  it('shows the server badge, and how long ago an update under a day old changed', () => {
    const now = Date.parse('2026-11-14T12:00:00Z');
    expect(badgeFor(item({ badge: null }), now)).toBeNull();
    expect(badgeFor(item({ badge: 'CLOSING_SOON' }), now)?.label).toBe('Closing soon');
    expect(badgeFor(item({ badge: 'UPDATED', updatedAt: '2026-11-14T09:30:00Z' }), now)?.label).toBe('Updated 2h ago');
    expect(badgeFor(item({ badge: 'UPDATED', updatedAt: '2026-11-14T11:50:00Z' }), now)?.label).toBe('Updated just now');
    expect(badgeFor(item({ badge: 'UPDATED', updatedAt: '2026-11-10T09:30:00Z' }), now)?.label).toBe('Updated');
  });
});

describe('update pictures and links', () => {
  it('uses the exam’s own school system, and only generic pictures for other notices', () => {
    expect(updateImage(item({ category: 'EXAM', topic: 'aissee' }))).toBe('cadets');
    expect(updateImage(item({ category: 'EXAM', topic: 'netarhat' }))).toBe('netarhat');
    expect(updateImage(item({ category: 'PREP', topic: 'jnvst' }))).toBe('studying');
    const generic = ['teacher-class', 'hero-students', 'studying'];
    for (const id of ['admission:a', 'admission:b', 'admission:c']) {
      expect(generic).toContain(updateImage(item({ id, category: 'ADMISSION', topic: 'admissions' })));
    }
    // The same item always gets the same picture.
    expect(updateImage(item({ id: 'admission:a', category: 'ADMISSION' }))).toBe(updateImage(item({ id: 'admission:a', category: 'ADMISSION' })));
  });

  it('opens the page on this site, else the official source, else nothing', () => {
    expect(updateTarget(item({ linkPath: '/exams/aissee', sourceUrl: 'https://nta.ac.in/x.pdf' }))).toEqual({ internal: '/exams/aissee' });
    expect(updateTarget(item({ sourceUrl: 'https://nta.ac.in/x.pdf' }))).toEqual({ external: 'https://nta.ac.in/x.pdf' });
    expect(updateTarget(item({}))).toBeNull();
  });

  it('names the source, or its web address', () => {
    expect(sourceLabel(item({ sourceName: 'NTA', sourceUrl: 'https://exams.nta.ac.in/x' }))).toBe('NTA');
    expect(sourceLabel(item({ sourceUrl: 'https://www.navodaya.gov.in/nvs/en/x' }))).toBe('navodaya.gov.in');
    expect(sourceLabel(item({}))).toBeNull();
  });

  it('warns about closing deadlines in the ticker', () => {
    expect(tickerIcon(item({ badge: 'CLOSING_SOON', category: 'ADMISSION' })).icon).toBe('warning');
    expect(tickerIcon(item({ badge: 'NEW', category: 'EXAM' })).icon).toBe('fire');
    expect(tickerIcon(item({ badge: 'UPCOMING', category: 'EXAM' })).icon).toBe('megaphone');
    expect(tickerIcon(item({ badge: 'UPDATED', category: 'PREP' })).icon).toBe('refresh');
  });
});

describe('exam preparation cards', () => {
  it('flag New or Updated only from the feed’s practice items for that exam', () => {
    const prep = [item({ category: 'PREP', topic: 'jnvst', badge: 'UPDATED' }), item({ category: 'PREP', topic: 'aissee', badge: 'NEW' })];
    expect(prepFlag(prep, 'jnvst')).toBe('Updated');
    expect(prepFlag(prep, 'aissee')).toBe('New');
    expect(prepFlag(prep, 'netarhat')).toBeNull();
    expect(prepFlag(prep, '*')).toBe('New');
    expect(prepFlag([item({ category: 'EXAM', topic: 'netarhat', badge: 'NEW' })], 'netarhat')).toBeNull();
  });

  it('count practice sets and questions per exam', () => {
    const set = (examSlug: string | null, questionCount: number) => ({ examSlug, questionCount } as PracticeSetSummary);
    const counts = countPractice([set('jnvst', 25), set('jnvst', 30), set('aissee', 40), set(null, 10)]);
    expect(counts.sets).toBe(4);
    expect(counts.questions).toBe(105);
    expect(counts.byExam.jnvst).toEqual({ sets: 2, questions: 55 });
    expect(counts.byExam.aissee).toEqual({ sets: 1, questions: 40 });
  });
});

describe('featured schools', () => {
  const school = (over: Partial<SchoolSummary>) => ({
    id: Math.random(), name: 'School', slug: 's', coverImageUrl: '/img.jpg', annualFeeFrom: null, classesFrom: null, classesTo: null,
    city: null, hasHostel: null, network: null, ...over,
  } as SchoolSummary);

  it('prefers the best-documented schools, with a photo, and at most one per network', () => {
    const picked = pickFeatured([
      school({ id: 1, name: 'JNV One', network: 'JNV' as SchoolSummary['network'], classesFrom: 'Class VI', classesTo: 'Class XII', city: 'A', hasHostel: true }),
      school({ id: 2, name: 'JNV Two', network: 'JNV' as SchoolSummary['network'], classesFrom: 'Class VI', classesTo: 'Class XII', city: 'B', hasHostel: true }),
      school({ id: 3, name: 'Fee School', annualFeeFrom: 100000, city: 'C' }),
      school({ id: 4, name: 'No Photo', coverImageUrl: null, annualFeeFrom: 5, classesFrom: 'I', classesTo: 'XII', city: 'D' }),
      school({ id: 5, name: 'Plain' }),
      school({ id: 6, name: 'Classes School', classesFrom: 'Class I', classesTo: 'Class XII', city: 'E' }),
    ]);
    expect(picked.map((s) => s.id)).toEqual([3, 6, 1, 5]);
  });
});
