import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { orderApi } from '../api/order.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { formatGTQ } from '../types/catalog.types.js';
import {
  getOrderProgressStep,
  getOrderStatusMeta,
  parseShippingAddressSnapshot,
  type OrderDetailResult,
  type OrderListItem,
} from '../types/order.types.js';

const TRACKING_STEPS = [
  { step: 1, label: 'Pagado', desc: 'Pago confirmado en sistema' },
  { step: 2, label: 'Preparación', desc: 'Empaque en bodega' },
  { step: 3, label: 'Despachado', desc: 'En ruta con transporte' },
  { step: 4, label: 'Entregado', desc: 'Recibido por cliente' },
];

export function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Order Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetailResult | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await orderApi.listOrders({ page, limit });
      setOrders(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar el historial de pedidos en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Open Detail Modal
  const handleOpenDetail = async (idOrder: number) => {
    setSelectedOrderId(idOrder);
    setOrderDetail(null);
    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const detail = await orderApi.getOrderById(idOrder);
      setOrderDetail(detail);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar el detalle de la orden.';
      setDetailError(msg);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              RF-07 · HISTORIAL Y SEGUIMIENTO
            </span>
            <span className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
              CLIENT
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Mis Pedidos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Consulta el estado de entrega, histórico de transiciones y detalle de tus compras realizadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders()}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[var(--border-strong)] bg-surface px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </header>

      {/* Orders List & States */}
      {isLoading ? (
        <div className="space-y-4" role="status" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`order-skel-${i}`}
              className="h-32 w-full rounded-2xl border border-[var(--border-subtle)] bg-surface animate-pulse"
            />
          ))}
          <span className="sr-only">Cargando tus pedidos...</span>
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
        >
          <AlertCircle className="h-10 w-10 text-crimson-600" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            Error al consultar pedidos
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400/10 text-brand-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            No tienes pedidos realizados todavía
          </h2>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
            Explora nuestro catálogo de productos y realiza tu primera compra con reserva garantizada.
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-hover"
          >
            <Package className="h-4 w-4" />
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.Status);
            const formattedDate = new Date(order.CreatedAt).toLocaleDateString('es-GT', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={order.IDOrder}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs transition hover:border-primary/50 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-sm font-extrabold text-primary">
                      {order.OrderNumber}
                    </span>
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <Package className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span>{order.ItemCount} producto(s)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 sm:border-0 sm:pt-0 sm:gap-6">
                  <div className="text-right">
                    <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                      Total Pagado
                    </span>
                    <span className="font-mono text-base font-extrabold text-[var(--text-primary)]">
                      {formatGTQ(order.GrandTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleOpenDetail(order.IDOrder)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver Detalle
                  </button>
                </div>
              </article>
            );
          })}

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <p>
              Mostrando <strong>{orders.length}</strong> de <strong>{total}</strong> pedidos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="font-mono text-xs">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ORDER DETAIL & TRACKING TIMELINE
         ========================================================================= */}
      <ModalDialog
        isOpen={selectedOrderId !== null}
        onClose={handleCloseDetail}
        title={orderDetail ? `Pedido: ${orderDetail.order.OrderNumber}` : 'Detalle de Pedido'}
        subtitle="Consulta el progreso del despacho, productos y desglose fiscal oficial."
      >
        {isLoadingDetail ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
              Consultando trazabilidad y asientos de orden en SQL Server...
            </p>
          </div>
        ) : detailError ? (
          <div role="alert" className="p-4 text-center text-xs text-crimson-600">
            <AlertCircle className="mx-auto h-8 w-8" />
            <p className="mt-2 font-bold">{detailError}</p>
          </div>
        ) : orderDetail ? (
          <div className="space-y-5 text-xs">
            {/* Visual Stepper Timeline */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
              <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)] mb-3">
                Estado del Pedido en Tiempo Real
              </span>

              {(() => {
                const currentStep = getOrderProgressStep(orderDetail.order.Status);
                const isCancelled = orderDetail.order.Status === 'CANCELLED';

                if (isCancelled) {
                  return (
                    <div className="rounded-lg border border-crimson-600/40 bg-crimson-950/40 p-3 text-red-300">
                      <p className="font-bold">Este pedido se encuentra cancelado.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TRACKING_STEPS.map((step) => {
                      const isCompleted = currentStep >= step.step;
                      const isCurrent = currentStep === step.step;

                      return (
                        <div
                          key={step.step}
                          className={`rounded-lg border p-2.5 text-center transition ${
                            isCurrent
                              ? 'border-primary bg-primary/10 shadow-xs'
                              : isCompleted
                              ? 'border-emerald-500/40 bg-emerald-950/30'
                              : 'border-[var(--border-subtle)] opacity-50'
                          }`}
                        >
                          <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-bold font-mono">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              step.step
                            )}
                          </div>
                          <p className="mt-1.5 font-bold text-[var(--text-primary)]">
                            {step.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Shipping Address Snapshot */}
            {(() => {
              const addr = parseShippingAddressSnapshot(
                orderDetail.order.ShippingAddressSnapshot
              );
              if (!addr) return null;

              return (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] mb-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Dirección de Entrega Registrada
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Destinatario: <strong>{addr.RecipientName}</strong>
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    {addr.AddressLine1}
                    {addr.AddressLine2 ? ` (${addr.AddressLine2})` : ''} ·{' '}
                    {addr.Municipality}, {addr.Department}
                  </p>
                  {addr.ContactPhone && (
                    <p className="text-[var(--text-muted)] font-mono text-[11px] mt-0.5">
                      Teléfono: {addr.ContactPhone}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Purchased Items List */}
            <div>
              <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)] mb-1.5">
                Productos Comprados
              </span>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-surface divide-y divide-[var(--border-subtle)]">
                {orderDetail.items.map((item) => (
                  <div
                    key={item.IDOrderItem}
                    className="flex items-center justify-between p-3"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold text-primary">
                        {item.HistoricalSKU}
                      </span>
                      <p className="font-bold text-[var(--text-primary)]">
                        {item.HistoricalProductName}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">
                        {formatGTQ(item.UnitPrice)} x {item.QuantitySold} unidad(es)
                        {item.QuantityReturned > 0 && (
                          <span className="ml-2 text-crimson-600 font-bold">
                            ({item.QuantityReturned} devueltas)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-mono font-extrabold text-[var(--text-primary)]">
                      {formatGTQ(item.LineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-surface p-3.5 space-y-1.5">
              {orderDetail.order.DiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Descuento de Cupón ({orderDetail.order.CouponCode})</span>
                  <span className="font-mono">
                    -{formatGTQ(orderDetail.order.DiscountTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Base Imponible (Subtotal Neto)</span>
                <span className="font-mono">{formatGTQ(orderDetail.order.NetSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>IVA Ley (12% GTQ)</span>
                <span className="font-mono">{formatGTQ(orderDetail.order.IVATaxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 text-sm font-extrabold text-[var(--text-primary)]">
                <span>Total Pagado</span>
                <span className="font-mono text-primary">
                  {formatGTQ(orderDetail.order.GrandTotal)}
                </span>
              </div>
            </div>

            {/* Status Transition History Log */}
            {orderDetail.history.length > 0 && (
              <div>
                <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)] mb-1.5">
                  Bitácora de Trazabilidad y Comentarios de Operación
                </span>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                  {orderDetail.history.map((h) => (
                    <div key={h.IDOrderStatusHistory} className="p-2.5">
                      <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span>
                          {new Date(h.ChangedAt).toLocaleString('es-GT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {h.NewStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-[var(--text-secondary)] font-sans text-xs">
                        {h.Reason || 'Sin motivo adicional.'}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Operador: {h.ChangedByUserName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
