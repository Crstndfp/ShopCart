import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CreditCard,
  Layers,
  Loader2,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { reportApi } from '../api/report.api.js';
import { HttpError } from '../api/http-client.js';
import { formatGTQ } from '../types/catalog.types.js';
import {
  calculateCategoryShare,
  calculateSalesKPIs,
  getDateRangeFromPreset,
  type AbandonedCartItem,
  type CategoryShareItem,
  type SalesSummaryItem,
  type TopSellingProductItem,
} from '../types/report.types.js';

type DatePreset = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<'trend' | 'categories' | 'products' | 'abandoned'>('trend');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Data states
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [categorySales, setCategorySales] = useState<CategoryShareItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopSellingProductItem[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartItem[]>([]);
  const [topProductsLimit, setTopProductsLimit] = useState<number>(10);

  // Loading & error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    let start: string | undefined;
    let end: string | undefined;

    if (datePreset === 'custom') {
      start = customStart || undefined;
      end = customEnd || undefined;
    } else {
      const range = getDateRangeFromPreset(datePreset);
      start = range.startDate;
      end = range.endDate;
    }

    try {
      const [summaryRes, categoryRes, productsRes, abandonedRes] = await Promise.all([
        reportApi.getSalesSummary({ startDate: start, endDate: end }),
        reportApi.getSalesByCategory(),
        reportApi.getTopSellingProducts({ limit: topProductsLimit }),
        reportApi.getAbandonedCarts(),
      ]);

      setSalesSummary(summaryRes || []);
      setCategorySales(calculateCategoryShare(categoryRes || []));
      setTopProducts(productsRes || []);
      setAbandonedCarts(abandonedRes || []);
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.message
          : 'Error al consultar los reportes ejecutivos en SQL Server.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [datePreset, customStart, customEnd, topProductsLimit]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  // Aggregated KPI calculations
  const kpis = calculateSalesKPIs(salesSummary);

  const totalAbandonedAmount = abandonedCarts.reduce(
    (sum, c) => sum + (Number(c.EstimatedCartTotal) || 0),
    0
  );

  const maxDailySales = Math.max(
    ...salesSummary.map((s) => Number(s.NetSalesAmount) || 0),
    1
  );

  const maxProductSales = Math.max(
    ...topProducts.map((p) => Number(p.NetProductSales) || 0),
    1
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10 space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-400/40 bg-brand-900/60 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-300">
              <BarChart3 className="h-3.5 w-3.5" />
              RF-08 · REPORTES Y DASHBOARD ANALÍTICO
            </span>
            <span className="rounded-md border border-[var(--border-subtle)] bg-surface px-2.5 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
              Don Arturo · Administración
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Dashboard Ejecutivo y Reportes de Negocio
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Métricas de ingresos en tiempo real, desglose fiscal, rendimiento por categoría, top productos y carritos abandonados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchReports()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition hover:border-primary hover:text-primary sm:self-auto disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <RotateCcw className="h-4 w-4 text-primary" />
          )}
          Actualizar Datos
        </button>
      </header>

      {/* Date Range Selector Presets */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Período:
          </span>
          <div className="inline-flex flex-wrap rounded-xl border border-[var(--border-subtle)] bg-canvas p-1 text-xs">
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: '7d', label: '7 días' },
                { id: '30d', label: '30 días' },
                { id: '90d', label: '90 días' },
                { id: 'all', label: 'Histórico' },
                { id: 'custom', label: 'Personalizado' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  datePreset === preset.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            />
            <span className="text-xs text-[var(--text-muted)]">hasta</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
            />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-crimson-600/40 bg-surface p-4 text-xs text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 text-crimson-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Métricas ejecutivas de ventas">
        {/* KPI 1: Net Sales */}
        <div className="rounded-2xl border border-emerald-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-500 dark:text-emerald-400">
            <span className="font-mono uppercase font-semibold">Ventas Netas</span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatGTQ(kpis.totalNetSales)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Bruto: {formatGTQ(kpis.totalGrossSales)}</span>
            <span>{kpis.daysWithSales} días act.</span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="rounded-2xl border border-brand-400/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-brand-500 dark:text-brand-300">
            <span className="font-mono uppercase font-semibold">Órdenes Pagadas</span>
            <div className="rounded-lg bg-brand-500/10 p-1.5 text-brand-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-brand-600 dark:text-brand-300">{kpis.totalOrders}</p>
          <span className="text-[11px] text-[var(--text-muted)]">Confirmadas en el período</span>
        </div>

        {/* KPI 3: Average Ticket */}
        <div className="rounded-2xl border border-indigo-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-500 dark:text-indigo-400">
            <span className="font-mono uppercase font-semibold">Ticket Promedio</span>
            <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-500">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {formatGTQ(kpis.averageTicket)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Por orden de compra</span>
        </div>

        {/* KPI 4: Refunded Amount */}
        <div className="rounded-2xl border border-orange-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-orange-500 dark:text-orange-400">
            <span className="font-mono uppercase font-semibold">Devoluciones</span>
            <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-500">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-orange-600 dark:text-orange-400">
            {formatGTQ(kpis.totalRefunded)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Reintegrado a Kardez</span>
        </div>

        {/* KPI 5: Abandoned Carts */}
        <div className="rounded-2xl border border-amber-500/30 bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-500 dark:text-amber-400">
            <span className="font-mono uppercase font-semibold">Carritos Abandonados</span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {abandonedCarts.length}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">
            Est: {formatGTQ(totalAbandonedAmount)}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] text-xs font-semibold" role="tablist">
        <button
          type="button"
          onClick={() => setActiveTab('trend')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'trend'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Tendencia de Ventas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="h-4 w-4" />
          Ventas por Categoría ({categorySales.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Top Productos Más Vendidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('abandoned')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'abandoned'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Carritos Abandonados ({abandonedCarts.length})
        </button>
      </div>

      {/* Tab 1: Sales Trend */}
      {activeTab === 'trend' && (
        <div className="space-y-6">
          {/* Visual Sales Bar Chart (Proportionally Scaled & Capped Width) */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">
                  Ingresos Diarios de Ventas Netas (GTQ)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Volumen facturado por jornada con desglose de pedidos
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Pico máximo del período: {formatGTQ(maxDailySales)}
              </span>
            </div>

            {salesSummary.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)]">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
                No se registraron ventas en el rango de fechas seleccionado.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex h-64 items-end gap-3 sm:gap-6 overflow-x-auto pt-8 pb-3 px-4 justify-start sm:justify-center">
                  {salesSummary.map((item, idx) => {
                    const net = Number(item.NetSalesAmount) || 0;
                    const heightPercent = Math.max(
                      Math.round((net / maxDailySales) * 100),
                      8
                    );
                    const dateObj = new Date(item.SalesDate);
                    const formattedDate = dateObj.toLocaleDateString('es-GT', {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={idx}
                        className="group relative flex flex-col items-center justify-end h-full w-12 sm:w-14 shrink-0"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden whitespace-nowrap rounded-xl border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-center text-xs shadow-xl group-hover:block pointer-events-none">
                          <p className="font-bold text-emerald-500 dark:text-emerald-400">
                            {formatGTQ(net)}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {item.TotalOrdersCount} {item.TotalOrdersCount === 1 ? 'pedido' : 'pedidos'}
                          </p>
                        </div>

                        {/* Value above bar */}
                        <span className="mb-1.5 text-[10px] font-mono font-semibold text-[var(--text-muted)] group-hover:text-primary transition-colors">
                          {net > 0 ? (net >= 1000 ? `${(net / 1000).toFixed(1)}k` : Math.round(net)) : '0'}
                        </span>

                        {/* Bar Track & Fill */}
                        <div className="w-8 sm:w-10 h-full flex items-end rounded-t-xl bg-canvas border border-[var(--border-subtle)] p-0.5">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-emerald-400 transition-all group-hover:from-brand-500 group-hover:to-emerald-300 shadow-xs"
                          />
                        </div>

                        {/* Date label */}
                        <span className="mt-2 text-[10px] font-mono font-semibold text-[var(--text-secondary)]">
                          {formattedDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Daily Table Breakdown */}
          <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Órdenes
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Ventas Brutas
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Devoluciones
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Ventas Netas
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Ticket Promedio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                {salesSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      Sin datos para mostrar.
                    </td>
                  </tr>
                ) : (
                  salesSummary.map((item, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-elevated/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                        {new Date(item.SalesDate).toLocaleDateString('es-GT', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">
                        {item.TotalOrdersCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)]">
                        {formatGTQ(item.GrossSalesAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-orange-500">
                        {Number(item.TotalRefundedAmount) > 0
                          ? `-${formatGTQ(item.TotalRefundedAmount)}`
                          : formatGTQ(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatGTQ(item.NetSalesAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-primary)]">
                        {formatGTQ(item.AverageOrderTicket)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sales By Category */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Category Distribution Visual Bars */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Distribución Porcentual de Ventas por Categoría
            </h3>

            <div className="space-y-3">
              {categorySales.map((cat) => (
                <div key={cat.IDCategory} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {cat.CategoryName} ({cat.NetUnitsSold} unid.)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatGTQ(cat.NetCategorySales)} · {cat.percentageOfTotal}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-canvas border border-[var(--border-subtle)]">
                    <div
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentageOfTotal))}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-400 transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Detailed Table */}
          <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Órdenes
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Unidades Vendidas
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Venta Bruta
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Devoluciones
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Venta Neta
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    % Participación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                {categorySales.map((cat) => (
                  <tr
                    key={cat.IDCategory}
                    className="transition-colors hover:bg-elevated/40"
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                      {cat.CategoryName}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[var(--text-primary)]">
                      {cat.OrdersCount}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">
                      {cat.NetUnitsSold}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-muted)]">
                      {formatGTQ(cat.GrossCategorySales)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-orange-500">
                      {Number(cat.CategoryRefundedAmount) > 0
                        ? `-${formatGTQ(cat.CategoryRefundedAmount)}`
                        : formatGTQ(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatGTQ(cat.NetCategorySales)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-primary">
                      {cat.percentageOfTotal}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Top Selling Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              Ranking de productos por facturación neta y unidades despachadas
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Mostrar:</span>
              <select
                value={topProductsLimit}
                onChange={(e) => setTopProductsLimit(Number(e.target.value))}
                className="rounded-xl border border-[var(--border-subtle)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-primary focus:outline-hidden"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </div>
          </div>

          <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-center w-12">
                    Pos.
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Producto / Variante SKU
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Unidades Vendidas
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Ingresos Generados
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      No hay registros de ventas para el ranking.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => {
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;
                    const relativePercent = Math.round(
                      (Number(p.NetProductSales) / maxProductSales) * 100
                    );

                    return (
                      <tr
                        key={`${p.IDProduct}-${p.IDVariant}`}
                        className="transition-colors hover:bg-elevated/40"
                      >
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isTop1
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/30'
                                : isTop2
                                  ? 'bg-slate-300 text-slate-950'
                                  : isTop3
                                    ? 'bg-amber-700 text-amber-100'
                                    : 'border border-[var(--border-strong)] bg-canvas text-[var(--text-muted)]'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--text-primary)]">
                            {p.ProductName}
                          </div>
                          <span className="font-mono text-xs font-bold text-primary">
                            {p.SKU}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {p.CategoryName}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">
                          {p.NetUnitsSold}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatGTQ(p.NetProductSales)}
                          </div>
                          <div className="mt-1 h-1.5 w-24 ml-auto rounded-full bg-canvas border border-[var(--border-subtle)]">
                            <div
                              style={{ width: `${relativePercent}%` }}
                              className="h-full rounded-full bg-emerald-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Abandoned Carts */}
      {activeTab === 'abandoned' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-surface p-4 text-xs text-amber-400 shadow-xs">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4 text-amber-400" />
              Oportunidad de Recuperación de Ventas
            </div>
            <p className="mt-1 text-[var(--text-secondary)]">
              Carritos creados que superan las 24 horas de inactividad sin haber completado el checkout. Incluye usuarios registrados e invitados anónimos.
            </p>
          </div>

          <div className="responsive-table-wrapper rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="border-b border-[var(--border-subtle)] bg-surface font-mono text-[11px] uppercase text-[var(--text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    ID Carrito
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Usuario / Sesión
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Última Actividad
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Inactividad
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-center">
                    Artículos
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    Valor Estimado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                {abandonedCarts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      <ShoppingCart className="mx-auto mb-2 h-7 w-7 text-[var(--text-muted)]" />
                      No hay carritos abandonados (&gt; 24h) en este momento.
                    </td>
                  </tr>
                ) : (
                  abandonedCarts.map((c) => (
                    <tr
                      key={c.IDCart}
                      className="transition-colors hover:bg-elevated/40"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                        #{c.IDCart}
                      </td>
                      <td className="px-4 py-3">
                        {c.CustomerName ? (
                          <>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {c.CustomerName}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {c.CustomerEmail}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)]">
                            Invitado anónimo:{' '}
                            <span className="font-mono text-primary">
                              {c.GuestToken ? `${c.GuestToken.slice(0, 14)}...` : 'N/A'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {new Date(c.LastActivityAt).toLocaleString('es-GT')}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-amber-400">
                        {c.InactiveHours} horas
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">
                        {c.TotalItemsCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatGTQ(c.EstimatedCartTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
