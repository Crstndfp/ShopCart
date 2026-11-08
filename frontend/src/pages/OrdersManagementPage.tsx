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
      const eligibleItem = detail.items.find((i) => getAvailableReturnQuantity(i) > 0);
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
      setOrderDetail(updated);
      setTransitionSuccessMessage(
        `Estado actualizado exitosamente a: ${getOrderStatusMeta(updated.order.Status).label}`
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

    const chosenItem = orderDetail.items.find((i) => i.IDOrderItem === selectedItemId);
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
      setOrderDetail(updated);
      setReturnSuccessMessage(
        `Devolución registrada exitosamente. Las ${payload.quantity} unidades fueron reintegradas al inventario físico con asiento Kardex CLIENT_RETURN.`
      );
      setReturnReason('');
      // Refresh selected item & available quantity
      const refreshedItem = updated.items.find((i) => i.IDOrderItem === selectedItemId);
      if (refreshedItem && getAvailableReturnQuantity(refreshedItem) > 0) {
        setReturnQuantity(1);
      } else {
        const nextEligible = updated.items.find((i) => getAvailableReturnQuantity(i) > 0);
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
      ? orderDetail.items.find((i) => i.IDOrderItem === selectedItemId)
      : null;
  const currentAvailableReturn = currentReturnItem
    ? getAvailableReturnQuantity(currentReturnItem)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <Boxes className="h-3.5 w-3.5" />
              RF-07 · CONSOLA OPERATIVA DE PEDIDOS
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
              Don Arturo · Logística
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Gestión Operativa de Pedidos y Envíos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Avance de estados de la cadena logística, asignación de guías de despacho y procesamiento de devoluciones con reintegro automático al inventario.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          ) : (
            <RotateCcw className="h-4 w-4 text-sky-400" />
          )}
          Actualizar Lista
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pedidos</span>
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{total}</p>
          <span className="text-xs text-slate-500">En base de datos</span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Pagados / Nuevos</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{kpiPaid}</p>
          <span className="text-xs text-emerald-500/80">Listos p/ empaque</span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">En Preparación</span>
            <Boxes className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-300">{kpiPrep}</p>
          <span className="text-xs text-amber-500/80">Empacando en bodega</span>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-300">Despachados</span>
            <Truck className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-300">{kpiDisp}</p>
          <span className="text-xs text-sky-500/80">En ruta de entrega</span>
        </div>

        <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-teal-300">Entregados</span>
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-teal-300">{kpiDeliv}</p>
          <span className="text-xs text-teal-500/80">Completados</span>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-300">Devoluciones</span>
            <RotateCcw className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-300">{kpiReturn}</p>
          <span className="text-xs text-orange-500/80">Kardex reintegrado</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Filtrar por Estado:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-sky-500"
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

        <span className="text-xs text-slate-400">
          Mostrando página {page} de {totalPages} ({total} órdenes registradas)
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-crimson-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
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
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-sky-400" />
                  Cargando órdenes de compra en tiempo real...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Package className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  No se encontraron órdenes registradas con los filtros actuales.
                </td>
              </tr>
            ) : (
              orders.map((ord) => {
                const statusMeta = getOrderStatusMeta(ord.Status);
                return (
                  <tr
                    key={ord.IDOrder}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-sky-400">
                      {ord.OrderNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white">{ord.CustomerName}</div>
                      <div className="text-xs text-slate-400">{ord.CustomerEmail}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(ord.CreatedAt).toLocaleDateString('es-GT', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(ord.CreatedAt).toLocaleTimeString('es-GT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-200">
                      {ord.ItemCount} {ord.ItemCount === 1 ? 'ítem' : 'ítems'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-400">
                      {formatGTQ(ord.GrandTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleOpenManageModal(ord.IDOrder)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/60 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-500/60 hover:bg-sky-900/60"
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
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
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
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-sky-400" />
              Obteniendo detalles de la orden en SQL Server...
            </div>
          ) : detailError ? (
            <div className="flex items-center gap-3 rounded-lg border border-crimson-600/40 bg-crimson-950/30 p-4 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-crimson-400" />
              <span>{detailError}</span>
            </div>
          ) : orderDetail ? (
            <div className="space-y-6">
              {/* Top Banner Status & Progress */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400">
                      Estado Actual
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${
                          getOrderStatusMeta(orderDetail.order.Status).badgeClass
                        }`}
                      >
                        {getOrderStatusMeta(orderDetail.order.Status).label}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400">Cliente y Contacto</span>
                    <p className="font-semibold text-white">
                      {orderDetail.order.CustomerName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {orderDetail.order.CustomerEmail}
                    </p>
                  </div>
                </div>

                {/* Progress Stepper */}
                {orderDetail.order.Status !== 'CANCELLED' && (
                  <div className="mt-6 border-t border-slate-800/80 pt-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TRACKING_STEPS.map((s) => {
                        const currentStep = getOrderProgressStep(orderDetail.order.Status);
                        const isCompleted = currentStep >= s.step;
                        const isCurrent = currentStep === s.step;
                        return (
                          <div
                            key={s.step}
                            className={`rounded-lg border p-2.5 text-center transition-all ${
                              isCurrent
                                ? 'border-sky-500 bg-sky-950/60 ring-1 ring-sky-500/40'
                                : isCompleted
                                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
                                  : 'border-slate-800 bg-slate-900/40 opacity-50'
                            }`}
                          >
                            <div className="text-xs font-semibold">
                              {s.step}. {s.label}
                            </div>
                            <div className="text-[11px] text-slate-400">{s.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b border-slate-800 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'info'
                      ? 'border-sky-500 text-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
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
                      ? 'border-sky-500 text-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
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
                      ? 'border-sky-500 text-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  Devoluciones & Kardex
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
                    activeTab === 'history'
                      ? 'border-sky-500 text-sky-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Auditoría ({orderDetail.history.length})
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
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <MapPin className="h-4 w-4 text-sky-400" />
                          Dirección de Entrega Registrada
                        </div>
                        <p className="mt-2 text-sm text-slate-200">
                          {addr.addressLine1 || addr.AddressLine1}
                          {(addr.addressLine2 || addr.AddressLine2) &&
                            `, ${addr.addressLine2 || addr.AddressLine2}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {addr.municipality || addr.Municipality},{' '}
                          {addr.department || addr.Department}
                        </p>
                        {(addr.recipientPhone || addr.RecipientPhone) && (
                          <p className="mt-1 text-xs text-slate-400">
                            Teléfono de contacto:{' '}
                            <span className="font-mono text-slate-300">
                              {addr.recipientPhone || addr.RecipientPhone}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Items Table */}
                  <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900/80 uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2 font-semibold">SKU / Producto</th>
                          <th className="px-3 py-2 text-right font-semibold">Unitario</th>
                          <th className="px-3 py-2 text-center font-semibold">Vendida</th>
                          <th className="px-3 py-2 text-center font-semibold">Devuelta</th>
                          <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {orderDetail.items.map((it) => (
                          <tr key={it.IDOrderItem}>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-[11px] text-sky-400">
                                {it.HistoricalSKU}
                              </span>
                              <div className="font-medium text-white">
                                {it.HistoricalProductName}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {formatGTQ(it.UnitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-white">
                              {it.QuantitySold}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {it.QuantityReturned > 0 ? (
                                <span className="rounded bg-orange-950/80 px-1.5 py-0.5 font-semibold text-orange-400">
                                  {it.QuantityReturned}
                                </span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-100">
                              {formatGTQ(it.LineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Fiscal Breakdown */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal Neto (sin IVA):</span>
                        <span className="font-mono text-slate-200">
                          {formatGTQ(orderDetail.order.NetSubtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Impuesto al Valor Agregado (IVA 12%):</span>
                        <span className="font-mono text-slate-200">
                          {formatGTQ(orderDetail.order.IVATaxAmount)}
                        </span>
                      </div>
                      {orderDetail.order.DiscountTotal > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>
                            Descuento Aplicado{' '}
                            {orderDetail.order.CouponCode
                              ? `(${orderDetail.order.CouponCode})`
                              : ''}
                            :
                          </span>
                          <span className="font-mono">
                            -{formatGTQ(orderDetail.order.DiscountTotal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold text-white">
                        <span>Total de la Orden:</span>
                        <span className="font-mono text-emerald-400">
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
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{transitionSuccessMessage}</span>
                    </div>
                  )}

                  {transitionErrorMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-3 text-sm text-red-300">
                      <AlertCircle className="h-4 w-4 text-crimson-400" />
                      <span>{transitionErrorMessage}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">
                      Acciones Disponibles para Estado Actual:{' '}
                      <span className="text-sky-400">{orderDetail.order.Status}</span>
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
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
                          className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            targetStatus === 'IN_PREPARATION'
                              ? 'border-amber-500 bg-amber-950/80 text-amber-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-white'
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
                          className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            targetStatus === 'DISPATCHED'
                              ? 'border-sky-500 bg-sky-950/80 text-sky-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-500/40 hover:text-white'
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
                          className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            targetStatus === 'DELIVERED'
                              ? 'border-teal-500 bg-teal-950/80 text-teal-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-500/40 hover:text-white'
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
                          className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            targetStatus === 'CANCELLED'
                              ? 'border-crimson-600 bg-crimson-950/80 text-red-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-crimson-600/40 hover:text-red-300'
                          }`}
                        >
                          <XCircle className="inline mr-1 h-3.5 w-3.5" />
                          Cancelar Pedido (CANCELLED)
                        </button>
                      )}

                      {['DELIVERED', 'CANCELLED', 'FULLY_RETURNED'].includes(
                        orderDetail.order.Status
                      ) && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
                          <Info className="h-4 w-4 text-slate-400" />
                          El pedido se encuentra en un estado terminal de despacho. No admite más avances logísticos secuenciales.
                        </div>
                      )}
                    </div>

                    {/* Transition Confirmation Form */}
                    {targetStatus && (
                      <form onSubmit={handleAdvanceStatus} className="mt-5 space-y-3 border-t border-slate-800 pt-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300">
                            Motivo / Observación del cambio a{' '}
                            <span className="font-semibold text-sky-400">{targetStatus}</span>:
                          </label>
                          <textarea
                            rows={3}
                            value={transitionReason}
                            onChange={(e) => setTransitionReason(e.target.value)}
                            placeholder="Ingrese detalles del despacho, bodega de origen, número de guía de transporte, o justificación..."
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setTargetStatus(null)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                          >
                            Descartar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingTransition}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-sky-500 disabled:opacity-50"
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
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{returnSuccessMessage}</span>
                    </div>
                  )}

                  {returnErrorMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-3 text-sm text-red-300">
                      <AlertCircle className="h-4 w-4 text-crimson-400" />
                      <span>{returnErrorMessage}</span>
                    </div>
                  )}

                  {['DELIVERED', 'PARTIALLY_RETURNED'].includes(orderDetail.order.Status) ? (
                    <form
                      onSubmit={handleProcessReturn}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Reingreso de Mercadería y Asiento Kardex CLIENT_RETURN
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Seleccione el producto devuelto. El sistema reintegrará automáticamente el inventario físico en bodega y asentará el registro de auditoría en la tabla Kardex.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-300">
                            Artículo a Devolver:
                          </label>
                          <select
                            value={selectedItemId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setSelectedItemId(val);
                              setReturnQuantity(1);
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                          >
                            <option value="">Seleccione un ítem...</option>
                            {orderDetail.items.map((it) => {
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
                          <label className="block text-xs font-medium text-slate-300">
                            Cantidad a Reintegrar (Máx: {currentAvailableReturn}):
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={currentAvailableReturn || 1}
                            value={returnQuantity}
                            onChange={(e) => setReturnQuantity(Number(e.target.value))}
                            disabled={!currentAvailableReturn || currentAvailableReturn <= 0}
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Motivo de Devolución (Obligatorio, mín. 3 caracteres):
                        </label>
                        <input
                          type="text"
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Ej. Talla incorrecta, producto defectuoso de fábrica, solicitud de cliente..."
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={
                            isSubmittingReturn ||
                            typeof selectedItemId !== 'number' ||
                            currentAvailableReturn <= 0 ||
                            returnReason.trim().length < 3
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-orange-500 disabled:opacity-50"
                        >
                          {isSubmittingReturn ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Procesar Devolución & Reintegrar a Kardex
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                        Devoluciones restringidas por flujo de negocio
                      </div>
                      <p className="mt-1 text-slate-300">
                        Solo pueden gestionarse devoluciones en pedidos con estado{' '}
                        <strong className="text-white">ENTREGADO (DELIVERED)</strong> o{' '}
                        <strong className="text-white">DEVOLUCIÓN PARCIAL (PARTIALLY_RETURNED)</strong>. El estado actual de este pedido es{' '}
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
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Línea de Tiempo de Cambios de Estado
                    </h3>
                    <div className="mt-4 space-y-4">
                      {orderDetail.history.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No hay registros de historial adicionales.
                        </p>
                      ) : (
                        orderDetail.history.map((h) => (
                          <div
                            key={h.IDOrderStatusHistory}
                            className="relative flex items-start gap-3 border-l-2 border-slate-700 pl-4"
                          >
                            <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">
                                  {h.PreviousStatus ? `${h.PreviousStatus} ➔ ` : ''}
                                  {h.NewStatus}
                                </span>
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                                  Por: {h.ChangedByUserName}
                                </span>
                              </div>
                              {h.Reason && (
                                <p className="mt-1 text-xs text-slate-300">
                                  «{h.Reason}»
                                </p>
                              )}
                              <span className="text-[11px] text-slate-500">
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
