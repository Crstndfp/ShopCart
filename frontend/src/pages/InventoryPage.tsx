import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  History,
  Info,
  Loader2,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { catalogApi } from '../api/catalog.api.js';
import { inventoryApi } from '../api/inventory.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { formatGTQ, type CategoryItem } from '../types/catalog.types.js';
import {
  calculateProjectedStock,
  formatStockStatus,
  getKardexMeta,
  type AdjustStockPayload,
  type KardexItem,
  type StockOverviewItem,
} from '../types/inventory.types.js';

export function InventoryPage() {
  // Navigation / Tabs: 'stock' | 'kardex'
  const [activeTab, setActiveTab] = useState<'stock' | 'kardex'>('stock');

  // Categories for filter
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // -------------------------------------------------------------
  // Tab 1: Stock Overview States
  // -------------------------------------------------------------
  const [stockItems, setStockItems] = useState<StockOverviewItem[]>([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(15);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  // Stock Filters
  const [stockSearchInput, setStockSearchInput] = useState('');
  const [stockSearchApplied, setStockSearchApplied] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<number | undefined>(undefined);
  const [stockLowStockOnly, setStockLowStockOnly] = useState(false);

  // -------------------------------------------------------------
  // Tab 2: Kardex Audit Log States
  // -------------------------------------------------------------
  const [kardexItems, setKardexItems] = useState<KardexItem[]>([]);
  const [kardexTotal, setKardexTotal] = useState(0);
  const [kardexPage, setKardexPage] = useState(1);
  const [kardexLimit] = useState(20);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);
  const [kardexError, setKardexError] = useState<string | null>(null);

  // Kardex Filters
  const [kardexMovementFilter, setKardexMovementFilter] = useState<string>('');
  const [kardexStartDate, setKardexStartDate] = useState('');
  const [kardexEndDate, setKardexEndDate] = useState('');

  // -------------------------------------------------------------
  // Modal: Manual Stock Adjustment
  // -------------------------------------------------------------
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockOverviewItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(1);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load Categories on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchCategories() {
      try {
        const catList = await catalogApi.listCategories(true);
        if (isMounted) setCategories(catList);
      } catch (err) {
        console.warn('Could not load categories for stock filter:', err);
      }
    }
    void fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // -------------------------------------------------------------
  // Fetch Stock Overview Data
  // -------------------------------------------------------------
  const fetchStock = useCallback(async () => {
    setIsLoadingStock(true);
    setStockError(null);
    try {
      const response = await inventoryApi.getStockOverview({
        search: stockSearchApplied || undefined,
        idCategory: stockCategoryFilter,
        lowStockOnly: stockLowStockOnly,
        page: stockPage,
        limit: stockLimit,
      });
      setStockItems(response.items || []);
      setStockTotal(response.total || 0);
    } catch (err) {
      const message =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar las existencias del inventario en SQL Server.';
      setStockError(message);
    } finally {
      setIsLoadingStock(false);
    }
  }, [stockSearchApplied, stockCategoryFilter, stockLowStockOnly, stockPage, stockLimit]);

  useEffect(() => {
    void fetchStock();
  }, [fetchStock]);

  // -------------------------------------------------------------
  // Fetch Kardex Data
  // -------------------------------------------------------------
  const fetchKardex = useCallback(async () => {
    setIsLoadingKardex(true);
    setKardexError(null);
    try {
      const response = await inventoryApi.getKardex({
        movementType: kardexMovementFilter || undefined,
        startDate: kardexStartDate ? new Date(kardexStartDate).toISOString() : undefined,
        endDate: kardexEndDate ? new Date(kardexEndDate).toISOString() : undefined,
        page: kardexPage,
        limit: kardexLimit,
      });
      setKardexItems(response.items || []);
      setKardexTotal(response.total || 0);
    } catch (err) {
      const message =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar los registros del Kardex en SQL Server.';
      setKardexError(message);
    } finally {
      setIsLoadingKardex(false);
    }
  }, [kardexMovementFilter, kardexStartDate, kardexEndDate, kardexPage, kardexLimit]);

  useEffect(() => {
    if (activeTab === 'kardex') {
      void fetchKardex();
    }
  }, [activeTab, fetchKardex]);

  // Handlers for Stock Filter Form
  const handleStockSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStockPage(1);
    setStockSearchApplied(stockSearchInput.trim());
  };

  const handleStockReset = () => {
    setStockSearchInput('');
    setStockSearchApplied('');
    setStockCategoryFilter(undefined);
    setStockLowStockOnly(false);
    setStockPage(1);
  };

  // Handlers for Kardex Filter Form
  const handleKardexFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setKardexPage(1);
    void fetchKardex();
  };

  const handleKardexReset = () => {
    setKardexMovementFilter('');
    setKardexStartDate('');
    setKardexEndDate('');
    setKardexPage(1);
  };

  // Handlers for Adjustment Modal
  const handleOpenAdjustmentModal = (variant: StockOverviewItem) => {
    setSelectedVariant(variant);
    setAdjustmentType('POSITIVE');
    setAdjustmentQuantity(1);
    setAdjustmentReason('');
    setAdjustmentFeedback(null);
    setIsAdjustmentModalOpen(true);
  };

  const handleCloseAdjustmentModal = () => {
    if (isSubmittingAdjustment) return;
    setIsAdjustmentModalOpen(false);
    setSelectedVariant(null);
    setAdjustmentFeedback(null);
  };

  const handleSubmitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    const delta = adjustmentType === 'POSITIVE' ? adjustmentQuantity : -adjustmentQuantity;
    const projected = calculateProjectedStock(selectedVariant.PhysicalStock, delta);

    if (projected < 0) {
      setAdjustmentFeedback({
        type: 'error',
        message: `El ajuste resulta en saldo negativo (${projected}). El stock físico mínimo permitido es 0.`,
      });
      return;
    }

    if (adjustmentReason.trim().length < 5) {
      setAdjustmentFeedback({
        type: 'error',
        message: 'El motivo del ajuste debe tener al menos 5 caracteres obligatorios para auditoría.',
      });
      return;
    }

    setIsSubmittingAdjustment(true);
    setAdjustmentFeedback(null);

    try {
      const payload: AdjustStockPayload = {
        idVariant: selectedVariant.IDVariant,
        quantityChange: delta,
        reason: adjustmentReason.trim(),
      };

      await inventoryApi.adjustStock(payload);

      setAdjustmentFeedback({
        type: 'success',
        message: `Ajuste de ${delta > 0 ? '+' : ''}${delta} unidades registrado exitosamente en el Libro Mayor Kardex.`,
      });

      // Refetch both views
      void fetchStock();
      if (activeTab === 'kardex') {
        void fetchKardex();
      }

      setTimeout(() => {
        handleCloseAdjustmentModal();
      }, 1200);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al registrar el ajuste manual de inventario en SQL Server.';
      setAdjustmentFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Derived KPI calculations from current stock overview
  const totalSkusCount = stockTotal;
  const criticalStockCount = stockItems.filter((i) => i.AvailableStock <= 5).length;
  const currentPhysicalSum = stockItems.reduce((acc, curr) => acc + curr.PhysicalStock, 0);
  const currentReservedSum = stockItems.reduce((acc, curr) => acc + curr.ReservedStock, 0);

  const stockTotalPages = Math.max(1, Math.ceil(stockTotal / stockLimit));
  const kardexTotalPages = Math.max(1, Math.ceil(kardexTotal / kardexLimit));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Module Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              RF-03 · TRANSACCIONAL
            </span>
            <span className="rounded-md border border-amber-400/40 bg-amber-950/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-300">
              OPERATOR & ADMIN
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Control de Inventario y Libro Mayor Kardex
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Supervisión de stock físico, reservas activas, alertas de desabastecimiento y trazabilidad inmutable de movimientos.
          </p>
        </div>

        {/* Global Action Refresh */}
        <button
          type="button"
          onClick={() => {
            void fetchStock();
            if (activeTab === 'kardex') void fetchKardex();
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:border-primary hover:text-primary sm:self-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Actualizar Datos
        </button>
      </header>

      {/* KPI Metrics Summary Banner (100% Responsive Grid) */}
      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Métricas clave de inventario">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">SKUs en Catálogo</span>
            <Boxes className="h-4 w-4 text-brand-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
            {totalSkusCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Variantes con SKU registradas</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Stock Físico</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400 sm:text-3xl">
            {currentPhysicalSum}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Unidades en bodega (página)</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Stock Reservado</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-400 sm:text-3xl">
            {currentReservedSum}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">En carritos / pedidos activos</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-mono uppercase">Stock Crítico</span>
            <TrendingDown className="h-4 w-4 text-crimson-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-crimson-600 sm:text-3xl">
            {criticalStockCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Variantes con ≤ 5 unidades disp.</p>
        </div>
      </section>

      {/* Primary Tab Navigation */}
      <div className="mb-6 flex border-b border-[var(--border-subtle)]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'stock'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Package className="h-4 w-4" />
          Existencias y Disponibilidad
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'kardex'}
          onClick={() => setActiveTab('kardex')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'kardex'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="h-4 w-4" />
          Libro Mayor Kardex
        </button>
      </div>

      {/* =========================================================================
          TAB 1: STOCK OVERVIEW
         ========================================================================= */}
      {activeTab === 'stock' && (
        <section aria-labelledby="stock-heading" className="space-y-6">
          <h2 id="stock-heading" className="sr-only">
            Existencias y Disponibilidad de Inventario
          </h2>

          {/* Filters Bar */}
          <form
            onSubmit={handleStockSearchSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="search"
                  value={stockSearchInput}
                  onChange={(e) => setStockSearchInput(e.target.value)}
                  placeholder="Buscar por SKU o Producto..."
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-canvas py-2 pr-3 pl-9 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
                />
              </div>

              {/* Category filter */}
              <select
                value={stockCategoryFilter ?? ''}
                onChange={(e) => {
                  setStockCategoryFilter(e.target.value ? Number(e.target.value) : undefined);
                  setStockPage(1);
                }}
                className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.IDCategory} value={c.IDCategory}>
                    {c.Name}
                  </option>
                ))}
              </select>

              {/* Low Stock Checkbox Toggle */}
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={stockLowStockOnly}
                  onChange={(e) => {
                    setStockLowStockOnly(e.target.checked);
                    setStockPage(1);
                  }}
                  className="h-4 w-4 rounded-sm border-[var(--border-strong)] text-primary focus:ring-primary"
                />
                Solo Stock Crítico (≤ 5)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900"
              >
                <Filter className="h-3.5 w-3.5" />
                Filtrar
              </button>
              {(stockSearchApplied || stockCategoryFilter !== undefined || stockLowStockOnly) && (
                <button
                  type="button"
                  onClick={handleStockReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </form>

          {/* Stock Table & States */}
          {isLoadingStock ? (
            <div className="space-y-3" role="status" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-stock-${i}`}
                  className="h-14 w-full rounded-xl border border-[var(--border-subtle)] bg-surface animate-pulse"
                />
              ))}
              <span className="sr-only">Cargando existencias de inventario...</span>
            </div>
          ) : stockError ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
            >
              <AlertCircle className="h-10 w-10 text-crimson-600" />
              <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                Error al consultar inventario
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{stockError}</p>
              <button
                type="button"
                onClick={() => void fetchStock()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          ) : stockItems.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
              <Package className="h-10 w-10 text-[var(--text-muted)]" />
              <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                No se encontraron variantes de productos
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Intenta ajustar o limpiar los filtros de búsqueda aplicados.
              </p>
            </div>
          ) : (
            <div className="responsive-table-wrapper shadow-xs">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      SKU & Producto
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Categoría
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Precio Vigente
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Físico
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Reservado
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Disponible
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  {stockItems.map((variant) => {
                    const status = formatStockStatus(variant.AvailableStock);

                    return (
                      <tr key={variant.IDVariant} className="transition hover:bg-elevated/40">
                        <td data-label="SKU & Producto" className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          <div className="font-mono text-xs font-bold text-primary">{variant.SKU}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{variant.ProductName}</div>
                        </td>
                        <td data-label="Categoría" className="px-4 py-3">
                          <span className="rounded-md border border-[var(--border-subtle)] bg-canvas px-2 py-0.5 text-[11px]">
                            {variant.CategoryName}
                          </span>
                        </td>
                        <td data-label="Precio" className="px-4 py-3 text-right font-mono font-semibold text-[var(--text-primary)]">
                          {formatGTQ(variant.Price)}
                        </td>
                        <td data-label="Físico" className="px-4 py-3 text-right font-mono font-bold text-[var(--text-primary)]">
                          {variant.PhysicalStock}
                        </td>
                        <td data-label="Reservado" className="px-4 py-3 text-right font-mono text-amber-400">
                          {variant.ReservedStock}
                        </td>
                        <td data-label="Disponible" className="px-4 py-3 text-center font-mono text-sm font-extrabold text-[var(--text-primary)]">
                          {variant.AvailableStock}
                        </td>
                        <td data-label="Estado" className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${status.colorClass}`}>
                            {status.label}
                          </span>
                        </td>
                        <td data-label="Acción" className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustmentModal(variant)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/40 bg-brand-950/40 px-2.5 py-1 text-xs font-semibold text-brand-300 shadow-xs transition hover:border-brand-400 hover:bg-brand-900"
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            Ajustar Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Stock Pagination */}
          {!isLoadingStock && stockItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
              <p>
                Mostrando <strong>{stockItems.length}</strong> de <strong>{stockTotal}</strong> variantes registradas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={stockPage <= 1}
                  onClick={() => setStockPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="font-mono text-xs">
                  Página {stockPage} de {stockTotalPages}
                </span>
                <button
                  type="button"
                  disabled={stockPage >= stockTotalPages}
                  onClick={() => setStockPage((prev) => Math.min(stockTotalPages, prev + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 2: KARDEX AUDIT LOG
         ========================================================================= */}
      {activeTab === 'kardex' && (
        <section aria-labelledby="kardex-heading" className="space-y-6">
          <h2 id="kardex-heading" className="sr-only">
            Libro Mayor Kardex e Historial de Movimientos Auditados
          </h2>

          {/* Kardex Filters Bar */}
          <form
            onSubmit={handleKardexFilterSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Movement Type Filter */}
              <select
                value={kardexMovementFilter}
                onChange={(e) => setKardexMovementFilter(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              >
                <option value="">Todos los tipos de movimiento</option>
                <option value="INITIAL_CHARGE">Carga Inicial</option>
                <option value="PURCHASE_ENTRY">Entrada por Compra</option>
                <option value="POSITIVE_ADJUSTMENT">Ajuste Físico (+)</option>
                <option value="SALE_EXIT">Salida por Venta</option>
                <option value="NEGATIVE_ADJUSTMENT">Merma / Ajuste (-)</option>
                <option value="CLIENT_RETURN">Devolución de Cliente</option>
              </select>

              {/* Start Date */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">Desde:</span>
                <input
                  type="date"
                  value={kardexStartDate}
                  onChange={(e) => setKardexStartDate(e.target.value)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">Hasta:</span>
                <input
                  type="date"
                  value={kardexEndDate}
                  onChange={(e) => setKardexEndDate(e.target.value)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900"
              >
                <Filter className="h-3.5 w-3.5" />
                Filtrar Kardex
              </button>
              {(kardexMovementFilter || kardexStartDate || kardexEndDate) && (
                <button
                  type="button"
                  onClick={handleKardexReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </form>

          {/* Kardex Table & States */}
          {isLoadingKardex ? (
            <div className="space-y-3" role="status" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skeleton-kardex-${i}`}
                  className="h-14 w-full rounded-xl border border-[var(--border-subtle)] bg-surface animate-pulse"
                />
              ))}
              <span className="sr-only">Cargando registros del Libro Mayor Kardex...</span>
            </div>
          ) : kardexError ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
            >
              <AlertCircle className="h-10 w-10 text-crimson-600" />
              <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                Error al consultar Kardex
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{kardexError}</p>
              <button
                type="button"
                onClick={() => void fetchKardex()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          ) : kardexItems.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
              <History className="h-10 w-10 text-[var(--text-muted)]" />
              <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                No hay movimientos de Kardex registrados
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                No se encontraron transacciones con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="responsive-table-wrapper shadow-xs">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Fecha / Hora
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      SKU & Producto
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Tipo Movimiento
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Saldo Ant.
                    </th>
                    <th scope="col" className="px-4 py-3 text-center font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Cantidad
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Nuevo Saldo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Motivo / Auditoría
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-mono text-[11px] uppercase text-[var(--text-muted)]">
                      Operador
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  {kardexItems.map((entry) => {
                    const meta = getKardexMeta(entry.MovementType);
                    const formattedDate = new Date(entry.MovementDate).toLocaleString('es-GT', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={entry.IDKardex} className="transition hover:bg-elevated/40">
                        <td data-label="Fecha" className="px-4 py-3 font-mono text-[11px] text-[var(--text-primary)]">
                          {formattedDate}
                        </td>
                        <td data-label="SKU & Producto" className="px-4 py-3">
                          <span className="font-mono font-bold text-primary">{entry.SKU}</span>
                          <div className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                            {entry.ProductName}
                          </div>
                        </td>
                        <td data-label="Tipo" className="px-4 py-3">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td data-label="Saldo Ant." className="px-4 py-3 text-right font-mono">
                          {entry.PreviousBalance}
                        </td>
                        <td data-label="Cantidad" className="px-4 py-3 text-center font-mono font-bold">
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 ${
                              meta.isPositive ? 'text-emerald-400' : 'text-crimson-600'
                            }`}
                          >
                            {meta.isPositive ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {meta.prefix}
                            {Math.abs(entry.Quantity)}
                          </span>
                        </td>
                        <td data-label="Nuevo Saldo" className="px-4 py-3 text-right font-mono font-extrabold text-[var(--text-primary)]">
                          {entry.NewBalance}
                        </td>
                        <td data-label="Motivo" className="px-4 py-3">
                          <div className="max-w-xs truncate text-[11px]" title={entry.Reason}>
                            {entry.Reason}
                          </div>
                          {entry.IDOrder && (
                            <span className="font-mono text-[10px] text-brand-400">
                              Pedido #{entry.IDOrder}
                            </span>
                          )}
                        </td>
                        <td data-label="Operador" className="px-4 py-3 font-mono text-[11px]">
                          {entry.OperatorName || `Usuario #${entry.IDUser}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Kardex Pagination */}
          {!isLoadingKardex && kardexItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
              <p>
                Mostrando <strong>{kardexItems.length}</strong> de <strong>{kardexTotal}</strong> movimientos registrados
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={kardexPage <= 1}
                  onClick={() => setKardexPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="font-mono text-xs">
                  Página {kardexPage} de {kardexTotalPages}
                </span>
                <button
                  type="button"
                  disabled={kardexPage >= kardexTotalPages}
                  onClick={() => setKardexPage((prev) => Math.min(kardexTotalPages, prev + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-surface px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          MODAL: MANUAL STOCK ADJUSTMENT (Audited Kardex Movement)
         ========================================================================= */}
      <ModalDialog
        isOpen={isAdjustmentModalOpen}
        onClose={handleCloseAdjustmentModal}
        title="Ajuste Manual de Inventario (Kardex)"
        subtitle="Registra una entrada física o salida por merma. Este movimiento es inmutable y genera una entrada auditable en el Libro Mayor Kardex."
      >
        {selectedVariant && (
          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            {/* Variant Information Card */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">{selectedVariant.SKU}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {selectedVariant.CategoryName}
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">
                {selectedVariant.ProductName}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-center font-mono">
                <div>
                  <span className="block text-[10px] uppercase text-[var(--text-muted)]">Físico</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedVariant.PhysicalStock}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[var(--text-muted)]">Reservado</span>
                  <span className="font-bold text-amber-400">{selectedVariant.ReservedStock}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-[var(--text-muted)]">Disponible</span>
                  <span className="font-extrabold text-emerald-400">{selectedVariant.AvailableStock}</span>
                </div>
              </div>
            </div>

            {/* Adjustment Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Tipo de Operación
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('POSITIVE')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                    adjustmentType === 'POSITIVE'
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                      : 'border-[var(--border-subtle)] bg-surface text-[var(--text-secondary)] hover:border-emerald-500/50'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Entrada (+) Incremento
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('NEGATIVE')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                    adjustmentType === 'NEGATIVE'
                      ? 'border-crimson-600 bg-crimson-950/60 text-red-300'
                      : 'border-[var(--border-subtle)] bg-surface text-[var(--text-secondary)] hover:border-crimson-600/50'
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Salida (-) Merma / Ajuste
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label htmlFor="adjust-quantity" className="block text-xs font-semibold text-[var(--text-primary)]">
                Cantidad de Unidades a {adjustmentType === 'POSITIVE' ? 'Sumar' : 'Restar'}
              </label>
              <input
                id="adjust-quantity"
                type="number"
                min="1"
                step="1"
                required
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 font-mono text-sm font-bold text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Audit Reason Textarea */}
            <div>
              <label htmlFor="adjust-reason" className="block text-xs font-semibold text-[var(--text-primary)]">
                Motivo / Justificación Obligatoria (Mín. 5 caracteres)
              </label>
              <textarea
                id="adjust-reason"
                rows={3}
                required
                minLength={5}
                maxLength={255}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ejemplo: Conteo físico mensual de bodega 2, merma por embalaje dañado..."
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-primary focus:outline-hidden"
              />
            </div>

            {/* Impact Calculation Preview */}
            {(() => {
              const delta = adjustmentType === 'POSITIVE' ? adjustmentQuantity : -adjustmentQuantity;
              const projected = calculateProjectedStock(selectedVariant.PhysicalStock, delta);
              const isInvalid = projected < 0;

              return (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    isInvalid
                      ? 'border-crimson-600/40 bg-crimson-950/40 text-red-300'
                      : 'border-brand-400/30 bg-surface text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    Proyección de Saldo en SQL Server:
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono">
                    <span>Stock Físico Resultante:</span>
                    <span className="font-bold">
                      {selectedVariant.PhysicalStock} {delta > 0 ? '+' : ''}
                      {delta} ={' '}
                      <strong className={isInvalid ? 'text-crimson-600' : 'text-emerald-400'}>
                        {projected} unidades
                      </strong>
                    </span>
                  </div>
                  {isInvalid && (
                    <p className="mt-1.5 text-[11px] font-semibold text-crimson-600">
                      Error: El ajuste excede el stock físico existente en bodega.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Server Feedback Alert */}
            {adjustmentFeedback && (
              <div
                role="alert"
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  adjustmentFeedback.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-crimson-600/40 bg-crimson-950/40 text-red-300'
                }`}
              >
                {adjustmentFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-crimson-600" />
                )}
                <p>{adjustmentFeedback.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={handleCloseAdjustmentModal}
                disabled={isSubmittingAdjustment}
                className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  isSubmittingAdjustment ||
                  adjustmentReason.trim().length < 5 ||
                  calculateProjectedStock(
                    selectedVariant.PhysicalStock,
                    adjustmentType === 'POSITIVE' ? adjustmentQuantity : -adjustmentQuantity
                  ) < 0
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingAdjustment ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Registrando en Kardex...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmar y Registrar Ajuste
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}
