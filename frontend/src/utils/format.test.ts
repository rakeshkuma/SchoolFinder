import { describe, expect, it } from 'vitest';
import { daysUntil, formatMoney, formatMoneyCompact, formatYesNo, NOT_AVAILABLE, orNotAvailable } from './format';

describe('format helpers', () => {
  it('never renders unknown money as zero', () => {
    expect(formatMoney(null)).toBe(NOT_AVAILABLE);
    expect(formatMoney(undefined)).toBe(NOT_AVAILABLE);
    expect(formatMoney(0)).toContain('0');
    expect(formatMoney(125000, true)).toBe('₹1,25,000');
  });

  it('formats compact Indian amounts', () => {
    expect(formatMoneyCompact(null)).toBe(NOT_AVAILABLE);
    expect(formatMoneyCompact(85000)).toBe('₹85,000');
    expect(formatMoneyCompact(185400)).toBe('₹1.85 L');
    expect(formatMoneyCompact(100000)).toBe('₹1 L');
    expect(formatMoneyCompact(12000000)).toBe('₹1.2 Cr');
  });

  it('keeps unknown booleans and strings as not available', () => {
    expect(formatYesNo(null)).toBe(NOT_AVAILABLE);
    expect(formatYesNo(false)).toBe('No');
    expect(orNotAvailable('')).toBe(NOT_AVAILABLE);
    expect(orNotAvailable(0)).toBe('0');
  });

  it('counts days until a deadline', () => {
    const today = new Date(2026, 9, 23);
    expect(daysUntil('2026-10-30', today)).toBe(7);
    expect(daysUntil('2026-10-20', today)).toBe(-3);
    expect(daysUntil(null, today)).toBeNull();
  });
});
