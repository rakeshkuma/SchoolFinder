import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { CriterionContribution } from '../../types/api';
import { RankingBreakdown } from './RankingBreakdown';

const row = (o: Partial<CriterionContribution>): CriterionContribution => ({
  criterionCode: 'X', criterionName: 'X', weight: 10, normalizedScore: null, contribution: null, dataAvailable: false,
  sourceUrl: null, verified: null, evidenceType: null, evidenceNote: null, ...o,
});

describe('RankingBreakdown', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('labels verified and documented evidence, links sources and lists missing criteria without zeros', () => {
    view = render(
      <RankingBreakdown
        breakdown={[
          row({ criterionCode: 'A', criterionName: 'Academic performance', weight: 25, normalizedScore: 80, dataAvailable: true,
            verified: true, evidenceType: 'VERIFIED_SCORE', sourceUrl: 'https://example.org/results' }),
          row({ criterionCode: 'I', criterionName: 'Infrastructure', weight: 15, normalizedScore: 66.67, dataAvailable: true,
            verified: false, evidenceType: 'DOCUMENTED_FACILITIES', evidenceNote: '2 of 3 checklist items documented',
            sourceUrl: 'https://example.org/facilities' }),
          row({ criterionCode: 'S', criterionName: 'Student safety', weight: 15 }),
        ]}
      />,
    );
    const text = view.container.textContent ?? '';
    expect(text).toContain('Verified score');
    expect(text).toContain('Documented, not verified');
    expect(text).toContain('2 of 3 checklist items documented');
    expect(text).toContain('No evidence yet for: Student safety (15%)');
    expect(text).toContain('not scored as zero');
    const sources = [...view.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(sources).toEqual(['https://example.org/results', 'https://example.org/facilities']);
    expect(view.container.querySelector('a')?.getAttribute('rel')).toContain('noopener');
  });
});
