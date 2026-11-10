import { describe, expect, it } from 'vitest';
import { translateBackendError } from '../utils/i18n-errors.js';

describe('i18n Backend Error Translator', () => {
  it('should translate exact INSUFFICIENT_STOCK code', () => {
    const res = translateBackendError('INSUFFICIENT_STOCK');
    expect(res).toBe(
      'Existencias insuficientes: La cantidad solicitada supera el inventario disponible en bodega.'
    );
  });

  it('should translate prefixed INSUFFICIENT_STOCK message from SQL Server / Express', () => {
    const raw =
      'INSUFFICIENT_STOCK: Requested quantity exceeds currently available stock.';
    const res = translateBackendError(raw);
    expect(res).toBe(
      'Existencias insuficientes: La cantidad solicitada supera el inventario disponible en bodega.'
    );
  });

  it('should translate coupon codes into friendly Spanish text', () => {
    expect(translateBackendError('COUPON_NOT_FOUND')).toBe(
      'El código de cupón ingresado no existe o no se encuentra activo.'
    );
    expect(translateBackendError('COUPON_EXPIRED')).toBe(
      'Este cupón promocional ha expirado y ya no se encuentra vigente.'
    );
    expect(translateBackendError('COUPON_MIN_PURCHASE_NOT_MET')).toBe(
      'El subtotal de la compra no alcanza el monto mínimo requerido para este cupón.'
    );
  });

  it('should translate authentication and security errors', () => {
    expect(translateBackendError('INVALID_CREDENTIALS')).toBe(
      'Correo electrónico o contraseña incorrectos.'
    );
    expect(translateBackendError('USER_INACTIVE')).toBe(
      'Tu cuenta ha sido desactivada temporalmente. Comunícate con soporte o administración.'
    );
  });

  it('should fall back cleanly when error is empty or undefined', () => {
    expect(translateBackendError(null)).toBe(
      'Ha ocurrido un error inesperado al procesar la solicitud.'
    );
    expect(translateBackendError('', 'Mensaje por defecto')).toBe(
      'Mensaje por defecto'
    );
  });

  it('should preserve natural Spanish custom messages', () => {
    const custom = 'No se pudo conectar con el servidor central.';
    expect(translateBackendError(custom)).toBe(custom);
  });
});
