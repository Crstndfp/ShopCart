export type UserRole = 'CLIENT' | 'OPERATOR' | 'ADMINISTRATOR';

export interface AuthUser {
  idUser: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface ApiSuccessResponse<T> {
  statusCode: number;
  data: T;
  message?: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  statusCode: number;
  error: string;
  message: string;
  details?: ValidationIssue[] | Record<string, unknown> | null;
  timestamp?: string;
  path?: string;
}

export interface NavItemConfig {
  label: string;
  path: string;
  roles: readonly UserRole[];
  description: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  OPERATOR: 'Operador',
  ADMINISTRATOR: 'Administrador',
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  CLIENT: 'border-brand-400/40 bg-brand-900/60 text-brand-400',
  OPERATOR: 'border-amber-400/40 bg-amber-950/60 text-amber-300',
  ADMINISTRATOR: 'border-emerald-400/40 bg-emerald-950/60 text-emerald-300',
};

export const NAVIGATION_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Catálogo',
    path: '/catalog',
    roles: ['CLIENT', 'ADMINISTRATOR'],
    description: 'Búsqueda y exploración de productos, precios vigentes y disponibilidad en tiempo real',
  },
  {
    label: 'Mi Carrito',
    path: '/cart',
    roles: ['CLIENT'],
    description: 'Gestión de productos en carrito, aplicación de cupones y proceso de checkout con reserva',
  },
  {
    label: 'Mis Pedidos',
    path: '/my-orders',
    roles: ['CLIENT'],
    description: 'Historial de compras, seguimiento de estado y solicitud de devoluciones',
  },
  {
    label: 'Mis Direcciones',
    path: '/addresses',
    roles: ['CLIENT'],
    description: 'Libreta de direcciones de entrega para pedidos',
  },
  {
    label: 'Gestión de Pedidos',
    path: '/orders-management',
    roles: ['OPERATOR', 'ADMINISTRATOR'],
    description: 'Flujo operativo de preparación, despacho con guía, entrega, cancelación y devoluciones',
  },
  {
    label: 'Inventario y Kardex',
    path: '/inventory',
    roles: ['OPERATOR', 'ADMINISTRATOR'],
    description: 'Existencias físicas, reservas activas, entradas/ajustes de stock y libro mayor Kardex',
  },
  {
    label: 'Catálogo Admin',
    path: '/admin/catalog',
    roles: ['ADMINISTRATOR'],
    description: 'Administración de categorías, productos, variantes por SKU y programación de precios',
  },
  {
    label: 'Cupones',
    path: '/admin/coupons',
    roles: ['ADMINISTRATOR'],
    description: 'Creación y control de cupones promocionales porcentuales o de monto fijo',
  },
  {
    label: 'Usuarios',
    path: '/admin/users',
    roles: ['ADMINISTRATOR'],
    description: 'Gestión de cuentas de Operadores, Administradores y Clientes',
  },
  {
    label: 'Reportes y Dashboard',
    path: '/admin/reports',
    roles: ['ADMINISTRATOR'],
    description: 'Ventas por período, top productos, valoración de inventario, cupones y carritos abandonados',
  },
  {
    label: 'Auditoría y Config',
    path: '/admin/audit',
    roles: ['ADMINISTRATOR'],
    description: 'Bitácora inmutable de cambios JSON y parámetros globales del sistema',
  },
  {
    label: 'Sistema de Diseño',
    path: '/design-system',
    roles: ['CLIENT', 'OPERATOR', 'ADMINISTRATOR'],
    description: 'Paleta oficial extraída de la portada Tech Challenge 360',
  },
];

export interface DemoAccountPreset {
  role: UserRole;
  label: string;
  email: string;
  password: string;
  description: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccountPreset[] = [
  {
    role: 'CLIENT',
    label: 'Cliente Demo',
    email: 'cliente@shopcart.gt',
    password: 'Password123!',
    description: 'Compra, gestiona carrito, direcciones y consulta sus propios pedidos',
  },
  {
    role: 'OPERATOR',
    label: 'Operador Bodega',
    email: 'operator@shopcart.gt',
    password: 'Password123!',
    description: 'Prepara/despacha pedidos y ejecuta movimientos de inventario y Kardex',
  },
  {
    role: 'ADMINISTRATOR',
    label: 'Administrador',
    email: 'admin@shopcart.gt',
    password: 'Password123!',
    description: 'Control total: catálogo, precios, cupones, usuarios, reportes y auditoría',
  },
];

export function hasAllowedRole(
  userRole: UserRole | undefined | null,
  allowedRoles: readonly UserRole[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function getNavItemsForRole(userRole: UserRole | undefined | null): NavItemConfig[] {
  if (!userRole) {
    return NAVIGATION_ITEMS.filter((item) => item.path === '/catalog' || item.path === '/cart');
  }
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));
}

export function getDefaultRouteForRole(userRole: UserRole | undefined | null): string {
  switch (userRole) {
    case 'ADMINISTRATOR':
      return '/admin/reports';
    case 'OPERATOR':
      return '/orders-management';
    case 'CLIENT':
    default:
      return '/catalog';
  }
}

export interface PasswordValidationChecks {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordValidationChecks {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

  return {
    minLength,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
    isValid: minLength && hasUppercase && hasNumber && hasSpecialChar,
  };
}
