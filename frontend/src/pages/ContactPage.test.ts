import { describe, expect, it } from 'vitest';
import { contactProblems } from './ContactPage';

const good = { name: 'Asha', email: 'asha@example.org', subject: 'A subject', message: 'A long enough message.' };

describe('contact form checks', () => {
  it('accepts a complete message', () => {
    expect(contactProblems(good)).toEqual({});
  });

  it('names each problem', () => {
    const p = contactProblems({ name: ' ', email: 'not-an-email', subject: 'a', message: 'short' });
    expect(Object.keys(p).sort()).toEqual(['email', 'message', 'name', 'subject']);
  });
});
