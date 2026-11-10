/**
 * Centralized Dictionary & Translation Helper for Backend Error Codes and Messages.
 * Intercepts technical and English API messages from SQL Server / Express and
 * returns user-friendly, localized Spanish explanations.
 */

export const ERROR_TRANSLATIONS: Record<string, string> = {
  // Inventory & Stock
  INSUFFICIENT_STOCK:
    'Existencias insuficientes: La cantidad solicitada supera el inventario disponible en bodega.',
  STOCK_RESERVATION_EXPIRED:
    'La reserva temporal de inventario ha expirado (> 15 minutos). Por favor intente nuevamente.',
  NEGATIVE_STOCK_NOT_ALLOWED:
    'El ajuste solicitado provocaría un saldo negativo de existencias en bodega.',

  // Coupons & Promotions
  COUPON_NOT_FOUND:
    'El código de cupón ingresado no existe o no se encuentra activo.',
  COUPON_EXPIRED:
    'Este cupón promocional ha expirado y ya no se encuentra vigente.',
  COUPON_USAGE_LIMIT_EXCEEDED:
    'Este cupón ha alcanzado el límite máximo de usos permitido.',
  COUPON_MIN_PURCHASE_NOT_MET:
    'El subtotal de la compra no alcanza el monto mínimo requerido para este cupón.',
  COUPON_CATEGORY_RESTRICTED:
    'Este cupón no es aplicable a las categorías de los artículos en tu carrito.',

  // Authentication & Security
  INVALID_CREDENTIALS:
    'Correo electrónico o contraseña incorrectos.',
  USER_INACTIVE:
    'Tu cuenta ha sido desactivada temporalmente. Comunícate con soporte o administración.',
  ACCOUNT_DEACTIVATED:
    'Tu cuenta ha sido desactivada. Comunícate con soporte o administración.',
  EMAIL_ALREADY_EXISTS:
    'Ya existe una cuenta registrada con este correo electrónico.',
  TOKEN_EXPIRED:
    'Tu sesión ha expirado por seguridad. Inicia sesión nuevamente.',
  UNAUTHORIZED:
    'Acceso no autorizado. Inicia sesión para continuar.',
  FORBIDDEN:
    'No tienes los permisos necesarios para realizar esta acción.',

  // Orders & Logistics
  ORDER_NOT_FOUND:
    'La orden solicitada no fue encontrada.',
  INVALID_ORDER_STATUS_TRANSITION:
    'La transición de estado solicitada no es permitida para el pedido.',
  RETURN_QUANTITY_EXCEEDED:
    'La cantidad a devolver excede las unidades vendidas disponibles.',
  IDEMPOTENCY_KEY_REQUIRED:
    'Se requiere una clave de idempotencia para procesar el pago de forma segura.',

  // Cart & Addresses
  CART_EMPTY:
    'Tu carrito de compras está vacío.',
  ADDRESS_NOT_FOUND:
    'La dirección de entrega seleccionada no fue encontrada.',
  ITEM_NOT_IN_CART:
    'El producto no se encuentra en el carrito.',
};

/**
 * Translates any raw error (HttpError, Error, string, or code) into a friendly Spanish message.
 */
export function translateBackendError(
  error: unknown,
  fallbackMessage = 'Ha ocurrido un error inesperado al procesar la solicitud.'
): string {
  if (!error) return fallbackMessage;

  const rawMessage =
    typeof error === 'string'
      ? error
      : (error as { message?: string; error?: string })?.message ||
        (error as { message?: string; error?: string })?.error ||
        '';

  const trimmed = rawMessage.trim();
  if (!trimmed) return fallbackMessage;

  // Direct code match
  if (ERROR_TRANSLATIONS[trimmed]) {
    return ERROR_TRANSLATIONS[trimmed];
  }

  // Prefix match (e.g. "INSUFFICIENT_STOCK: Requested quantity exceeds currently available stock.")
  for (const [code, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (trimmed.startsWith(`${code}:`) || trimmed.startsWith(code)) {
      return translation;
    }
  }

  // Substring semantic matching for SQL Server & Zod error patterns
  const lower = trimmed.toLowerCase();

  if (
    lower.includes('quantity exceeds currently available stock') ||
    lower.includes('insufficient stock')
  ) {
    return 'Existencias insuficientes: La cantidad solicitada supera el inventario disponible en bodega.';
  }

  if (lower.includes('expired') && lower.includes('coupon')) {
    return 'Este cupón promocional ha expirado y ya no se encuentra vigente.';
  }

  if (lower.includes('minimum purchase') || lower.includes('minpurchase')) {
    return 'El monto de tu compra no alcanza el mínimo requerido para este cupón.';
  }

  if (lower.includes('invalid credentials') || lower.includes('contraseña incorrecta')) {
    return 'Correo electrónico o contraseña incorrectos.';
  }

  if (lower.includes('user is inactive') || lower.includes('inactive account')) {
    return 'Tu cuenta ha sido desactivada temporalmente. Comunícate con soporte o administración.';
  }

  if (lower.includes('idempotency')) {
    return 'Se requiere una clave de idempotencia única para procesar la orden.';
  }

  // If already in Spanish or clean custom message, return trimmed message
  return trimmed;
}
