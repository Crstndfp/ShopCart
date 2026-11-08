import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  CreditCard,
  Info,
  Loader2,
  LogIn,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { cartApi } from '../api/cart.api.js';
import { HttpError } from '../api/http-client.js';
import { useAuth } from '../context/AuthContext.js';
import { formatGTQ } from '../types/catalog.types.js';
import {
  calculateCartItemCount,
  formatCartItemAttributes,
  type CartData,
  type CartItem,
} from '../types/cart.types.js';

export function CartPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [cartData, setCartData] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingVariantId, setUpdatingVariantId] = useState<number | null>(null);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Fetch Cart from Backend
  // -------------------------------------------------------------
  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await cartApi.getCart();
      setCartData(data);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar los ítems de tu carrito en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  // -------------------------------------------------------------
  // Quantity Modifications (+ / - / delete)
  // -------------------------------------------------------------
  const handleUpdateQuantity = async (item: CartItem, newQty: number) => {
    if (newQty <= 0) {
      await handleRemoveItem(item.IDVariant);
      return;
    }
    if (newQty > item.AvailableStock) {
      return;
    }

    setUpdatingVariantId(item.IDVariant);
    try {
      const updated = await cartApi.updateItemQuantity(item.IDVariant, newQty);
      setCartData(updated);
    } catch (err) {
      console.error('Error updating cart item quantity:', err);
    } finally {
      setUpdatingVariantId(null);
    }
  };

  const handleRemoveItem = async (variantId: number) => {
    setUpdatingVariantId(variantId);
    try {
      const updated = await cartApi.removeItem(variantId);
      setCartData(updated);
    } catch (err) {
      console.error('Error removing item from cart:', err);
    } finally {
      setUpdatingVariantId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('¿Estás seguro de que deseas vaciar todos los productos de tu carrito?')) {
      return;
    }
    setIsClearingCart(true);
    try {
      await cartApi.clearCart();
      await fetchCart();
    } catch (err) {
      console.error('Error clearing cart:', err);
    } finally {
      setIsClearingCart(false);
    }
  };

  // -------------------------------------------------------------
  // Checkout Gate: Verify Authentication before Placing Order
  // -------------------------------------------------------------
  const handleProceedToCheckout = () => {
    // 1. If user is NOT logged in, redirect to login preserving return location
    if (!isAuthenticated || !user) {
      navigate('/login', {
        state: {
          from: '/cart',
          message: 'Inicia sesión con tu cuenta de cliente para completar tu orden de compra.',
        },
      });
      return;
    }

    // 2. If logged in as non-client (Operator / Administrator)
    if (user.role !== 'CLIENT') {
      setOrderNotice(
        `Tu cuenta actual tiene rol '${user.role}'. Solo los usuarios con rol CLIENT pueden realizar compras finales.`
      );
      return;
    }

    // 3. User is an authenticated CLIENT
    setOrderNotice(
      '¡Listo para finalizar! La reserva temporal de stock y selección de dirección de entrega se activarán en el siguiente paso de checkout.'
    );
  };

  const items = cartData?.items || [];
  const cartHeader = cartData?.cart;
  const itemCount = calculateCartItemCount(items);
  const isGuest = !isAuthenticated || !user;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Breadcrumb / Return to Catalog */}
      <div className="mb-4">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a explorar productos
        </Link>
      </div>

      {/* Page Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              RF-04 · CARRITO DE COMPRAS
            </span>
            {isGuest ? (
              <span className="rounded-md border border-amber-400/40 bg-amber-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-300">
                MODO INVITADO
              </span>
            ) : (
              <span className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                CLIENTE: {user.email}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Mi Carrito de Compras
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Revisa tus productos seleccionados, cantidades y el desglose de impuestos antes de iniciar tu orden.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => void handleClearCart()}
            disabled={isClearingCart}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[var(--border-strong)] bg-surface px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-crimson-600/40 hover:text-crimson-600 disabled:opacity-50 sm:self-auto"
          >
            {isClearingCart ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Vaciar Carrito
          </button>
        )}
      </header>

      {/* Guest Notice Banner */}
      {isGuest && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-400/30 bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-brand-400" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Estás navegando en modo invitado
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Tus productos se guardan automáticamente en tu dispositivo. Al iniciar tu orden te pediremos iniciar sesión para procesar tu entrega.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            state={{ from: '/cart' }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 shrink-0"
          >
            <LogIn className="h-3.5 w-3.5" />
            Iniciar Sesión Ahora
          </Link>
        </div>
      )}

      {/* Main Content: Loading / Error / Empty / Cart Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" role="status" aria-busy="true">
          <div className="space-y-4 lg:col-span-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`cart-skel-${i}`}
                className="h-28 w-full rounded-2xl border border-[var(--border-subtle)] bg-surface animate-pulse"
              />
            ))}
          </div>
          <div className="lg:col-span-4">
            <div className="h-64 w-full rounded-2xl border border-[var(--border-subtle)] bg-surface animate-pulse" />
          </div>
          <span className="sr-only">Cargando ítems de tu carrito...</span>
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
        >
          <AlertCircle className="h-10 w-10 text-crimson-600" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            Error al consultar el carrito
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void fetchCart()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400/10 text-brand-400">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            Tu carrito de compras está vacío
          </h2>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
            Explora nuestro catálogo oficial de productos y agrega variantes con disponibilidad inmediata en inventario.
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-hover sm:text-sm"
          >
            <Package className="h-4 w-4" />
            Explorar Catálogo de Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Column 1: Items List (8 cols) */}
          <section className="space-y-4 lg:col-span-8" aria-label="Lista de productos en el carrito">
            <div className="text-xs text-[var(--text-secondary)]">
              Tienes <strong>{itemCount}</strong> unidad(es) de{' '}
              <strong>{items.length}</strong> producto(s) en tu orden
            </div>

            {items.map((item) => {
              const isUpdating = updatingVariantId === item.IDVariant;
              const formattedAttrs = formatCartItemAttributes(item.Attributes);

              return (
                <article
                  key={item.IDCartItem}
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs transition hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  {/* Thumbnail & Product Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-navy-900">
                      {item.MainImageUrl ? (
                        <img
                          src={item.MainImageUrl}
                          alt={item.ProductName}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-brand-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-mono text-[10px] font-bold text-primary">
                        {item.SKU}
                      </span>
                      <h2 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                        {item.ProductName}
                      </h2>
                      {formattedAttrs && (
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                          {formattedAttrs}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {formatGTQ(item.UnitPrice)} <span className="text-[10px] text-[var(--text-muted)]">c/u</span>
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls & Line Total */}
                  <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 sm:border-0 sm:pt-0 sm:gap-6">
                    {/* Stepper Buttons */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas p-1">
                      <button
                        type="button"
                        onClick={() => void handleUpdateQuantity(item, item.Quantity - 1)}
                        disabled={isUpdating}
                        aria-label="Disminuir cantidad"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-[var(--text-primary)] transition hover:bg-elevated disabled:opacity-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="w-8 text-center font-mono text-xs font-bold text-[var(--text-primary)]">
                        {isUpdating ? (
                          <Loader2 className="mx-auto h-3 w-3 animate-spin text-primary" />
                        ) : (
                          item.Quantity
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => void handleUpdateQuantity(item, item.Quantity + 1)}
                        disabled={isUpdating || item.Quantity >= item.AvailableStock}
                        aria-label="Aumentar cantidad"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-[var(--text-primary)] transition hover:bg-elevated disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Subtotal line & delete */}
                    <div className="text-right">
                      <span className="block font-mono text-sm font-extrabold text-[var(--text-primary)]">
                        {formatGTQ(item.LineTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveItem(item.IDVariant)}
                        disabled={isUpdating}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:text-crimson-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Column 2: Order Financial Summary (4 cols) */}
          <aside className="lg:col-span-4" aria-label="Resumen de la orden">
            <div className="sticky top-20 rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Resumen de tu Orden
              </h2>

              {cartHeader && (
                <div className="mt-4 space-y-2.5 border-b border-[var(--border-subtle)] pb-4 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span>Subtotal Neto (Base Imponible)</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {formatGTQ(cartHeader.NetSubtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span>IVA Ley (12% GTQ)</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {formatGTQ(cartHeader.IVATaxAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-sm font-extrabold text-[var(--text-primary)]">
                    <span>Total General</span>
                    <span className="font-mono text-lg text-primary">
                      {formatGTQ(cartHeader.Total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Order Notice or Alert */}
              {orderNotice && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-brand-400/40 bg-brand-950/40 p-3 text-xs text-brand-300"
                >
                  <Info className="h-4 w-4 shrink-0 text-brand-400" />
                  <p>{orderNotice}</p>
                </div>
              )}

              {/* Checkout Gate Action Button */}
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-brand-900 sm:text-sm"
                >
                  {isGuest ? (
                    <>
                      <LogIn className="h-4 w-4" />
                      Iniciar Sesión y Completar Orden
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Proceder al Pago
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  to="/catalog"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  Agregar más productos
                </Link>
              </div>

              {/* Security Seal */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Transacciones protegidas con reserva de stock</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
