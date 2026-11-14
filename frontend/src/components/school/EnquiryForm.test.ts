import { describe, expect, it } from 'vitest';
import { enquiryYears, validPhone } from './EnquiryForm';

describe('admission enquiry form', () => {
  it('accepts Indian mobile numbers written the usual ways, as the server does', () => {
    for (const ok of ['9876543210', '+91 98765 43210', '+91-98765-43210', '098765 43210', '6000000000']) expect(validPhone(ok)).toBe(true);
    for (const bad of ['12345', '5876543210', '98765432101', 'call me', '+1 9876543210']) expect(validPhone(bad)).toBe(false);
  });

  it('offers the coming academic years: the next one from October, when parents start asking', () => {
    expect(enquiryYears(new Date(2026, 10, 13))).toEqual(['2027-28', '2028-29']);
    expect(enquiryYears(new Date(2027, 2, 1))).toEqual(['2027-28', '2028-29']);
    expect(enquiryYears(new Date(2027, 5, 1))).toEqual(['2027-28', '2028-29']);
    expect(enquiryYears(new Date(2099, 11, 1))).toEqual(['2100-01', '2101-02']);
  });
});
