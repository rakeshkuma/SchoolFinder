import { describe, expect, it } from 'vitest';
import { scopeFor } from './LeaderboardPage';

describe('leaderboard ranking menu', () => {
  it('follows an exam guide link to that exam', () => {
    expect(scopeFor(null, 'jnvst').key).toBe('jnvst');
  });

  it('prefers the choice made in the menu', () => {
    expect(scopeFor('daily', 'jnvst').key).toBe('daily');
  });

  it('falls back to everything', () => {
    expect(scopeFor(null, '').key).toBe('');
    expect(scopeFor(null, 'rms').key).toBe('');
  });
});
