export interface UserRecord {
  IDUser: number;
  IDRole: number;
  RoleCode: 'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT' | string;
  RoleName: string;
  FullName: string;
  Email: string;
  PhoneNumber: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface UserListResponse {
  statusCode: number;
  items: UserRecord[];
  total: number;
}

export interface UserQueryFilters {
  page?: number;
  limit?: number;
  role?: 'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT';
  q?: string;
  isActive?: boolean;
}

export interface CreateUserAdminPayload {
  fullName: string;
  email: string;
  password: string;
  roleCode: 'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT';
  phoneNumber?: string;
}

export interface UpdateUserRolePayload {
  roleCode: 'ADMINISTRATOR' | 'OPERATOR' | 'CLIENT';
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
  reason?: string;
}

export interface RoleMeta {
  label: string;
  badgeClass: string;
}

export const ROLE_META: Record<string, RoleMeta> = {
  ADMINISTRATOR: {
    label: 'Administrador',
    badgeClass: 'border-purple-500/40 bg-purple-950/80 text-purple-300',
  },
  OPERATOR: {
    label: 'Operador Logístico',
    badgeClass: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
  },
  CLIENT: {
    label: 'Cliente',
    badgeClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
  },
};

export function getRoleMeta(roleCode: string): RoleMeta {
  return (
    ROLE_META[roleCode] || {
      label: roleCode,
      badgeClass: 'border-slate-500/40 bg-slate-900/80 text-slate-300',
    }
  );
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial (!@#$%...)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
