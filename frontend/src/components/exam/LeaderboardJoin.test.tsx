import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, type Rendered } from '../../test/render';
import { ParticipantForm, PointsPanel, bestNote } from './LeaderboardJoin';

vi.mock('../../services/publicApi', () => ({ locationService: { states: async () => [] } }));

describe('ParticipantForm', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('asks guests their age', () => {
    view = render(<ParticipantForm member={false} submitLabel="Join" onSubmit={async () => {}} />);
    expect(view.container.textContent).toContain('Your age');
    expect(view.container.textContent).toContain('I am under 18');
  });

  it('does not ask members, whose accounts are for adults', () => {
    view = render(<ParticipantForm member submitLabel="Save" onSubmit={async () => {}} />);
    expect(view.container.textContent).not.toContain('Your age');
    expect(view.container.textContent).not.toContain('I am under 18');
    expect(view.container.textContent).toContain('Accounts are for adults');
  });
});

describe('PointsPanel', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('shows the points earned and why', () => {
    view = render(<PointsPanel signedIn points={{ earned: 20, dailyQuiz: false, reviewFlag: null }} />);
    expect(view.container.textContent).toContain('+20 points');
    expect(view.container.textContent).toContain('first time');
  });

  it('shows the rank, the comparison with the best earlier score and new badges', () => {
    view = render(<PointsPanel signedIn scorePercent={80} points={{ earned: 20, dailyQuiz: false, reviewFlag: null, rank: 4, participants: 90,
      previousBest: 60, achievements: [{ code: 'FIRST_TEST', title: 'First test completed' }] }} />);
    expect(view.container.textContent).toContain('Your rank: #4 of 90');
    expect(view.container.textContent).toContain('up 20 from 60%');
    expect(view.container.textContent).toContain('First test completed');
    expect(bestNote(60, 60)).toContain('Level with');
    expect(bestNote(50, 60)).toBe('Your best on this test is 60%.');
  });

  it('explains when correct answers earned nothing', () => {
    view = render(<PointsPanel signedIn points={{ earned: 0, dailyQuiz: false, reviewFlag: 'TOO_FAST' }} />);
    expect(view.container.textContent).toContain('faster than a person can read');
    view.unmount();
    view = render(<PointsPanel signedIn points={{ earned: 0, dailyQuiz: false, reviewFlag: 'DAILY_REPEAT' }} />);
    expect(view.container.textContent).toContain('already counted');
  });

  it('offers guests who have not joined a way to count the result, and shows nothing to members without points', () => {
    view = render(<PointsPanel signedIn={false} points={null} onJoin={async () => ({ earned: 10, dailyQuiz: false, reviewFlag: null })} />);
    expect(view.container.textContent).toContain('Count this result on the leaderboard');
    view.unmount();
    view = render(<PointsPanel signedIn points={null} />);
    expect(view.container.textContent).toBe('');
  });
});
