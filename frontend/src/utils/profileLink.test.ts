import { describe, expect, it } from 'vitest';
import { linkTo, profileLink, requestedTab } from './profileLink';

describe('profileLink', () => {
  it('links to the plain profile address and carries the section in the navigation state', () => {
    expect(profileLink('jnv-pulwama', 'boarding')).toEqual({ to: '/schools/jnv-pulwama', state: { tab: 'boarding' } });
  });

  it('sends no state for the overview or when no section is asked for', () => {
    expect(profileLink('jnv-pulwama')).toEqual({ to: '/schools/jnv-pulwama' });
    expect(profileLink('jnv-pulwama', 'overview')).toEqual({ to: '/schools/jnv-pulwama' });
  });

  it('never puts the section in the address', () => {
    expect(profileLink('x', 'ranking').to).not.toContain('?');
  });
});

describe('linkTo', () => {
  it('turns an old /schools/x?tab= path into a plain profile link with the section in the state', () => {
    expect(linkTo('/schools/dps-rk-puram?tab=admissions')).toEqual({ to: '/schools/dps-rk-puram', state: { tab: 'admissions' } });
  });

  it('links every other path as it is', () => {
    expect(linkTo('/admissions')).toEqual({ to: '/admissions' });
    expect(linkTo('/exams/jnvst?tab=pattern')).toEqual({ to: '/exams/jnvst?tab=pattern' });
    expect(linkTo('/schools/x')).toEqual({ to: '/schools/x' });
  });
});

describe('requestedTab', () => {
  it('reads the section from a profileLink state and ignores anything else', () => {
    expect(requestedTab({ tab: 'fees' })).toBe('fees');
    expect(requestedTab(null)).toBeNull();
    expect(requestedTab(undefined)).toBeNull();
    expect(requestedTab({ tab: 3 })).toBeNull();
    expect(requestedTab({ tab: '' })).toBeNull();
    expect(requestedTab('fees')).toBeNull();
  });
});
