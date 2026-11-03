import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createUserAdminSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userQuerySchema,
} from './user.dto.js';

describe('User DTOs', () => {
  describe('createUserAdminSchema', () => {
    it('should validate a complete valid operator user', () => {
      const input = {
        fullName: 'Carlos Operador Bodega',
        email: 'carlos.bodega@shopcart.gt',
        password: 'Password123!',
        roleCode: 'OPERATOR',
        phoneNumber: '+502 2222-3333',
      };
      const parsed = createUserAdminSchema.parse(input);
      assert.equal(parsed.email, 'carlos.bodega@shopcart.gt');
      assert.equal(parsed.roleCode, 'OPERATOR');
    });

    it('should validate an administrator user creation', () => {
      const input = {
        fullName: 'Super Administrador',
        email: 'superadmin@shopcart.gt',
        password: 'Password123!',
        roleCode: 'ADMINISTRATOR',
      };
      const parsed = createUserAdminSchema.parse(input);
      assert.equal(parsed.roleCode, 'ADMINISTRATOR');
    });

    it('should reject invalid roleCode', () => {
      assert.throws(() => {
        createUserAdminSchema.parse({
          fullName: 'Usuario Desconocido',
          email: 'user@shopcart.gt',
          password: 'Password123!',
          roleCode: 'SUPER_ROOT_ROLE',
        });
      });
    });

    it('should reject weak password without numbers or special chars', () => {
      assert.throws(() => {
        createUserAdminSchema.parse({
          fullName: 'Usuario Password Debil',
          email: 'debil@shopcart.gt',
          password: 'password',
          roleCode: 'OPERATOR',
        });
      });
    });

    it('should reject invalid email format', () => {
      assert.throws(() => {
        createUserAdminSchema.parse({
          fullName: 'Usuario Email Invalido',
          email: 'not-an-email',
          password: 'Password123!',
          roleCode: 'CLIENT',
        });
      });
    });
  });

  describe('updateUserRoleSchema', () => {
    it('should accept valid role transitions', () => {
      const parsed = updateUserRoleSchema.parse({ roleCode: 'OPERATOR' });
      assert.equal(parsed.roleCode, 'OPERATOR');
    });

    it('should reject unsupported role codes', () => {
      assert.throws(() => {
        updateUserRoleSchema.parse({ roleCode: 'ANONYMOUS_HACKER' });
      });
    });
  });

  describe('updateUserStatusSchema', () => {
    it('should validate deactivation with reason', () => {
      const parsed = updateUserStatusSchema.parse({
        isActive: false,
        reason: 'Temporary suspension for audit investigation',
      });
      assert.equal(parsed.isActive, false);
      assert.equal(parsed.reason, 'Temporary suspension for audit investigation');
    });

    it('should validate activation without reason', () => {
      const parsed = updateUserStatusSchema.parse({
        isActive: true,
      });
      assert.equal(parsed.isActive, true);
    });

    it('should reject non-boolean isActive', () => {
      assert.throws(() => {
        updateUserStatusSchema.parse({
          isActive: 'not-a-boolean',
        });
      });
    });
  });

  describe('userQuerySchema', () => {
    it('should parse pagination and role filters', () => {
      const parsed = userQuerySchema.parse({
        page: '2',
        limit: '15',
        role: 'OPERATOR',
        q: 'bodega',
        isActive: 'true',
      });
      assert.equal(parsed.page, 2);
      assert.equal(parsed.limit, 15);
      assert.equal(parsed.role, 'OPERATOR');
      assert.equal(parsed.q, 'bodega');
      assert.equal(parsed.isActive, true);
    });
  });
});
