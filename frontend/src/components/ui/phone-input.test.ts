import { describe, expect, it } from 'vitest';
import {
  formatPhoneNumberMask,
  parseInitialPhone,
} from './PhoneInputWithCountry.js';

describe('PhoneInputWithCountry masking and parsing', () => {
  describe('formatPhoneNumberMask', () => {
    it('should format 8 digits as ####-####', () => {
      expect(formatPhoneNumberMask('55551234')).toBe('5555-1234');
    });

    it('should strip letters and non-numeric characters', () => {
      expect(formatPhoneNumberMask('55a5b5c1234')).toBe('5555-1234');
    });

    it('should limit input to at most 8 digits', () => {
      expect(formatPhoneNumberMask('1234567899999')).toBe('1234-5678');
    });

    it('should not add hyphen if 4 or fewer digits', () => {
      expect(formatPhoneNumberMask('555')).toBe('555');
      expect(formatPhoneNumberMask('5555')).toBe('5555');
    });
  });

  describe('parseInitialPhone', () => {
    it('should parse Guatemalan country code +502', () => {
      const res = parseInitialPhone('+502 5555-1234');
      expect(res.countryCode).toBe('+502');
      expect(res.localNumber).toBe('5555-1234');
    });

    it('should parse Salvadoran country code +503', () => {
      const res = parseInitialPhone('+503 7890-1234');
      expect(res.countryCode).toBe('+503');
      expect(res.localNumber).toBe('7890-1234');
    });

    it('should default to +502 when no country code is present', () => {
      const res = parseInitialPhone('55551234');
      expect(res.countryCode).toBe('+502');
      expect(res.localNumber).toBe('5555-1234');
    });
  });
});
