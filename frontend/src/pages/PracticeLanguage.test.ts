import { describe, expect, it } from 'vitest';
import type { PracticeQuestion } from '../types/api';
import { questionText } from './PracticePages';

const base: PracticeQuestion = {
  id: 'q1', section: 'Mathematics', topic: 'HCF', passageId: null, prompt: 'What is 2 + 2?', options: ['4', '3', '5', '22'],
  figure: null, figureAsksNext: false, optionFigures: null, difficulty: 'EASY', chapter: 'Real Numbers', hi: null,
};

describe('questionText', () => {
  it('shows English when English is chosen, even if Hindi exists', () => {
    const q = { ...base, hi: { prompt: '2 + 2 कितना है?', options: ['4', '3', '5', '22'] } };
    expect(questionText(q, 'en')).toEqual({ prompt: 'What is 2 + 2?', options: base.options, hindi: false });
  });

  it('shows the Hindi version when chosen and available', () => {
    const q = { ...base, hi: { prompt: '2 + 2 कितना है?', options: ['चार', 'तीन', 'पाँच', 'बाईस'] } };
    expect(questionText(q, 'hi')).toEqual({ prompt: '2 + 2 कितना है?', options: ['चार', 'तीन', 'पाँच', 'बाईस'], hindi: true });
  });

  it('falls back to English for a question without a Hindi version', () => {
    expect(questionText(base, 'hi')).toMatchObject({ prompt: 'What is 2 + 2?', hindi: false });
  });
});
