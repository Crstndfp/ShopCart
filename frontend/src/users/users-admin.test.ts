import { describe, expect, it } from 'vitest';
import {
  getRoleMeta,
  validatePasswordStrength,
} from '../types/user-admin.types.js';

describe('RF-01 User Administration & Role Security Domain Logic', () => {
  describe('getRoleMeta', () => {
    it('should return purple badge styling for ADMINISTRATOR', () => {
      const meta = getRoleMeta('ADMINISTRATOR');
      expect(meta.label).toBe('Administrador');
      expect(meta.badgeClass).toContain('purple');
    });

    it('should return amber badge styling for OPERATOR', () => {
      const meta = getRoleMeta('OPERATOR');
      expect(meta.label).toBe('Operador Logístico');
      expect(meta.badgeClass).toContain('amber');
    });

    it('should return emerald badge styling for CLIENT', () => {
      const meta = getRoleMeta('CLIENT');
      expect(meta.label).toBe('Cliente');
      expect(meta.badgeClass).toContain('emerald');
    });

    it('should return fallback slate styling for unknown role', () => {
      const meta = getRoleMeta('CUSTOM_ROLE');
      expect(meta.label).toBe('CUSTOM_ROLE');
      expect(meta.badgeClass).toContain('slate');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should pass for strong password meeting all criteria', () => {
      const res = validatePasswordStrength('Password123!');
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const res = validatePasswordStrength('Pass1!');
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debe tener al menos 8 caracteres');
    });

    it('should reject passwords missing uppercase characters', () => {
      const res = validatePasswordStrength('password123!');
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debe incluir al menos una letra mayúscula');
    });

    it('should reject passwords missing numeric digits', () => {
      const res = validatePasswordStrength('Password!!!');
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debe incluir al menos un número');
    });

    it('should reject passwords missing special characters', () => {
      const res = validatePasswordStrength('Password123');
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Debe incluir al menos un carácter especial (!@#$%...)');
    });
  });
});
