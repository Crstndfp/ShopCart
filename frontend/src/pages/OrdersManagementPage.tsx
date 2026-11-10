import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  History,
  Info,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { orderApi } from '../api/order.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { formatGTQ } from '../types/catalog.types.js';
import {
  getAvailableReturnQuantity,
  getOrderProgressStep,
  getOrderStatusMeta,
  parseShippingAddressSnapshot,
  type AdvanceOrderStatusPayload,
  type OrderDetailResult,
  type OrderListItem,
  type ProcessReturnPayload,
} from '../types/order.types.js';

const TRACKING_STEPS = [
  { step: 1, label: 'Pagado', desc: 'Pago confirmado' },
  { step: 2, label: 'Preparación', desc: 'Empaque en bodega' },
  { step: 3, label: 'Despachado', desc: 'En ruta con transporte' },
  { step: 4, label: 'Entregado', desc: 'Recibido por cliente' },
];

export function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Order for Operational Management Modal
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetailResult | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'transition' | 'return' | 'history'>('info');

  // Transition Action Form State
  const [targetStatus, setTargetStatus] = useState<AdvanceOrderStatusPayload['status'] | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);
  const [transitionSuccessMessage, setTransitionSuccessMessage] = useState<string | null>(null);
  const [transitionErrorMessage, setTransitionErrorMessage] = useState<string | null>(null);

  // Return Processing Form State
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnReason, setReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccessMessage, setReturnSuccessMessage] = useState<string | null>(null);
  const [returnErrorMessage, setReturnErrorMessage] = useState<string | null>(null);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await orderApi.listOrders({
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setOrders(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar la lista operativa de pedidos en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Load Order Detail into Modal
  const handleOpenManageModal = async (idOrder: number) => {
    setSelectedOrderId(idOrder);
    setOrderDetail(null);
    setIsLoadingDetail(true);
    setDetailError(null);
    setActiveTab('info');
    setTargetStatus(null);
    setTransitionReason('');
    setTransitionSuccessMessage(null);
    setTransitionErrorMessage(null);
    setSelectedItemId('');
    setReturnQuantity(1);
    setReturnReason('');
    setReturnSuccessMessage(null);
    setReturnErrorMessage(null);

    try {
      const detail = await orderApi.getOrderById(idOrder);
      setOrderDetail(detail);
      // Auto-select first eligible return item if any
      const eligibleItem = (detail.items ?? []).find((i) => getAvailableReturnQuantity(i) > 0);
      if (eligibleItem) {
        setSelectedItemId(eligibleItem.IDOrderItem);
        setReturnQuantity(1);
      }
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

  const handleCloseModal = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  };

  // Submit Status Transition
  const handleAdvanceStatus = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderDetail || !targetStatus) return;

    if (targetStatus === 'CANCELLED' && transitionReason.trim().length < 3) {
      setTransitionErrorMessage('Para cancelar el pedido se requiere un motivo explícito (mínimo 3 caracteres).');
      return;
    }

    setIsSubmittingTransition(true);
    setTransitionErrorMessage(null);
    setTransitionSuccessMessage(null);

    try {
      const updated = await orderApi.advanceStatus(orderDetail.order.IDOrder, {
        status: targetStatus,
        reason: transitionReason.trim() || undefined,
      });
      if (updated && updated.order && Array.isArray(updated.items)) {
        setOrderDetail(updated);
      } else {
        const fresh = await orderApi.getOrderById(orderDetail.order.IDOrder);
        setOrderDetail(fresh);
      }
      setTransitionSuccessMessage(
        `Estado actualizado exitosamente a: ${getOrderStatusMeta(targetStatus).label}`
      );
      setTargetStatus(null);
      setTransitionReason('');
      void fetchOrders();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al avanzar el estado del pedido.';
      setTransitionErrorMessage(msg);
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  // Submit Return Processing
  const handleProcessReturn = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderDetail || typeof selectedItemId !== 'number') return;

    const chosenItem = (orderDetail.items ?? []).find((i) => i.IDOrderItem === selectedItemId);
    if (!chosenItem) {
      setReturnErrorMessage('Seleccione un artículo válido de la orden.');
      return;
    }

    const available = getAvailableReturnQuantity(chosenItem);
    if (returnQuantity < 1 || returnQuantity > available) {
      setReturnErrorMessage(
        `La cantidad a devolver debe estar entre 1 y ${available} unidades.`
      );
      return;
    }

    if (returnReason.trim().length < 3) {
      setReturnErrorMessage('El motivo de devolución debe tener al menos 3 caracteres.');
      return;
    }

    setIsSubmittingReturn(true);
    setReturnErrorMessage(null);
    setReturnSuccessMessage(null);

    const payload: ProcessReturnPayload = {
      idOrderItem: selectedItemId,
      quantity: returnQuantity,
      reason: returnReason.trim(),
    };

    try {
      const updated = await orderApi.processReturn(orderDetail.order.IDOrder, payload);
      // Defensive guarantee: Ensure full order structure or re-fetch cleanly
      let freshDetail = updated;
      if (!freshDetail || !freshDetail.order || !Array.isArray(freshDetail.items)) {
        freshDetail = await orderApi.getOrderById(orderDetail.order.IDOrder);
      }
      setOrderDetail(freshDetail);
      setReturnSuccessMessage(
        `Devolución registrada exitosamente. Las ${payload.quantity} unidades fueron reintegradas al inventario físico con asiento Kardez CLIENT_RETURN.`
      );
      setReturnReason('');
      // Refresh selected item & available quantity
      const refreshedItem = (freshDetail.items ?? []).find((i) => i.IDOrderItem === selectedItemId);
      if (refreshedItem && getAvailableReturnQuantity(refreshedItem) > 0) {
        setReturnQuantity(1);
      } else {
        const nextEligible = (freshDetail.items ?? []).find((i) => getAvailableReturnQuantity(i) > 0);
        setSelectedItemId(nextEligible ? nextEligible.IDOrderItem : '');
        setReturnQuantity(1);
      }
      void fetchOrders();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al procesar la devolución en SQL Server.';
      setReturnErrorMessage(msg);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Filter orders by Order Number search
  const filteredOrders = orderNumberSearch.trim()
    ? orders.filter((o) =>
        o.OrderNumber.toLowerCase().includes(orderNumberSearch.trim().toLowerCase())
      )
    : orders;

  // KPI Calculations
  const kpiPaid = orders.filter((o) => o.Status === 'PAID').length;
  const kpiPrep = orders.filter((o) => o.Status === 'IN_PREPARATION').length;
  const kpiDisp = orders.filter((o) => o.Status === 'DISPATCHED').length;
  const kpiDeliv = orders.filter((o) => o.Status === 'DELIVERED').length;
  const kpiReturn = orders.filter(
    (o) => o.Status === 'PARTIALLY_RETURNED' || o.Status === 'FULLY_RETURNED'
  ).length;

  const totalPages = Math.ceil(total / limit) || 1;

  // Selected Item details for return form
  const currentReturnItem =
    orderDetail && typeof selectedItemId === 'number'
      ? (orderDetail.items ?? []).find((i) => i.IDOrderItem === selectedItemId)
      : null;
  const currentAvailableReturn = currentReturnItem
    ? getAvailableReturnQuantity(currentReturnItem)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              <Boxes className="h-3.5 w-3.5" />
              RF-07 · CONSOLA OPERATIVA DE PEDIDOS
            </span>
            <span className="rounded-md border border-[var(--border-subtle)] bg-surface px-2.5 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
              Don Arturo · Logística
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Gestión Operativa de Pedidos y Envíos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Avance de estados de la cadena logística, asignación de guías de despacho y procesamiento de devoluciones con reintegro automático al inventario Kardez.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:border-primary hover:text-primary sm:self-auto disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <RotateCcw className="h-4 w-4 text-primary" />
          )}
          Actualizar Lista
        </button>
      </header>

      {/* KPI Cards (High Contrast, Responsive Grid) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Métricas de pedidos">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Total Pedidos</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{total}</p>
          <span className="text-[11px] text-[var(--text-muted)]">En base de datos</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-500 dark:text-emerald-400">
            <span className="font-mono uppercase">Pagados / Nuevos</span>
            <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpiPaid}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Listos p/ empaque</span>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-500 dark:text-amber-400">
            <span className="font-mono uppercase">En Preparación</span>
            <Boxes className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{kpiPrep}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Empacando en bodega</span>
        </div>

        <div className="rounded-2xl border border-brand-400/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-brand-500 dark:text-brand-300">
            <span className="font-mono uppercase">Despachados</span>
            <Truck className="h-4 w-4 text-brand-500 dark:text-brand-300" />
          </div>
          <p className="mt-2 text-2xl font-black text-brand-600 dark:text-brand-300">{kpiDisp}</p>
          <span className="text-[11px] text-[var(--text-muted)]">En ruta de entrega</span>
        </div>

        <div className="rounded-2xl border border-teal-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-teal-500 dark:text-teal-400">
            <span className="font-mono uppercase">Entregados</span>
            <CheckCircle2 className="h-4 w-4 text-teal-500 dark:text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">{kpiDeliv}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Completados</span>
        </div>

        <div className="rounded-2xl border border-orange-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-orange-500 dark:text-orange-400">
            <span className="font-mono uppercase">Devoluciones</span>
            <RotateCcw className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-orange-600 dark:text-orange-400">{kpiReturn}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Kardez reintegrado</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Order Number Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={orderNumberSearch}
              onChange={(e) => setOrderNumberSearch(e.target.value)}
              placeholder="Buscar por No. de Pedido (ej. ORD-)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-canvas py-2 pr-3 pl-9 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-muted)]" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Todos los Estados ({total})</option>
              <option value="PAID">Pagados / Confirmados (PAID)</option>
              <option value="IN_PREPARATION">En Preparación (IN_PREPARATION)</option>
              <option value="DISPATCHED">Despachados / En Ruta (DISPATCHED)</option>
              <option value="DELIVERED">Entregados (DELIVERED)</option>
              <option value="CANCELLED">Cancelados (CANCELLED)</option>
              <option value="PARTIALLY_RETURNED">Devolución Parcial</option>
              <option value="FULLY_RETURNED">Devolución Total</option>
            </select>
          </div>

          {orderNumberSearch && (
            <button
              type="button"
              onClick={() => setOrderNumberSearch('')}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <XCircle className="h-3.5 w-3.5" />
              Limpiar búsqueda
            </button>
          )}
        </div>

        <span className="text-xs text-[var(--text-muted)]">
          Mostrando {filteredOrders.length} de {total} órdenes ({totalPages} págs.)
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-crimson-600/40 bg-surface p-4 text-xs text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-crimson-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
        <table className="w-full text-left text-xs text-[var(--text-secondary)]">
          <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                No. Pedido
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Cliente
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Fecha
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                Artículos
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                Total (GTQ)
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-center">
                Estado Logístico
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  Cargando órdenes de compra en tiempo real...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  <Package className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
                  No se encontraron órdenes registradas con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const statusMeta = getOrderStatusMeta(ord.Status);
                return (
                  <tr
                    key={ord.IDOrder}
                    className="transition-colors hover:bg-elevated/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-primary">
                      {ord.OrderNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[var(--text-primary)]">{ord.CustomerName}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{ord.CustomerEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        {new Date(ord.CreatedAt).toLocaleDateString('es-GT', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(ord.CreatedAt).toLocaleTimeString('es-GT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold text-[var(--text-primary)]">
                      {ord.ItemCount} {ord.ItemCount === 1 ? 'ítem' : 'ítems'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatGTQ(ord.GrandTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleOpenManageModal(ord.IDOrder)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/40 bg-brand-950/40 px-3 py-1.5 text-xs font-semibold text-brand-300 transition hover:border-brand-400 hover:bg-brand-900"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <span className="text-xs text-[var(--text-muted)]">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Operational Modal */}
      {selectedOrderId && (
        <ModalDialog
          isOpen={true}
          onClose={handleCloseModal}
          title={
            orderDetail
              ? `Gestión Logística: Pedido ${orderDetail.order.OrderNumber}`
              : 'Cargando orden...'
          }
        >
          {isLoadingDetail ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-primary" />
              Obteniendo detalles de la orden en SQL Server...
            </div>
          ) : detailError ? (
            <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-surface p-4 text-xs text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 text-crimson-600" />
              <span>{detailError}</span>
            </div>
          ) : orderDetail ? (
            <div className="space-y-6">
              {/* Top Banner Status & Progress */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      Estado Actual
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-mono text-xs font-bold ${
                          getOrderStatusMeta(orderDetail.order.Status).badgeClass
                        }`}
                      >
                        {getOrderStatusMeta(orderDetail.order.Status).label}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="font-mono text-xs text-[var(--text-muted)]">Cliente y Contacto</span>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {orderDetail.order.CustomerName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {orderDetail.order.CustomerEmail}
                    </p>
                  </div>
                </div>

                {/* Progress Stepper */}
                {orderDetail.order.Status !== 'CANCELLED' && (
                  <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TRACKING_STEPS.map((s) => {
                        const currentStep = getOrderProgressStep(orderDetail.order.Status);
                        const isCompleted = currentStep >= s.step;
                        const isCurrent = currentStep === s.step;
                        return (
                          <div
                            key={s.step}
                            className={`rounded-xl border p-2.5 text-center transition-all ${
                              isCurrent
                                ? 'border-primary bg-surface ring-1 ring-primary'
                                : isCompleted
                                  ? 'border-emerald-500/30 bg-surface text-emerald-600 dark:text-emerald-400'
                                  : 'border-[var(--border-subtle)] bg-surface opacity-50'
                            }`}
                          >
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {s.step}. {s.label}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">{s.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b border-[var(--border-subtle)] text-xs font-semibold" role="tablist">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'info'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  Artículos y Totales
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transition')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'transition'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowRight className="h-4 w-4" />
                  Avance Logístico
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('return')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'return'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  Devoluciones & Kardez
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'history'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Auditoría ({(orderDetail.history ?? []).length})
                </button>
              </div>

              {/* Tab 1: Info (Items, Shipping Address, Breakdown) */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Shipping Address */}
                  {(() => {
                    const addr = parseShippingAddressSnapshot(
                      orderDetail.order.ShippingAddressSnapshot
                    );
                    if (!addr) return null;
                    return (
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          <MapPin className="h-4 w-4 text-primary" />
                          Dirección de Entrega Registrada
                        </div>
                        <p className="mt-2 text-xs font-medium text-[var(--text-primary)]">
                          {addr.addressLine1 || addr.AddressLine1}
                          {(addr.addressLine2 || addr.AddressLine2) &&
                            `, ${addr.addressLine2 || addr.AddressLine2}`}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {addr.municipality || addr.Municipality},{' '}
                          {addr.department || addr.Department}
                        </p>
                        {(addr.recipientPhone || addr.RecipientPhone) && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Teléfono de contacto:{' '}
                            <span className="font-mono font-semibold text-[var(--text-primary)]">
                              {addr.recipientPhone || addr.RecipientPhone}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Items Table */}
                  <div className="responsive-table-wrapper rounded-xl border border-[var(--border-subtle)] bg-surface">
                    <table className="w-full text-left text-xs text-[var(--text-secondary)]">
                      <thead className="border-b border-[var(--border-subtle)] bg-canvas font-mono text-[11px] uppercase text-[var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2 font-semibold">SKU / Producto</th>
                          <th className="px-3 py-2 text-right font-semibold">Unitario</th>
                          <th className="px-3 py-2 text-center font-semibold">Vendida</th>
                          <th className="px-3 py-2 text-center font-semibold">Devuelta</th>
                          <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {(orderDetail.items ?? []).map((it) => (
                          <tr key={it.IDOrderItem}>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-[11px] font-semibold text-primary">
                                {it.HistoricalSKU}
                              </span>
                              <div className="font-medium text-[var(--text-primary)]">
                                {it.HistoricalProductName}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--text-primary)]">
                              {formatGTQ(it.UnitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-[var(--text-primary)]">
                              {it.QuantitySold}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {it.QuantityReturned > 0 ? (
                                <span className="rounded-md border border-orange-500/40 bg-orange-950/40 px-1.5 py-0.5 font-mono font-bold text-orange-400">
                                  {it.QuantityReturned}
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)]">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-[var(--text-primary)]">
                              {formatGTQ(it.LineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Fiscal Breakdown */}
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Subtotal Neto (sin IVA):</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {formatGTQ(orderDetail.order.NetSubtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Impuesto al Valor Agregado (IVA 12%):</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {formatGTQ(orderDetail.order.IVATaxAmount)}
                        </span>
                      </div>
                      {orderDetail.order.DiscountTotal > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>
                            Descuento Aplicado{' '}
                            {orderDetail.order.CouponCode
                              ? `(${orderDetail.order.CouponCode})`
                              : ''}
                            :
                          </span>
                          <span className="font-mono font-bold">
                            -{formatGTQ(orderDetail.order.DiscountTotal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2 text-sm font-black text-[var(--text-primary)]">
                        <span>Total de la Orden:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {formatGTQ(orderDetail.order.GrandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Logistics Transition */}
              {activeTab === 'transition' && (
                <div className="space-y-4">
                  {transitionSuccessMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-surface p-3 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{transitionSuccessMessage}</span>
                    </div>
                  )}

                  {transitionErrorMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-surface p-3 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                      <span>{transitionErrorMessage}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--border-subtle)] bg-surface p-4">
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      Acciones Disponibles para Estado Actual:{' '}
                      <span className="font-mono text-primary">{orderDetail.order.Status}</span>
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Seleccione la siguiente etapa logística para este pedido. Cada avance queda registrado con autor, fecha y motivo de auditoría.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {orderDetail.order.Status === 'PAID' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStatus('IN_PREPARATION');
                            setTransitionReason('Empaque iniciado en bodega central');
                          }}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            targetStatus === 'IN_PREPARATION'
                              ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                              : 'border-[var(--border-strong)] bg-canvas text-[var(--text-primary)] hover:border-amber-500'
                          }`}
                        >
                          📦 Iniciar Preparación (IN_PREPARATION)
                        </button>
                      )}

                      {orderDetail.order.Status === 'IN_PREPARATION' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStatus('DISPATCHED');
                            setTransitionReason('Entregado a transporte. Guía de rastreo: ');
                          }}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            targetStatus === 'DISPATCHED'
                              ? 'border-brand-500 bg-brand-950/60 text-brand-300'
                              : 'border-[var(--border-strong)] bg-canvas text-[var(--text-primary)] hover:border-primary'
                          }`}
                        >
                          🚚 Despachar en Ruta (DISPATCHED)
                        </button>
                      )}

                      {orderDetail.order.Status === 'DISPATCHED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStatus('DELIVERED');
                            setTransitionReason('Entrega confirmada por cliente / transporte');
                          }}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            targetStatus === 'DELIVERED'
                              ? 'border-teal-500 bg-teal-950/60 text-teal-300'
                              : 'border-[var(--border-strong)] bg-canvas text-[var(--text-primary)] hover:border-teal-500'
                          }`}
                        >
                          ✅ Confirmar Entrega (DELIVERED)
                        </button>
                      )}

                      {['PAID', 'IN_PREPARATION', 'DISPATCHED'].includes(
                        orderDetail.order.Status
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetStatus('CANCELLED');
                            setTransitionReason('');
                          }}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            targetStatus === 'CANCELLED'
                              ? 'border-crimson-600 bg-crimson-950/60 text-red-300'
                              : 'border-[var(--border-strong)] bg-canvas text-crimson-600 hover:border-crimson-600'
                          }`}
                        >
                          <XCircle className="inline mr-1 h-3.5 w-3.5" />
                          Cancelar Pedido (CANCELLED)
                        </button>
                      )}

                      {['DELIVERED', 'CANCELLED', 'FULLY_RETURNED'].includes(
                        orderDetail.order.Status
                      ) && (
                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-canvas p-3 text-xs text-[var(--text-secondary)]">
                          <Info className="h-4 w-4 text-[var(--text-muted)]" />
                          El pedido se encuentra en un estado terminal de despacho. No admite más avances logísticos secuenciales.
                        </div>
                      )}
                    </div>

                    {/* Transition Confirmation Form */}
                    {targetStatus && (
                      <form onSubmit={handleAdvanceStatus} className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)]">
                            Motivo / Observación del cambio a{' '}
                            <span className="font-mono text-primary">{targetStatus}</span>:
                          </label>
                          <textarea
                            rows={3}
                            value={transitionReason}
                            onChange={(e) => setTransitionReason(e.target.value)}
                            placeholder="Ingrese detalles del despacho, bodega de origen, número de guía de transporte, o justificación..."
                            className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setTargetStatus(null)}
                            className="rounded-xl border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Descartar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingTransition}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:opacity-50"
                          >
                            {isSubmittingTransition ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Confirmar Avance de Estado
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Returns & Kardex Reintegration */}
              {activeTab === 'return' && (
                <div className="space-y-4">
                  {returnSuccessMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-surface p-3 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{returnSuccessMessage}</span>
                    </div>
                  )}

                  {returnErrorMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-surface p-3 text-xs text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                      <span>{returnErrorMessage}</span>
                    </div>
                  )}

                  {['DELIVERED', 'PARTIALLY_RETURNED'].includes(orderDetail.order.Status) ? (
                    <form
                      onSubmit={handleProcessReturn}
                      noValidate
                      className="rounded-xl border border-[var(--border-subtle)] bg-surface p-4 space-y-4"
                    >
                      <div>
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">
                          Reingreso de Mercadería y Asiento Kardez CLIENT_RETURN
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Seleccione el producto devuelto. El sistema reintegrará automáticamente el inventario físico en bodega y asentará el registro de auditoría en la tabla Kardez.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)]">
                            Artículo a Devolver:
                          </label>
                          <select
                            value={selectedItemId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setSelectedItemId(val);
                              setReturnQuantity(1);
                            }}
                            className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
                          >
                            <option value="">Seleccione un ítem...</option>
                            {(orderDetail.items ?? []).map((it) => {
                              const avail = getAvailableReturnQuantity(it);
                              return (
                                <option
                                  key={it.IDOrderItem}
                                  value={it.IDOrderItem}
                                  disabled={avail <= 0}
                                >
                                  {it.HistoricalSKU} - {it.HistoricalProductName} (Disp:{' '}
                                  {avail})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)]">
                            Cantidad a Reintegrar (Máx disponible: {currentAvailableReturn}):
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={returnQuantity}
                            onChange={(e) => setReturnQuantity(parseInt(e.target.value, 10) || 0)}
                            disabled={!currentAvailableReturn || currentAvailableReturn <= 0}
                            className={`mt-1 w-full rounded-xl border bg-canvas px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-hidden disabled:opacity-40 ${
                              returnQuantity > currentAvailableReturn
                                ? 'border-amber-500 focus:border-amber-500 ring-1 ring-amber-500/40'
                                : 'border-[var(--border-strong)] focus:border-primary'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Inline Warning Alert when return quantity exceeds available units */}
                      {returnQuantity > currentAvailableReturn && (
                        <div
                          role="alert"
                          className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-300"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-400">Existencias límite superadas</p>
                            <p className="mt-0.5 text-[11px] text-amber-200/90">
                              La cantidad a devolver ({returnQuantity}) excede las {currentAvailableReturn}{' '}
                              unidades disponibles para reintegro en este pedido.
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)]">
                          Motivo de Devolución (Obligatorio, mín. 3 caracteres):
                        </label>
                        <input
                          type="text"
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Ej. Talla incorrecta, producto defectuoso de fábrica, solicitud de cliente..."
                          className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={
                            isSubmittingReturn ||
                            typeof selectedItemId !== 'number' ||
                            currentAvailableReturn <= 0 ||
                            returnQuantity < 1 ||
                            returnQuantity > currentAvailableReturn ||
                            returnReason.trim().length < 3
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmittingReturn ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Procesar Devolución & Reintegrar a Kardez
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-surface p-4 text-xs text-amber-400">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        Devoluciones restringidas por flujo de negocio
                      </div>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        Solo pueden gestionarse devoluciones en pedidos con estado{' '}
                        <strong className="text-[var(--text-primary)]">ENTREGADO (DELIVERED)</strong> o{' '}
                        <strong className="text-[var(--text-primary)]">DEVOLUCIÓN PARCIAL (PARTIALLY_RETURNED)</strong>. El estado actual de este pedido es{' '}
                        <span className="font-mono text-amber-400">
                          {orderDetail.order.Status}
                        </span>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Audit History */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-surface p-4">
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Línea de Tiempo de Cambios de Estado
                    </h3>
                    <div className="mt-4 space-y-4">
                      {(orderDetail.history ?? []).length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          No hay registros de historial adicionales.
                        </p>
                      ) : (
                        (orderDetail.history ?? []).map((h) => (
                          <div
                            key={h.IDOrderStatusHistory}
                            className="relative flex items-start gap-3 border-l-2 border-[var(--border-strong)] pl-4"
                          >
                            <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {h.PreviousStatus ? `${h.PreviousStatus} ➔ ` : ''}
                                  {h.NewStatus}
                                </span>
                                <span className="rounded-md border border-[var(--border-subtle)] bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                                  Por: {h.ChangedByUserName}
                                </span>
                              </div>
                              {h.Reason && (
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  «{h.Reason}»
                                </p>
                              )}
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {new Date(h.ChangedAt).toLocaleString('es-GT')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ModalDialog>
      )}
    </div>
  );
}
