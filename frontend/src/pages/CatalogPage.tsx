import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Package,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { catalogApi } from '../api/catalog.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import { useAuth } from '../context/AuthContext.js';
import { translateBackendError } from '../utils/i18n-errors.js';
import {
  formatGTQ,
  formatPriceRangeGTQ,
  parseVariantAttributes,
  type CatalogProductSummary,
  type CatalogSortBy,
  type CatalogSortDir,
  type CategoryItem,
  type PaginationMetadata,
  type ProductDetail,
  type ProductVariant,
} from '../types/catalog.types.js';

function CatalogSkeletonGrid() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando productos en cuadrícula"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`catalog-skeleton-grid-${index}`}
          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs animate-pulse"
        >
          <div>
            <div className="relative aspect-[16/10] w-full bg-[var(--bg-elevated)]">
              <div className="absolute top-3 left-3 h-5 w-20 rounded-md bg-[var(--border-subtle)]" />
              <div className="absolute top-3 right-3 h-5 w-16 rounded-md bg-[var(--border-subtle)]" />
            </div>

            <div className="space-y-2.5 p-4 sm:p-5">
              <div className="h-5 w-3/4 rounded-md bg-[var(--bg-elevated)]" />
              <div className="h-3.5 w-full rounded-md bg-[var(--bg-elevated)]" />
              <div className="h-3.5 w-2/3 rounded-md bg-[var(--bg-elevated)]" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-elevated/40 px-4 py-3.5 sm:px-5">
            <div className="space-y-1">
              <div className="h-2.5 w-16 rounded-md bg-[var(--border-subtle)]" />
              <div className="h-5 w-24 rounded-md bg-[var(--border-subtle)]" />
            </div>
            <div className="h-8 w-28 rounded-xl bg-[var(--border-subtle)]" />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando catálogo de productos en formato cuadrícula...</span>
    </div>
  );
}

function CatalogSkeletonList() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando productos en lista"
      className="space-y-3.5"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`catalog-skeleton-list-${index}`}
          className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs animate-pulse sm:flex-row sm:items-stretch"
        >
          <div className="relative aspect-[16/10] w-full shrink-0 bg-[var(--bg-elevated)] sm:aspect-square sm:w-44 md:w-52" />

          <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-20 rounded-md bg-[var(--border-subtle)]" />
                <div className="h-4 w-16 rounded-md bg-[var(--border-subtle)]" />
              </div>
              <div className="mt-3 h-5 w-2/3 rounded-md bg-[var(--bg-elevated)]" />
              <div className="mt-2.5 space-y-1.5">
                <div className="h-3.5 w-full rounded-md bg-[var(--bg-elevated)]" />
                <div className="h-3.5 w-4/5 rounded-md bg-[var(--bg-elevated)]" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3.5">
              <div className="space-y-1">
                <div className="h-2.5 w-16 rounded-md bg-[var(--border-subtle)]" />
                <div className="h-6 w-28 rounded-md bg-[var(--border-subtle)]" />
              </div>
              <div className="h-8 w-28 rounded-xl bg-[var(--border-subtle)]" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando catálogo de productos en formato lista...</span>
    </div>
  );
}

export function CatalogPage() {
  const { user } = useAuth();

  // Filter States
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<CatalogSortBy>('NAME');
  const [sortDir, setSortDir] = useState<CatalogSortDir>('ASC');
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data & Status States
  const [products, setProducts] = useState<CatalogProductSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Product Detail & Variant Modal States
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Load Categories on Mount
  useEffect(() => {
    catalogApi
      .listCategories(true)
      .then((list) => setCategories(list))
      .catch(() => {
        // Non-blocking if categories fail initially
      });
  }, []);

  // Fetch Filtered Products
  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsedMin = minPriceInput.trim() !== '' ? Number(minPriceInput) : undefined;
      const parsedMax = maxPriceInput.trim() !== '' ? Number(maxPriceInput) : undefined;

      const response = await catalogApi.searchProducts({
        search: appliedSearch || undefined,
        categoryId: selectedCategoryId,
        minPrice: parsedMin !== undefined && !Number.isNaN(parsedMin) ? parsedMin : undefined,
        maxPrice: parsedMax !== undefined && !Number.isNaN(parsedMax) ? parsedMax : undefined,
        onlyInStock,
        sortBy,
        sortDir,
        page,
        limit: 12,
      });

      setProducts(response.data || []);
      setPagination(
        response.pagination || {
          page: 1,
          limit: 12,
          total: response.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      if (error instanceof HttpError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No fue posible cargar el catálogo de productos.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    appliedSearch,
    selectedCategoryId,
    minPriceInput,
    maxPriceInput,
    onlyInStock,
    sortBy,
    sortDir,
    page,
  ]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setSelectedCategoryId(undefined);
    setMinPriceInput('');
    setMaxPriceInput('');
    setOnlyInStock(false);
    setSortBy('NAME');
    setSortDir('ASC');
    setPage(1);
  };

  // Open Product Detail Modal
  const handleOpenProductDetail = async (idProduct: number) => {
    setSelectedProductId(idProduct);
    setProductDetail(null);
    setDetailError(null);
    setCartFeedback(null);
    setQuantity(1);
    setIsLoadingDetail(true);

    try {
      const detail = await catalogApi.getProductById(idProduct);
      setProductDetail(detail);
      const activeVariants = (detail.Variants || []).filter((v) => v.IsActive);
      const firstAvailable =
        activeVariants.find((v) => v.AvailableStock > 0) ?? activeVariants[0] ?? null;
      setSelectedVariantId(firstAvailable ? firstAvailable.IDVariant : null);
    } catch (error) {
      if (error instanceof HttpError) {
        setDetailError(error.message);
      } else {
        setDetailError('No se pudo cargar el detalle del producto.');
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedProductId(null);
    setProductDetail(null);
    setCartFeedback(null);
  };

  const selectedVariant: ProductVariant | undefined = productDetail?.Variants?.find(
    (v) => v.IDVariant === selectedVariantId
  );

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    if (quantity > selectedVariant.AvailableStock) {
      setCartFeedback({
        type: 'warning',
        message: `Existencias limitadas: No puedes agregar ${quantity} unidades porque solo hay ${selectedVariant.AvailableStock} disponible(s) en bodega.`,
      });
      return;
    }

    setIsAddingToCart(true);
    setCartFeedback(null);

    try {
      await catalogApi.addItemToCart(selectedVariant.IDVariant, quantity);
      setCartFeedback({
        type: 'success',
        message: `Se agregaron ${quantity} unidad(es) de SKU ${selectedVariant.SKU} a tu carrito.`,
      });
    } catch (error) {
      setCartFeedback({
        type: 'error',
        message: translateBackendError(
          error,
          'No se pudo agregar el producto al carrito.'
        ),
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
      {/* Search & Filter Controls Bar (100% Responsive) */}
      <section
        aria-label="Filtros y búsqueda de productos"
        className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-xs sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                enterKeyHint="search"
                placeholder="Buscar por nombre de producto, descripción o SKU..."
                aria-label="Buscar productos"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas py-2.5 pr-4 pl-10 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {/* View Mode Toggle: Grid vs List */}
            <div
              role="group"
              aria-label="Modo de visualización"
              className="inline-flex items-center rounded-xl border border-[var(--border-strong)] bg-canvas p-1"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                title="Vista en Cuadrícula"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden md:inline">Cuadrícula</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                title="Vista en Lista"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "list"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden md:inline">Lista</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              aria-expanded={showMobileFilters}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filtros
            </button>

            {user?.role === "ADMINISTRATOR" && (
              <Link
                to="/admin/catalog"
                className="hidden items-center gap-1.5 rounded-xl border border-brand-400/40 bg-navy-950 px-3 py-2 text-xs font-semibold text-brand-400 transition hover:bg-brand-900 hover:text-white md:inline-flex"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Category Pills (Scrollable on Mobile) */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId(undefined);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategoryId === undefined
                ? 'bg-primary text-white shadow-xs'
                : 'border border-[var(--border-subtle)] bg-canvas text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas las categorías
          </button>
          {categories.map((cat) => (
            <button
              key={cat.IDCategory}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.IDCategory);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategoryId === cat.IDCategory
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-[var(--border-subtle)] bg-canvas text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Tag className="h-3 w-3" />
              {cat.Name}
              {typeof cat.ActiveProductsCount === 'number' && (
                <span className="rounded-full bg-black/15 px-1.5 py-0.2 font-mono text-[10px]">
                  {cat.ActiveProductsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Advanced Filter Grid (Always visible on lg+, toggleable on mobile/tablet) */}
        <div
          className={`mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-5 ${
            showMobileFilters ? 'grid' : 'hidden lg:grid'
          }`}
        >
          <div>
            <label
              htmlFor="filter-min-price"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Precio mínimo (GTQ)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min="0"
              step="0.01"
              value={minPriceInput}
              onChange={(e) => {
                setMinPriceInput(e.target.value);
                setPage(1);
              }}
              placeholder="Q0.00"
              className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="filter-max-price"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Precio máximo (GTQ)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min="0"
              step="0.01"
              value={maxPriceInput}
              onChange={(e) => {
                setMaxPriceInput(e.target.value);
                setPage(1);
              }}
              placeholder="Sin límite"
              className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="filter-sort-by"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Ordenar por
            </label>
            <div className="mt-1 flex gap-1.5">
              <select
                id="filter-sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as CatalogSortBy);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-canvas px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <option value="NAME">Nombre</option>
                <option value="PRICE">Precio</option>
                <option value="NEWEST">Más recientes</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                  setPage(1);
                }}
                title={`Dirección actual: ${sortDir}`}
                aria-label="Cambiar dirección de ordenamiento"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-canvas px-2.5 py-1.5 font-mono text-xs font-semibold text-[var(--text-primary)] hover:border-primary"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                {sortDir}
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-canvas px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => {
                  setOnlyInStock(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded accent-brand-600"
              />
              <span>Solo con stock disponible</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-primary hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      {/* Main Content States: Loading (Skeletons) / Error / Empty / Responsive Grid/List */}
      <section className="mt-6" aria-live="polite">
        {isLoading ? (
          viewMode === 'grid' ? (
            <CatalogSkeletonGrid />
          ) : (
            <CatalogSkeletonList />
          )
        ) : errorMessage ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center"
          >
            <AlertCircle className="h-10 w-10 text-crimson-600" />
            <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
              Error al cargar el catálogo
            </h2>
            <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void fetchCatalog()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface p-8 text-center">
            <Filter className="h-10 w-10 text-[var(--text-muted)]" />
            <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
              No se encontraron productos con estos filtros
            </h2>
            <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
              Intenta ampliar tu búsqueda, cambiar la categoría seleccionada o restablecer los
              filtros de precio.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
              <p>
                Mostrando <strong>{products.length}</strong> de{' '}
                <strong>{pagination.total}</strong> productos encontrados
              </p>
              <p className="font-mono">
                Página {pagination.page} de {pagination.totalPages}
              </p>
            </div>

            {/* Products Display: Conditional Grid vs List View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const hasStock = product.TotalAvailableStock > 0;

                  return (
                    <article
                      key={product.IDProduct}
                      className="catalog-card-container group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs transition hover:border-primary hover:shadow-md"
                    >
                      <div>
                        {/* Media Container with explicit aspect-ratio (16:10) to prevent CLS */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-navy-900">
                          {product.MainImageUrl ? (
                            <img
                              src={product.MainImageUrl}
                              alt={product.ProductName}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="pentandra-grid-bg flex h-full w-full flex-col items-center justify-center p-4 text-center">
                              <Package className="h-10 w-10 text-brand-400/80" />
                              <span className="mt-2 font-mono text-[11px] tracking-wider text-slate-300 uppercase">
                                {product.CategoryName}
                              </span>
                            </div>
                          )}

                          {/* Category Tag */}
                          <span className="absolute top-3 left-3 rounded-lg border border-navy-700 bg-navy-950/90 px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-400">
                            {product.CategoryName}
                          </span>

                          {/* Real-Time Stock Badge */}
                          <span
                            className={`absolute top-3 right-3 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold shadow-xs ${
                              hasStock
                                ? "border border-emerald-500/40 bg-emerald-950/90 text-emerald-300"
                                : "bg-crimson-600 text-white"
                            }`}
                          >
                            {hasStock
                              ? `${product.TotalAvailableStock} disp.`
                              : "Agotado"}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 sm:p-5">
                          <h2 className="line-clamp-1 text-base font-bold text-[var(--text-primary)] group-hover:text-primary">
                            {product.ProductName}
                          </h2>
                          <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-[var(--text-secondary)]">
                            {product.Description || "Sin descripción adicional registrada."}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-elevated/40 px-4 py-3.5 sm:px-5">
                        <div>
                          <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                            Precio Vigente
                          </span>
                          <span className="text-base font-extrabold text-[var(--text-primary)]">
                            {formatPriceRangeGTQ(product.MinPrice, product.MaxPrice)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenProductDetail(product.IDProduct)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Opciones
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* List View Mode (100% Responsive with Horizontal Card layout) */
              <div className="space-y-3.5">
                {products.map((product) => {
                  const hasStock = product.TotalAvailableStock > 0;

                  return (
                    <article
                      key={product.IDProduct}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-xs transition hover:border-primary sm:flex-row sm:items-stretch"
                    >
                      {/* Media Column */}
                      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-navy-900 sm:aspect-square sm:w-44 md:w-52">
                        {product.MainImageUrl ? (
                          <img
                            src={product.MainImageUrl}
                            alt={product.ProductName}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="pentandra-grid-bg flex h-full w-full flex-col items-center justify-center p-3 text-center">
                            <Package className="h-8 w-8 text-brand-400/80" />
                            <span className="mt-1 font-mono text-[10px] tracking-wider text-slate-300 uppercase">
                              {product.CategoryName}
                            </span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 rounded-md border border-navy-700 bg-navy-950/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-400 sm:hidden">
                          {product.CategoryName}
                        </span>
                      </div>

                      {/* Content Column */}
                      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="hidden rounded-md border border-navy-700 bg-navy-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-400 sm:inline-flex">
                              {product.CategoryName}
                            </span>
                            <span
                              className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold ${
                                hasStock
                                  ? "border border-emerald-500/40 bg-emerald-950/90 text-emerald-300"
                                  : "bg-crimson-600 text-white"
                              }`}
                            >
                              {hasStock ? `${product.TotalAvailableStock} disp.` : "Agotado"}
                            </span>
                          </div>

                          <h2 className="mt-2 text-base font-bold text-[var(--text-primary)] group-hover:text-primary sm:text-lg">
                            {product.ProductName}
                          </h2>
                          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                            {product.Description || "Sin descripción adicional registrada."}
                          </p>
                        </div>

                        {/* List Item Actions & Price */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3.5">
                          <div>
                            <span className="block font-mono text-[10px] uppercase text-[var(--text-muted)]">
                              Precio Vigente
                            </span>
                            <span className="text-lg font-extrabold text-[var(--text-primary)]">
                              {formatPriceRangeGTQ(product.MinPrice, product.MaxPrice)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleOpenProductDetail(product.IDProduct)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver Opciones
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {/* Responsive Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-surface px-4 py-3">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  Página <strong>{pagination.page}</strong> de{' '}
                  <strong>{pagination.totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Native Modal Dialog (<dialog closedby="any">) for Variant Selection & Add to Cart */}
      <ModalDialog
        isOpen={selectedProductId !== null}
        onClose={handleCloseModal}
        title={productDetail?.ProductName || 'Detalle de Producto y Variantes'}
        subtitle={
          productDetail
            ? `Categoría: ${productDetail.CategoryName} · ID #${productDetail.IDProduct}`
            : 'Consultando variantes por SKU...'
        }
      >
        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2.5 text-sm text-[var(--text-secondary)]">
              Cargando variantes y existencias...
            </span>
          </div>
        ) : detailError ? (
          <div className="rounded-xl border border-crimson-600/30 bg-crimson-600/10 p-4 text-xs text-crimson-600">
            {detailError}
          </div>
        ) : productDetail ? (
          <div className="space-y-5">
            {productDetail.Description && (
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {productDetail.Description}
              </p>
            )}

            {/* Variants Selection List */}
            <div>
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">
                Selecciona una Opción (SKU)
              </h3>

              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {productDetail.Variants.filter((v) => v.IsActive).map((variant) => {
                  const attrs = parseVariantAttributes(variant);
                  const isSelected = variant.IDVariant === selectedVariantId;
                  const isOut = variant.AvailableStock <= 0;

                  return (
                    <button
                      key={variant.IDVariant}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.IDVariant);
                        setQuantity(1);
                        setCartFeedback(null);
                      }}
                      className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-[var(--border-subtle)] bg-canvas hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {variant.SKU}
                        </span>
                        <span className="text-sm font-extrabold text-[var(--text-primary)]">
                          {formatGTQ(variant.Price)}
                        </span>
                      </div>

                      {/* Dynamic Attributes Pills */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(attrs).map(([k, val]) => (
                          <span
                            key={k}
                            className="rounded-md border border-[var(--border-strong)] bg-surface px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                          >
                            <strong className="text-[var(--text-primary)]">{k}:</strong> {val}
                          </span>
                        ))}
                      </div>

                      {/* Stock Breakdown */}
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-mono text-[11px]">
                        <span className="text-[var(--text-muted)]">
                          Físico: {variant.PhysicalStock} | Reservado: {variant.ReservedQuantity}
                        </span>
                        <span
                          className={`font-bold ${
                            isOut ? 'text-crimson-600' : 'text-emerald-600'
                          }`}
                        >
                          {isOut ? 'Sin stock' : `${variant.AvailableStock} disp.`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cart Feedback Banner */}
            {cartFeedback && (
              <div
                role="status"
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-xs ${
                  cartFeedback.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                    : cartFeedback.type === 'warning'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                      : 'border-crimson-600/40 bg-crimson-600/10 text-crimson-600'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {cartFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : cartFeedback.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{cartFeedback.message}</span>
                </div>
                {cartFeedback.type === 'success' && user?.role === 'CLIENT' && (
                  <Link
                    to="/cart"
                    className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700"
                  >
                    Ir al Carrito
                  </Link>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart Action Bar */}
            {selectedVariant && (
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-elevated/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="variant-quantity"
                    className="text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Cantidad:
                  </label>
                  <input
                    id="variant-quantity"
                    type="number"
                    min={1}
                    max={Math.max(1, selectedVariant.AvailableStock)}
                    disabled={selectedVariant.AvailableStock <= 0}
                    value={quantity}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(val) || val < 1) {
                        setQuantity(1);
                        setCartFeedback(null);
                      } else if (val > selectedVariant.AvailableStock) {
                        setQuantity(selectedVariant.AvailableStock);
                        setCartFeedback({
                          type: 'warning',
                          message: `Existencias limitadas: Solo hay ${selectedVariant.AvailableStock} unidad(es) disponible(s) en bodega para esta opción.`,
                        });
                      } else {
                        setQuantity(val);
                        setCartFeedback(null);
                      }
                    }}
                    className="w-20 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-center font-mono text-sm font-bold text-[var(--text-primary)]"
                  />
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    Subtotal: <strong>{formatGTQ(selectedVariant.Price * quantity)}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedVariant.AvailableStock <= 0 || isAddingToCart}
                  onClick={() => void handleAddToCart()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      {selectedVariant.AvailableStock > 0
                        ? 'Agregar al Carrito'
                        : 'Opción sin Stock'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
