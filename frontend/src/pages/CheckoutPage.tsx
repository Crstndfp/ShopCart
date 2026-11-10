import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { addressApi } from '../api/address.api.js';
import { cartApi } from '../api/cart.api.js';
import { couponApi } from '../api/coupon.api.js';
import { orderApi } from '../api/order.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { PhoneInputWithCountry } from '../components/ui/PhoneInputWithCountry.js';
import { translateBackendError } from '../utils/i18n-errors.js';
import { formatGTQ } from '../types/catalog.types.js';
import { formatAddressSummary, type AddressRecord, type CreateAddressPayload } from '../types/address.types.js';
import type { CartData } from '../types/cart.types.js';
import {
  formatCouponStatusMessage,
  type CouponValidationResult,
} from '../types/coupon.types.js';
import type { OrderDetailResult } from '../types/order.types.js';

export function CheckoutPage() {
  const location = useLocation();

  const [cartData, setCartData] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // RF-05: Coupon States
  const [couponCode, setCouponCode] = useState<string>(
    (location.state as { couponCode?: string } | null)?.couponCode || ''
  );
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  // Payment Method Simulation
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'COD'>('CARD');

  // Order Submission & Result States
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDetailResult | null>(null);

  // Address Modal State (for quick address adding without leaving checkout)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Quick Address Form Fields
  const [newAlias, setNewAlias] = useState('Casa');
  const [newRecipient, setNewRecipient] = useState('');
  const [newLine1, setNewLine1] = useState('');
  const [newLine2, setNewLine2] = useState('');
  const [newMunicipality, setNewMunicipality] = useState('Guatemala');
  const [newDepartment, setNewDepartment] = useState('Guatemala');
  const [newPostalCode, setNewPostalCode] = useState('01010');
  const [newPhone, setNewPhone] = useState('');

  // -------------------------------------------------------------
  // Load Cart & Addresses
  // -------------------------------------------------------------
  const loadCheckoutData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [cart, addrList] = await Promise.all([
        cartApi.getCart(),
        addressApi.listAddresses(),
      ]);

      setCartData(cart);
      setAddresses(addrList || []);

      if (addrList && addrList.length > 0) {
        setSelectedAddressId(addrList[0].IDAddress);
      }

      // If a coupon code was passed in location.state, validate it automatically
      const initialCoupon = (location.state as { couponCode?: string } | null)?.couponCode;
      if (initialCoupon && cart.cart.GrossSubtotal > 0) {
        try {
          const result = await couponApi.validateCoupon(
            initialCoupon,
            cart.cart.GrossSubtotal
          );
          if (result.validationStatus === 'VALID') {
            setAppliedCoupon(result);
          }
        } catch {
          // Ignore automatic validation error
        }
      }
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al inicializar la pantalla de checkout.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    void loadCheckoutData();
  }, [loadCheckoutData]);

  // -------------------------------------------------------------
  // Apply / Remove Coupon
  // -------------------------------------------------------------
  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || !cartData?.cart) return;

    setIsApplyingCoupon(true);
    setCouponFeedback(null);
    try {
      const result = await couponApi.validateCoupon(
        couponCode.trim(),
        cartData.cart.GrossSubtotal
      );

      if (result.validationStatus === 'VALID') {
        setAppliedCoupon(result);
        setCouponFeedback({
          message: `¡Cupón '${result.code}' aplicado exitosamente!`,
          isError: false,
        });
      } else {
        const status = formatCouponStatusMessage(result.validationStatus);
        setAppliedCoupon(null);
        setCouponFeedback({ message: status.message, isError: true });
      }
    } catch (err) {
      const msg = err instanceof HttpError ? err.message : 'Error al validar cupón.';
      setAppliedCoupon(null);
      setCouponFeedback({ message: msg, isError: true });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponFeedback(null);
    setCouponCode('');
  };

  // -------------------------------------------------------------
  // Quick Address Creation Modal
  // -------------------------------------------------------------
  const handleOpenAddressModal = () => {
    setNewAlias('Casa');
    setNewRecipient('');
    setNewLine1('');
    setNewLine2('');
    setNewMunicipality('Guatemala');
    setNewDepartment('Guatemala');
    setNewPostalCode('01010');
    setNewPhone('');
    setModalFeedback(null);
    setIsAddressModalOpen(true);
  };

  const handleCloseAddressModal = () => {
    if (isSubmittingAddress) return;
    setIsAddressModalOpen(false);
  };

  const handleCreateAddress = async (e: FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    if (newPhone.trim().replace(/\D/g, '').length < 8) {
      setModalFeedback('El teléfono de contacto debe tener al menos 8 dígitos.');
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const payload: CreateAddressPayload = {
        alias: newAlias.trim(),
        recipientName: newRecipient.trim(),
        addressLine1: newLine1.trim(),
        addressLine2: newLine2.trim() || null,
        municipality: newMunicipality.trim(),
        department: newDepartment.trim(),
        postalCode: newPostalCode.trim() || null,
        contactPhone: newPhone.trim(),
      };

      const res = await addressApi.createAddress(payload);
      const updatedList = await addressApi.listAddresses();
      setAddresses(updatedList);
      setSelectedAddressId(res.idAddress);
      handleCloseAddressModal();
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.message : 'Error al guardar la dirección.';
      setModalFeedback(msg);
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  // -------------------------------------------------------------
  // Final Checkout Submission (Atomic with Idempotency-Key)
  // -------------------------------------------------------------
  const handleFinalCheckout = async () => {
    if (!selectedAddressId) {
      setOrderError('Por favor selecciona una dirección de entrega válida.');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    // Mandatory idempotency key generation to prevent duplicated charges/orders
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const result = await orderApi.checkout(
        {
          idDeliveryAddress: selectedAddressId,
          couponCode: appliedCoupon?.code ?? null,
        },
        idempotencyKey
      );

      setCompletedOrder(result);
    } catch (err) {
      const msg = translateBackendError(
        err,
        'Error al procesar la orden en SQL Server. Verifica la disponibilidad de stock.'
      );
      setOrderError(msg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const cartHeader = cartData?.cart;
  const items = cartData?.items || [];

  // Recalculations with coupon
  const discountAmount = appliedCoupon?.calculatedDiscount ?? 0;
  const grossSubtotal = cartHeader?.GrossSubtotal ?? 0;
  const finalTotal = Math.max(0, (cartHeader?.Total ?? 0) - discountAmount);
  const finalNet = Number((finalTotal / 1.12).toFixed(2));
  const finalIva = Number((finalTotal - finalNet).toFixed(2));

  // -------------------------------------------------------------
  // VIEW: ORDER SUCCESS SCREEN
  // -------------------------------------------------------------
  if (completedOrder) {
    const { order, items: orderItems } = completedOrder;

    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-2xl border border-emerald-500/40 bg-surface p-6 shadow-md sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <span className="mt-4 inline-flex rounded-md border border-emerald-500/40 bg-emerald-950/80 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
              ORDEN CONFIRMADA · {order.Status}
            </span>
            <h1 className="mt-3 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
              ¡Gracias por tu compra!
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Tu pedido ha sido procesado y el stock ha sido reservado exitosamente en bodega.
            </p>
          </div>

          {/* Receipt Details Card */}
          <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-canvas p-5 text-xs sm:p-6">
            <div className="grid grid-cols-1 gap-4 border-b border-[var(--border-subtle)] pb-4 sm:grid-cols-3">
              <div>
                <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                  Número de Orden
                </span>
                <span className="font-mono text-sm font-extrabold text-primary">
                  {order.OrderNumber}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                  Fecha y Hora
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {new Date(order.CreatedAt).toLocaleString('es-GT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                  Cliente
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {order.CustomerName}
                </span>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="mt-4">
              <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                Productos Adquiridos
              </span>
              <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                {orderItems.map((item) => (
                  <li
                    key={item.IDOrderItem}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-primary mr-2">
                        {item.HistoricalSKU}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {item.HistoricalProductName}
                      </span>
                      <span className="ml-2 text-[var(--text-muted)] font-mono">
                        x{item.QuantitySold}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {formatGTQ(item.LineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Financial Breakdown */}
            <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-4 text-right">
              {order.DiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Descuento Promocional ({order.CouponCode})</span>
                  <span className="font-mono font-bold">-{formatGTQ(order.DiscountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Base Imponible (Subtotal Neto)</span>
                <span className="font-mono">{formatGTQ(order.NetSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>IVA Ley (12% GTQ)</span>
                <span className="font-mono">{formatGTQ(order.IVATaxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 text-sm font-extrabold text-[var(--text-primary)]">
                <span>Total Pagado</span>
                <span className="font-mono text-base text-primary">
                  {formatGTQ(order.GrandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Post-Checkout Actions */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/my-orders"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-brand-900 sm:w-auto sm:text-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              Ver en Mis Pedidos
            </Link>
            <Link
              to="/catalog"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-surface px-5 py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:w-auto"
            >
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: CHECKOUT FORM SCREEN
  // -------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-4">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al carrito de compras
        </Link>
      </div>

      <header className="mb-6 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
            RF-06 · CHECKOUT CON RESERVA DE STOCK
          </span>
          <span className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
            TRANSACCIÓN PROTEGIDA
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Finalizar Pedido
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Selecciona tu dirección de entrega, confirma tu cupón y procesa tu orden de forma segura.
        </p>
      </header>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center" role="status" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
            Cargando datos de checkout y libreta de direcciones...
          </p>
        </div>
      ) : errorMessage ? (
        <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center">
          <AlertCircle className="h-10 w-10 text-crimson-600" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            Error al preparar el checkout
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadCheckoutData()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
          <Package className="h-10 w-10 text-[var(--text-muted)]" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            No tienes productos activos en tu carrito
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Agrega productos desde el catálogo antes de proceder a la pantalla de checkout.
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
          >
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Checkout Columns: Steps (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Step 1: Delivery Address Selection */}
            <section
              aria-labelledby="step-address-heading"
              className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-white">
                    1
                  </div>
                  <h2 id="step-address-heading" className="text-base font-bold text-[var(--text-primary)]">
                    Dirección de Entrega
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddressModal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva Dirección
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] p-6 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
                  <p className="mt-2 text-xs font-semibold text-[var(--text-primary)]">
                    No tienes direcciones guardadas
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Agrega una dirección para continuar con la entrega de tu orden.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddressModal}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar Dirección
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.IDAddress;

                    return (
                      <label
                        key={addr.IDAddress}
                        className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-xs transition ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-[var(--border-subtle)] bg-canvas hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              {addr.Alias}
                            </span>
                            <input
                              type="radio"
                              name="selectedAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(addr.IDAddress)}
                              className="h-4 w-4 text-primary focus:ring-primary"
                            />
                          </div>
                          <p className="mt-1 font-semibold text-[var(--text-primary)]">
                            {addr.RecipientName}
                          </p>
                          <p className="mt-0.5 text-[var(--text-secondary)]">
                            {formatAddressSummary(addr)}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                            Tel: {addr.ContactPhone}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 2: Payment Method Simulation */}
            <section
              aria-labelledby="step-payment-heading"
              className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs sm:p-6"
            >
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-white">
                  2
                </div>
                <h2 id="step-payment-heading" className="text-base font-bold text-[var(--text-primary)]">
                  Método de Pago
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-xs transition ${
                    paymentMethod === 'CARD'
                      ? 'border-primary bg-primary/5'
                      : 'border-[var(--border-subtle)] bg-canvas hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'CARD'}
                    onChange={() => setPaymentMethod('CARD')}
                    className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Tarjeta de Crédito / Débito
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Transacción cifrada con confirmación de pago instantáneo (Simulado).
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-xs transition ${
                    paymentMethod === 'COD'
                      ? 'border-primary bg-primary/5'
                      : 'border-[var(--border-subtle)] bg-canvas hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                      <Truck className="h-4 w-4 text-primary" />
                      Pago Contra Entrega
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      Pagas en efectivo o POS al momento de recibir el paquete.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
                <Lock className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Reserva atómica: los productos se descuentan de las existencias disponibles inmediatamente en SQL Server.
                </span>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary & Confirmation (4 cols) */}
          <aside className="lg:col-span-4" aria-label="Resumen financiero de la orden">
            <div className="sticky top-20 rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Resumen de la Compra
              </h2>

              {/* Items Preview */}
              <div className="mt-4 max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] pb-3 text-xs">
                {items.map((item) => (
                  <div key={item.IDCartItem} className="flex items-center justify-between py-2">
                    <div className="truncate pr-2">
                      <span className="font-mono text-[10px] text-primary">{item.SKU}</span>
                      <p className="truncate font-semibold text-[var(--text-primary)]">
                        {item.ProductName}
                      </p>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        Cantidad: {item.Quantity}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[var(--text-primary)] shrink-0">
                      {formatGTQ(item.LineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Box */}
              <div className="mt-4 border-b border-[var(--border-subtle)] pb-4 text-xs">
                <label htmlFor="chk-coupon" className="block font-semibold text-[var(--text-primary)]">
                  Cupón de Descuento
                </label>
                {appliedCoupon ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2 text-xs text-emerald-300">
                    <div className="flex items-center gap-1.5 font-mono font-bold">
                      <Tag className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{appliedCoupon.code}</span>
                      <span className="font-normal text-[11px]">
                        (-{formatGTQ(appliedCoupon.calculatedDiscount)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="rounded-md p-1 hover:bg-emerald-900/60"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="mt-2 flex gap-2">
                    <input
                      id="chk-coupon"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO (EJ. BIENVENIDA10)"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-1.5 font-mono text-xs uppercase text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="rounded-xl bg-brand-600 px-3 py-1.5 font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50"
                    >
                      {isApplyingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aplicar'}
                    </button>
                  </form>
                )}

                {couponFeedback && (
                  <p
                    className={`mt-1.5 text-[11px] font-semibold ${
                      couponFeedback.isError ? 'text-crimson-600' : 'text-emerald-400'
                    }`}
                  >
                    {couponFeedback.message}
                  </p>
                )}
              </div>

              {/* Financial Totals */}
              <div className="mt-4 space-y-2 border-b border-[var(--border-subtle)] pb-4 text-xs">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal Bruto</span>
                  <span className="font-mono">{formatGTQ(grossSubtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento ({appliedCoupon?.code})</span>
                    <span className="font-mono font-bold">-{formatGTQ(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal Neto (Base Imponible)</span>
                  <span className="font-mono">{formatGTQ(finalNet)}</span>
                </div>

                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>IVA Ley (12% GTQ)</span>
                  <span className="font-mono">{formatGTQ(finalIva)}</span>
                </div>

                <div className="flex justify-between border-t border-[var(--border-subtle)] pt-3 text-sm font-extrabold text-[var(--text-primary)]">
                  <span>Total General</span>
                  <span className="font-mono text-lg text-primary">{formatGTQ(finalTotal)}</span>
                </div>
              </div>

              {/* Error Message */}
              {orderError && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-crimson-600/40 bg-crimson-950/40 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                  <p>{orderError}</p>
                </div>
              )}

              {/* Confirm & Checkout Button */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={handleFinalCheckout}
                  disabled={isSubmittingOrder || !selectedAddressId || items.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando Orden con SQL Server...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Confirmar y Pagar ({formatGTQ(finalTotal)})
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Garantía de idempotencia y reserva protegida</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================================
          MODAL: QUICK ADD DELIVERY ADDRESS
         ========================================================================= */}
      <ModalDialog
        isOpen={isAddressModalOpen}
        onClose={handleCloseAddressModal}
        title="Registrar Dirección de Entrega"
        subtitle="Ingresa el destino para la entrega de este pedido."
      >
        <form onSubmit={handleCreateAddress} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="chk-alias" className="block font-semibold text-[var(--text-primary)]">
                Alias (Ej. Casa, Trabajo)
              </label>
              <input
                id="chk-alias"
                type="text"
                required
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="chk-recip" className="block font-semibold text-[var(--text-primary)]">
                Nombre de Quien Recibe
              </label>
              <input
                id="chk-recip"
                type="text"
                required
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chk-line1" className="block font-semibold text-[var(--text-primary)]">
              Dirección Línea 1 (Calle, Avenida, Zona)
            </label>
            <input
              id="chk-line1"
              type="text"
              required
              value={newLine1}
              onChange={(e) => setNewLine1(e.target.value)}
              placeholder="10 Avenida 4-22 Zona 14"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="chk-line2" className="block font-semibold text-[var(--text-primary)]">
              Dirección Línea 2 (Opcional: Apto, Nivel)
            </label>
            <input
              id="chk-line2"
              type="text"
              value={newLine2}
              onChange={(e) => setNewLine2(e.target.value)}
              placeholder="Nivel 3, Apto 302"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="chk-muni" className="block font-semibold text-[var(--text-primary)]">
                Municipio
              </label>
              <input
                id="chk-muni"
                type="text"
                required
                value={newMunicipality}
                onChange={(e) => setNewMunicipality(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="chk-dept" className="block font-semibold text-[var(--text-primary)]">
                Departamento
              </label>
              <input
                id="chk-dept"
                type="text"
                required
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label htmlFor="chk-post" className="block font-semibold text-[var(--text-primary)]">
                Código Postal
              </label>
              <input
                id="chk-post"
                type="text"
                value={newPostalCode}
                onChange={(e) => setNewPostalCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chk-phone" className="block font-semibold text-[var(--text-primary)]">
              Teléfono de Contacto (Código y 8 dígitos)
            </label>
            <div className="mt-1">
              <PhoneInputWithCountry
                id="chk-phone"
                value={newPhone}
                onChange={setNewPhone}
                required
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Seleccione el código de país e ingrese los 8 dígitos correspondientes.
            </p>
          </div>

          {modalFeedback && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-crimson-600/40 bg-crimson-950/40 p-2.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
              <p>{modalFeedback}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3.5">
            <button
              type="button"
              onClick={handleCloseAddressModal}
              disabled={isSubmittingAddress}
              className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingAddress}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:opacity-50"
            >
              {isSubmittingAddress ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar y Seleccionar'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
