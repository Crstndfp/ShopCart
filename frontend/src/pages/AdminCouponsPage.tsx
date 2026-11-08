import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Percent,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
} from 'lucide-react';
import { catalogApi } from '../api/catalog.api.js';
import { couponApi } from '../api/coupon.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { formatGTQ, type CategoryItem } from '../types/catalog.types.js';
import type {
  CouponRecord,
  CreateCouponPayload,
  DiscountType,
  UpdateCouponPayload,
} from '../types/coupon.types.js';

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [onlyActive, setOnlyActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Categories for restriction dropdown
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxTotalUses, setMaxTotalUses] = useState<number>(100);
  const [maxUsesPerClient, setMaxUsesPerClient] = useState<number>(1);
  const [idCategory, setIdCategory] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  // Load Categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catList = await catalogApi.listCategories(true);
        if (isMounted) setCategories(catList);
      } catch (err) {
        console.warn('Could not load categories for coupons:', err);
      }
    }
    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Coupons List
  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await couponApi.listCoupons({
        onlyActive,
        page,
        limit,
      });
      setCoupons(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar cupones en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onlyActive, page, limit]);

  useEffect(() => {
    void fetchCoupons();
  }, [fetchCoupons]);

  // Handlers for Modal Opening
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(10);
    setMinPurchaseAmount(0);

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setStartDate(now.toISOString().slice(0, 10));
    setEndDate(nextMonth.toISOString().slice(0, 10));
    setMaxTotalUses(100);
    setMaxUsesPerClient(1);
    setIdCategory(undefined);
    setIsActive(true);
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: CouponRecord) => {
    setEditingCoupon(coupon);
    setCode(coupon.Code);
    setDiscountType(coupon.DiscountType);
    setDiscountValue(coupon.DiscountValue);
    setMinPurchaseAmount(coupon.MinPurchaseAmount);
    setStartDate(new Date(coupon.StartDate).toISOString().slice(0, 10));
    setEndDate(new Date(coupon.EndDate).toISOString().slice(0, 10));
    setMaxTotalUses(coupon.MaxTotalUses);
    setMaxUsesPerClient(coupon.MaxUsesPerClient);
    setIdCategory(coupon.IDCategory ?? undefined);
    setIsActive(coupon.IsActive);
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCoupon(null);
    setModalFeedback(null);
  };

  // Submit Handler for Create / Update
  const handleSubmitCoupon = async (e: FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    // Validations
    if (!code.trim() || code.trim().length < 3) {
      setModalFeedback({
        type: 'error',
        message: 'El código del cupón debe tener al menos 3 caracteres alfanuméricos.',
      });
      return;
    }

    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
      setModalFeedback({
        type: 'error',
        message: 'El porcentaje de descuento debe estar entre 1% y 100%.',
      });
      return;
    }

    if (discountType === 'FIXED_AMOUNT' && discountValue <= 0) {
      setModalFeedback({
        type: 'error',
        message: 'El monto fijo de descuento debe ser mayor a 0 GTQ.',
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setModalFeedback({
        type: 'error',
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCoupon) {
        const payload: UpdateCouponPayload = {
          discountType,
          discountValue,
          minPurchaseAmount,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          maxTotalUses,
          maxUsesPerClient,
          idCategory: idCategory ?? null,
          isActive,
        };
        await couponApi.updateCoupon(editingCoupon.IDCoupon, payload);
        setModalFeedback({
          type: 'success',
          message: `Cupón '${editingCoupon.Code}' actualizado exitosamente.`,
        });
      } else {
        const payload: CreateCouponPayload = {
          code: code.trim().toUpperCase(),
          discountType,
          discountValue,
          minPurchaseAmount,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          maxTotalUses,
          maxUsesPerClient,
          idCategory: idCategory ?? null,
        };
        await couponApi.createCoupon(payload);
        setModalFeedback({
          type: 'success',
          message: `Cupón '${payload.code}' creado exitosamente en SQL Server.`,
        });
      }

      void fetchCoupons();
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al procesar la solicitud del cupón en SQL Server.';
      setModalFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate Coupon Handler
  const handleDeactivate = async (idCoupon: number, couponCode: string) => {
    if (
      !window.confirm(
        `¿Deseas desactivar el cupón '${couponCode}'? Esta acción quedará registrada en la bitácora de auditoría.`
      )
    ) {
      return;
    }

    try {
      await couponApi.deactivateCoupon(idCoupon);
      void fetchCoupons();
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al desactivar el cupón en SQL Server.';
      alert(msg);
    }
  };

  // KPI Calculations
  const activeCount = coupons.filter((c) => c.IsActive).length;
  const percentageCount = coupons.filter((c) => c.DiscountType === 'PERCENTAGE').length;
  const fixedCount = coupons.filter((c) => c.DiscountType === 'FIXED_AMOUNT').length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              RF-05 · CUPONES Y PROMOCIONES
            </span>
            <span className="rounded-md border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
              ADMINISTRATOR
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Gestión de Cupones Promocionales
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Configuración de reglas de descuento porcentual o monto fijo, límites globales, restricciones por categoría y vigencia.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-900 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Crear Nuevo Cupón
        </button>
      </header>

      {/* KPI Metrics Summary (4 Cards) */}
      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Métricas de cupones">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Total Cupones</span>
            <Tag className="h-4 w-4 text-brand-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
            {total}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Registrados en el sistema</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Cupones Activos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400 sm:text-3xl">
            {activeCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Listos para canjear (página)</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Porcentuales</span>
            <Percent className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-400 sm:text-3xl">
            {percentageCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Descuento en % (página)</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Monto Fijo</span>
            <Tag className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-400 sm:text-3xl">
            {fixedCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Descuento en GTQ (página)</p>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => {
              setOnlyActive(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded-sm border-[var(--border-strong)] text-primary focus:ring-primary"
          />
          Mostrar solo cupones activos
        </label>

        <button
          type="button"
          onClick={() => void fetchCoupons()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Actualizar Lista
        </button>
      </div>

      {/* Table & States */}
      {isLoading ? (
        <div className="space-y-3" role="status" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`coupon-skel-${i}`}
              className="h-16 w-full rounded-2xl border border-[var(--border-subtle)] bg-surface animate-pulse"
            />
          ))}
          <span className="sr-only">Cargando cupones...</span>
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
        >
          <AlertCircle className="h-10 w-10 text-crimson-600" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            Error al consultar cupones
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void fetchCoupons()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
          <Tag className="h-10 w-10 text-[var(--text-muted)]" />
          <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
            No se encontraron cupones registrados
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Crea tu primera promoción comercial para incentivar las compras de los clientes.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear Cupón
          </button>
        </div>
      ) : (
        <div className="responsive-table-wrapper shadow-xs">
          <table className="responsive-table">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Código
                </th>
                <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Descuento
                </th>
                <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Compra Mín.
                </th>
                <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Vigencia
                </th>
                <th scope="col" className="px-4 py-3 text-center font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Usos
                </th>
                <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Restricción
                </th>
                <th scope="col" className="px-4 py-3 text-center font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              {coupons.map((coupon) => {
                const isPercentage = coupon.DiscountType === 'PERCENTAGE';
                const formattedStart = new Date(coupon.StartDate).toLocaleDateString('es-GT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedEnd = new Date(coupon.EndDate).toLocaleDateString('es-GT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <tr key={coupon.IDCoupon} className="transition hover:bg-elevated/40">
                    <td data-label="Código" className="px-4 py-3 font-mono font-bold text-primary">
                      {coupon.Code}
                    </td>
                    <td data-label="Descuento" className="px-4 py-3">
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {isPercentage
                          ? `${coupon.DiscountValue}%`
                          : formatGTQ(coupon.DiscountValue)}
                      </span>
                      <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                        ({isPercentage ? 'Porcentual' : 'Fijo'})
                      </span>
                    </td>
                    <td data-label="Compra Mín." className="px-4 py-3 text-right font-mono">
                      {coupon.MinPurchaseAmount > 0 ? formatGTQ(coupon.MinPurchaseAmount) : 'Sin mín.'}
                    </td>
                    <td data-label="Vigencia" className="px-4 py-3 font-mono text-[11px]">
                      <div>{formattedStart}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">hasta {formattedEnd}</div>
                    </td>
                    <td data-label="Usos" className="px-4 py-3 text-center font-mono">
                      <span className="font-bold text-[var(--text-primary)]">
                        {coupon.CurrentUses}
                      </span>
                      <span className="text-[var(--text-muted)]"> / {coupon.MaxTotalUses}</span>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        (máx. {coupon.MaxUsesPerClient} por cliente)
                      </div>
                    </td>
                    <td data-label="Restricción" className="px-4 py-3">
                      {coupon.CategoryName ? (
                        <span className="rounded-md border border-[var(--border-subtle)] bg-canvas px-2 py-0.5 text-[10px]">
                          {coupon.CategoryName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">Global (Todas)</span>
                      )}
                    </td>
                    <td data-label="Estado" className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                          coupon.IsActive
                            ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300'
                            : 'border-crimson-600/40 bg-crimson-950/80 text-red-300'
                        }`}
                      >
                        {coupon.IsActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="Acciones" className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(coupon)}
                          title="Editar cupón"
                          className="rounded-lg border border-[var(--border-strong)] bg-surface p-1.5 text-[var(--text-secondary)] transition hover:border-primary hover:text-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {coupon.IsActive && (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(coupon.IDCoupon, coupon.Code)}
                            title="Desactivar cupón"
                            className="rounded-lg border border-[var(--border-strong)] bg-surface p-1.5 text-[var(--text-secondary)] transition hover:border-crimson-600 hover:text-crimson-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && coupons.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <p>
            Mostrando <strong>{coupons.length}</strong> de <strong>{total}</strong> cupones registrados
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
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT COUPON
         ========================================================================= */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCoupon ? `Editar Cupón: ${editingCoupon.Code}` : 'Crear Nuevo Cupón'}
        subtitle="Configura las condiciones comerciales, vigencia y límites de uso del cupón."
      >
        <form onSubmit={handleSubmitCoupon} className="space-y-4 text-xs">
          {/* Coupon Code Input */}
          <div>
            <label htmlFor="coupon-code" className="block font-semibold text-[var(--text-primary)]">
              Código Alfanumérico (Mín. 3 letras)
            </label>
            <input
              id="coupon-code"
              type="text"
              required
              disabled={editingCoupon !== null}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EJ. VERANO2026"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold uppercase text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden disabled:opacity-60"
            />
          </div>

          {/* Discount Type Selector */}
          <div>
            <label className="block font-semibold text-[var(--text-primary)]">
              Tipo de Descuento
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENTAGE')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 font-bold transition ${
                  discountType === 'PERCENTAGE'
                    ? 'border-brand-400 bg-brand-950/60 text-brand-300'
                    : 'border-[var(--border-subtle)] bg-surface text-[var(--text-secondary)]'
                }`}
              >
                <Percent className="h-4 w-4" />
                Porcentaje (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('FIXED_AMOUNT')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 font-bold transition ${
                  discountType === 'FIXED_AMOUNT'
                    ? 'border-brand-400 bg-brand-950/60 text-brand-300'
                    : 'border-[var(--border-subtle)] bg-surface text-[var(--text-secondary)]'
                }`}
              >
                <Tag className="h-4 w-4" />
                Monto Fijo (GTQ)
              </button>
            </div>
          </div>

          {/* Discount Value & Minimum Purchase Amount */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="discount-val" className="block font-semibold text-[var(--text-primary)]">
                {discountType === 'PERCENTAGE' ? 'Porcentaje de Descuento (%)' : 'Monto de Descuento (GTQ)'}
              </label>
              <input
                id="discount-val"
                type="number"
                min="0.01"
                max={discountType === 'PERCENTAGE' ? 100 : undefined}
                step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="min-purchase" className="block font-semibold text-[var(--text-primary)]">
                Compra Mínima (GTQ)
              </label>
              <input
                id="min-purchase"
                type="number"
                min="0"
                step="0.01"
                required
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Dates: Start & End */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="start-date" className="block font-semibold text-[var(--text-primary)]">
                Fecha Inicio
              </label>
              <input
                id="start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block font-semibold text-[var(--text-primary)]">
                Fecha Expiración
              </label>
              <input
                id="end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Usage Limits: Global & Per Client */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="max-total-uses" className="block font-semibold text-[var(--text-primary)]">
                Límite de Canjes Globales
              </label>
              <input
                id="max-total-uses"
                type="number"
                min="1"
                step="1"
                required
                value={maxTotalUses}
                onChange={(e) => setMaxTotalUses(parseInt(e.target.value, 10) || 1)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="max-client-uses" className="block font-semibold text-[var(--text-primary)]">
                Máximo por Cliente
              </label>
              <input
                id="max-client-uses"
                type="number"
                min="1"
                step="1"
                required
                value={maxUsesPerClient}
                onChange={(e) => setMaxUsesPerClient(parseInt(e.target.value, 10) || 1)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>

          {/* Category Restriction */}
          <div>
            <label htmlFor="coupon-category" className="block font-semibold text-[var(--text-primary)]">
              Restricción por Categoría (Opcional)
            </label>
            <select
              id="coupon-category"
              value={idCategory ?? ''}
              onChange={(e) => setIdCategory(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            >
              <option value="">Aplicable a todas las categorías (Global)</option>
              {categories.map((c) => (
                <option key={c.IDCategory} value={c.IDCategory}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Toggle (Edit Mode Only) */}
          {editingCoupon && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="coupon-active-toggle"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded-sm border-[var(--border-strong)] text-primary focus:ring-primary"
              />
              <label htmlFor="coupon-active-toggle" className="font-semibold text-[var(--text-primary)]">
                Cupón Activo para canje en compras
              </label>
            </div>
          )}

          {/* Modal Feedback Alert */}
          {modalFeedback && (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                modalFeedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-crimson-600/40 bg-crimson-950/40 text-red-300'
              }`}
            >
              {modalFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
              )}
              <p>{modalFeedback.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando en SQL Server...
                </>
              ) : editingCoupon ? (
                'Actualizar Cupón'
              ) : (
                'Crear Cupón'
              )}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
