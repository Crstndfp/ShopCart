import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAddressSchema } from './address.dto.js';

describe('Address DTOs', () => {
  it('should validate complete delivery address', () => {
    const input = {
      alias: 'Casa',
      recipientName: 'Carlos Flores',
      addressLine1: 'Km 14.5 Carretera a El Salvador',
      addressLine2: 'Condominio Las Luces Casa 12',
      municipality: 'Santa Catarina Pinula',
      department: 'Guatemala',
      postalCode: '01051',
      contactPhone: '50212345678',
    };
    const parsed = createAddressSchema.parse(input);
    assert.equal(parsed.alias, 'Casa');
    assert.equal(parsed.recipientName, 'Carlos Flores');
    assert.equal(parsed.department, 'Guatemala');
  });

  it('should reject short alias or short recipient name', () => {
    assert.throws(() => {
      createAddressSchema.parse({
        alias: 'A',
        recipientName: 'Jo',
        addressLine1: 'Short',
        municipality: 'Gua',
        department: 'Gua',
        contactPhone: '123',
      });
    });
  });
});
