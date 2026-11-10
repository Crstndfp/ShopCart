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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
              <BarChart3 className="h-3.5 w-3.5" />
              RF-08 · REPORTES Y DASHBOARD ANALÍTICO
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
              Don Arturo · Administración
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard Ejecutivo y Reportes de Negocio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Métricas de ingresos en tiempo real, desglose fiscal, rendimiento por categoría, top productos y carritos abandonados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchReports()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          ) : (
            <RotateCcw className="h-4 w-4 text-sky-400" />
          )}
          Actualizar Datos
        </button>
      </div>

      {/* Date Range Selector Presets */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Período:
          </span>
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
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
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  datePreset === preset.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:border-sky-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500">hasta</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-crimson-600/40 bg-crimson-950/30 p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-crimson-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Net Sales */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Ventas Netas</span>
            <div className="rounded-lg bg-emerald-900/50 p-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-300">
            {formatGTQ(kpis.totalNetSales)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-500/80">
            <span>Bruto: {formatGTQ(kpis.totalGrossSales)}</span>
            <span>{kpis.daysWithSales} días act.</span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-300">Órdenes Pagadas</span>
            <div className="rounded-lg bg-sky-900/50 p-2 text-sky-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-300">{kpis.totalOrders}</p>
          <span className="text-xs text-sky-500/80">Confirmadas en el período</span>
        </div>

        {/* KPI 3: Average Ticket */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300">Ticket Promedio</span>
            <div className="rounded-lg bg-indigo-900/50 p-2 text-indigo-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-indigo-300">
            {formatGTQ(kpis.averageTicket)}
          </p>
          <span className="text-xs text-indigo-500/80">Por orden de compra</span>
        </div>

        {/* KPI 4: Refunded Amount */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-300">Devoluciones</span>
            <div className="rounded-lg bg-orange-900/50 p-2 text-orange-400">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-orange-300">
            {formatGTQ(kpis.totalRefunded)}
          </p>
          <span className="text-xs text-orange-500/80">Reintegrado a Kardex</span>
        </div>

        {/* KPI 5: Abandoned Carts */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Carritos Abandonados</span>
            <div className="rounded-lg bg-amber-900/50 p-2 text-amber-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {abandonedCarts.length}
          </p>
          <span className="text-xs text-amber-500/80">
            Est: {formatGTQ(totalAbandonedAmount)}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('trend')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'trend'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Tendencia de Ventas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'categories'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          Ventas por Categoría ({categorySales.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'products'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Top Productos Más Vendidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('abandoned')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'abandoned'
              ? 'border-sky-500 text-sky-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Carritos Abandonados ({abandonedCarts.length})
        </button>
      </div>

      {/* Tab 1: Sales Trend */}
      {activeTab === 'trend' && (
        <div className="space-y-6">
          {/* Visual Sales Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Ingresos Diarios de Ventas Netas (GTQ)
                </h3>
                <p className="text-xs text-slate-400">
                  Volumen facturado por jornada con desglose de pedidos
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Pico máximo del período: {formatGTQ(maxDailySales)}
              </span>
            </div>

            {salesSummary.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                No se registraron ventas en el rango de fechas seleccionado.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex h-56 items-end gap-2 sm:gap-4 overflow-x-auto pt-6 pb-2 px-2">
                  {salesSummary.map((item, idx) => {
                    const net = Number(item.NetSalesAmount) || 0;
                    const heightPercent = Math.max(
                      Math.round((net / maxDailySales) * 100),
                      6
                    );
                    const dateObj = new Date(item.SalesDate);
                    const formattedDate = dateObj.toLocaleDateString('es-GT', {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={idx}
                        className="group relative flex flex-1 flex-col items-center justify-end h-full min-w-[48px]"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-10 hidden whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-center text-[11px] shadow-lg group-hover:block">
                          <p className="font-semibold text-emerald-400">
                            {formatGTQ(net)}
                          </p>
                          <p className="text-slate-400">
                            {item.TotalOrdersCount} {item.TotalOrdersCount === 1 ? 'pedido' : 'pedidos'}
                          </p>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-emerald-400 transition-all group-hover:from-sky-500 group-hover:to-emerald-300"
                        />

                        {/* Date label */}
                        <span className="mt-2 text-[10px] font-mono text-slate-400">
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
          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
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
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {salesSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Sin datos para mostrar.
                    </td>
                  </tr>
                ) : (
                  salesSummary.map((item, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">
                        {new Date(item.SalesDate).toLocaleDateString('es-GT', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-white">
                        {item.TotalOrdersCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                        {formatGTQ(item.GrossSalesAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-orange-400">
                        {Number(item.TotalRefundedAmount) > 0
                          ? `-${formatGTQ(item.TotalRefundedAmount)}`
                          : formatGTQ(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                        {formatGTQ(item.NetSalesAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Distribución Porcentual de Ventas por Categoría
            </h3>

            <div className="space-y-3">
              {categorySales.map((cat) => (
                <div key={cat.IDCategory} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">
                      {cat.CategoryName} ({cat.NetUnitsSold} unid.)
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatGTQ(cat.NetCategorySales)} · {cat.percentageOfTotal}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-800">
                    <div
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentageOfTotal))}%` }}
                      className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Detailed Table */}
          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
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
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {categorySales.map((cat) => (
                  <tr
                    key={cat.IDCategory}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {cat.CategoryName}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-200">
                      {cat.OrdersCount}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-white">
                      {cat.NetUnitsSold}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                      {formatGTQ(cat.GrossCategorySales)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-orange-400">
                      {Number(cat.CategoryRefundedAmount) > 0
                        ? `-${formatGTQ(cat.CategoryRefundedAmount)}`
                        : formatGTQ(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                      {formatGTQ(cat.NetCategorySales)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-sky-400">
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
            <span className="text-xs text-slate-400">
              Ranking de productos por facturación neta y unidades despachadas
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mostrar:</span>
              <select
                value={topProductsLimit}
                onChange={(e) => setTopProductsLimit(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:border-sky-500 focus:outline-none"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </select>
            </div>
          </div>

          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
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
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
                        className="transition-colors hover:bg-slate-800/40"
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
                                    : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {p.ProductName}
                          </div>
                          <span className="font-mono text-xs text-sky-400">
                            {p.SKU}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          {p.CategoryName}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">
                          {p.NetUnitsSold}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-bold text-emerald-400">
                            {formatGTQ(p.NetProductSales)}
                          </div>
                          <div className="mt-1 h-1.5 w-24 ml-auto rounded-full bg-slate-800">
                            <div
                              style={{ width: `${relativePercent}%` }}
                              className="h-1.5 rounded-full bg-emerald-400"
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4 text-amber-400" />
              Oportunidad de Recuperación de Ventas
            </div>
            <p className="mt-1 text-slate-300">
              Carritos creados que superan las 24 horas de inactividad sin haber completado el checkout. Incluye usuarios registrados e invitados anónimos.
            </p>
          </div>

          <div className="responsive-table-wrapper rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
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
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {abandonedCarts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <ShoppingCart className="mx-auto mb-2 h-7 w-7 text-slate-600" />
                      No hay carritos abandonados (&gt; 24h) en este momento.
                    </td>
                  </tr>
                ) : (
                  abandonedCarts.map((c) => (
                    <tr
                      key={c.IDCart}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                        #{c.IDCart}
                      </td>
                      <td className="px-4 py-3">
                        {c.CustomerName ? (
                          <>
                            <div className="font-semibold text-white">
                              {c.CustomerName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {c.CustomerEmail}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400">
                            Invitado anónimo:{' '}
                            <span className="font-mono text-slate-500">
                              {c.GuestToken ? `${c.GuestToken.slice(0, 14)}...` : 'N/A'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {new Date(c.LastActivityAt).toLocaleString('es-GT')}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-amber-400">
                        {c.InactiveHours} horas
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-white">
                        {c.TotalItemsCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
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
