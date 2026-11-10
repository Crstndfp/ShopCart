import { describe, expect, it } from 'vitest';
import {
  formatJsonSnapshot,
  getActionTypeMeta,
  validateConfigValue,
} from '../types/audit.types.js';

describe('RF-09 & RF-10 Audit Log & Global System Configuration Domain Logic', () => {
  describe('getActionTypeMeta', () => {
    it('should return configured metadata for all standard audit actions', () => {
      const createMeta = getActionTypeMeta('CREATE');
      expect(createMeta.label).toBe('Creación');
      expect(createMeta.badgeClass).toContain('emerald');

      const updateMeta = getActionTypeMeta('UPDATE');
      expect(updateMeta.label).toBe('Modificación');
      expect(updateMeta.badgeClass).toContain('sky');

      const deleteMeta = getActionTypeMeta('DELETE');
      expect(deleteMeta.label).toBe('Eliminación');
      expect(deleteMeta.badgeClass).toContain('crimson');

      const statusMeta = getActionTypeMeta('STATUS_CHANGE');
      expect(statusMeta.label).toBe('Cambio de Estado');
      expect(statusMeta.badgeClass).toContain('amber');
    });

    it('should provide fallback for unknown audit action', () => {
      const unknown = getActionTypeMeta('CUSTOM_ACTION');
      expect(unknown.label).toBe('CUSTOM_ACTION');
      expect(unknown.badgeClass).toContain('slate');
    });
  });

  describe('formatJsonSnapshot', () => {
    it('should return "N/A" for null or empty input', () => {
      expect(formatJsonSnapshot(null)).toBe('N/A');
      expect(formatJsonSnapshot('')).toBe('N/A');
    });

    it('should format valid JSON into indented multi-line string', () => {
      const raw = '{"IDProduct":2,"Name":"Polo","IsActive":true}';
      const formatted = formatJsonSnapshot(raw);
      expect(formatted).toContain('\n');
      expect(formatted).toContain('"IDProduct": 2');
    });

    it('should return raw input if not valid JSON without throwing an error', () => {
      const nonJson = 'Raw unparseable text';
      expect(formatJsonSnapshot(nonJson)).toBe('Raw unparseable text');
    });
  });

  describe('validateConfigValue', () => {
    it('should reject empty or whitespace values', () => {
      expect(validateConfigValue('TEXT', '').isValid).toBe(false);
      expect(validateConfigValue('INTEGER', '   ').isValid).toBe(false);
    });

    it('should validate INTEGER data types correctly', () => {
      expect(validateConfigValue('INTEGER', '15').isValid).toBe(true);
      expect(validateConfigValue('INTEGER', '0').isValid).toBe(true);
      expect(validateConfigValue('INTEGER', '-5').isValid).toBe(false);
      expect(validateConfigValue('INTEGER', '12.5').isValid).toBe(false);
      expect(validateConfigValue('INTEGER', 'abc').isValid).toBe(false);
    });

    it('should validate DECIMAL data types correctly', () => {
      expect(validateConfigValue('DECIMAL', '0.12').isValid).toBe(true);
      expect(validateConfigValue('DECIMAL', '100').isValid).toBe(true);
      expect(validateConfigValue('DECIMAL', '-0.5').isValid).toBe(false);
      expect(validateConfigValue('DECIMAL', 'not_a_number').isValid).toBe(false);
    });

    it('should accept arbitrary valid TEXT values', () => {
      expect(validateConfigValue('TEXT', 'GTQ').isValid).toBe(true);
    });
  });
});
