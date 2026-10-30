import { beforeEach, describe, expect, it } from 'vitest';
import { clearProgress, loadProgress, saveProgress, type TestProgress } from './testProgress';

const ids = ['a/1', 'a/2', 'a/3'];
const progress: TestProgress = {
  questionIds: ids, answers: { 'a/1': 2, 'a/3': 0 }, marked: ['a/2'], visited: ['a/1', 'a/2', 'a/3'], index: 2,
  startedAt: 1000, endsAt: 61000,
};

describe('test progress', () => {
  beforeEach(() => sessionStorage.clear());

  it('restores progress for the same questions', () => {
    saveProgress('k', progress);
    expect(loadProgress('k', ids)).toEqual(progress);
  });

  it('ignores and removes progress saved for different questions', () => {
    saveProgress('k', progress);
    expect(loadProgress('k', ['a/1', 'a/2'])).toBeNull();
    expect(loadProgress('k', ids)).toBeNull();
  });

  it('drops answers that are not valid option indexes and clamps the position', () => {
    saveProgress('k', { ...progress, answers: { 'a/1': 9, 'a/2': 1.5, 'x/9': 0, 'a/3': 3 }, index: 40 });
    expect(loadProgress('k', ids)).toMatchObject({ answers: { 'a/3': 3 }, index: 0 });
  });

  it('survives corrupt storage and can be cleared', () => {
    sessionStorage.setItem('isf.practice.progress:k', '{not json');
    expect(loadProgress('k', ids)).toBeNull();
    saveProgress('k', progress);
    clearProgress('k');
    expect(loadProgress('k', ids)).toBeNull();
  });
});
