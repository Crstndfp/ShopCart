import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Edit3,
  FolderPlus,
  Layers,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { catalogApi } from '../api/catalog.api.js';
import { HttpError } from '../api/http-client.js';
import { ModalDialog } from '../components/ui/ModalDialog.js';
import {
  formatGTQ,
  formatPriceRangeGTQ,
  parseVariantAttributes,
  type CatalogProductSummary,
  type CategoryItem,
  type ProductDetail,
  type ProductVariant,
} from '../types/catalog.types.js';

type ActiveTab = 'PRODUCTS' | 'CATEGORIES';

interface AttributePair {
  key: string;
  value: string;
}

export function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('PRODUCTS');

  // Shared Feedback Banner
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Categories State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Products State
  const [products, setProducts] = useState<CatalogProductSummary[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodCategoryId, setProdCategoryId] = useState<number>(0);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodIsActive, setProdIsActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Variants & Prices Modal State
  const [variantsProductId, setVariantsProductId] = useState<number | null>(null);
  const [variantsProductDetail, setVariantsProductDetail] = useState<ProductDetail | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Variant Form (Create / Update inside Modal)
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [varSku, setVarSku] = useState('');
  const [varPrice, setVarPrice] = useState('');
  const [varInitialStock, setVarInitialStock] = useState('0');
  const [varIsActive, setVarIsActive] = useState(true);
  const [varAttributes, setVarAttributes] = useState<AttributePair[]>([
    { key: 'Presentación', value: 'Estándar' },
  ]);
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  // Category Form Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catParentId, setCatParentId] = useState<number | undefined>(undefined);
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const list = await catalogApi.listCategories(false);
      setCategories(list);
    } catch (error) {
      if (error instanceof HttpError) {
        setStatusBanner({ type: 'error', message: error.message });
      }
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await catalogApi.searchProducts({
        search: searchFilter.trim() || undefined,
        categoryId: categoryFilter,
        sortBy: 'NEWEST',
        sortDir: 'DESC',
        page: 1,
        limit: 50,
      });
      setProducts(res.data || []);
    } catch (error) {
      if (error instanceof HttpError) {
        setStatusBanner({ type: 'error', message: error.message });
      }
    } finally {
      setIsLoadingProducts(false);
    }
  }, [searchFilter, categoryFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // ==========================================
  // Product Create / Edit / Deactivate Handlers
  // ==========================================
  const handleOpenCreateProduct = () => {
    setEditingProductId(null);
    const defaultCat = categories.find((c) => c.IsActive)?.IDCategory ?? categories[0]?.IDCategory ?? 1;
    setProdCategoryId(defaultCat);
    setProdName('');
    setProdDescription('');
    setProdImageUrl('');
    setProdIsActive(true);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = async (product: CatalogProductSummary) => {
    setEditingProductId(product.IDProduct);
    setProdCategoryId(product.IDCategory);
    setProdName(product.ProductName);
    setProdDescription(product.Description || '');
    setProdImageUrl(product.MainImageUrl || '');
    setProdIsActive(true);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProduct(true);
    setStatusBanner(null);

    try {
      if (editingProductId === null) {
        const res = await catalogApi.createProduct({
          categoryId: prodCategoryId,
          name: prodName.trim(),
          description: prodDescription.trim() || undefined,
          mainImageUrl: prodImageUrl.trim() || undefined,
        });
        setStatusBanner({
          type: 'success',
          message: `Producto "${prodName}" creado con ID #${res.idProduct}. Ahora puedes agregarle variantes SKU.`,
        });
        setIsProductModalOpen(false);
        await loadProducts();
        await handleOpenVariantsModal(res.idProduct);
      } else {
        await catalogApi.updateProduct(editingProductId, {
          categoryId: prodCategoryId,
          name: prodName.trim(),
          description: prodDescription.trim() || undefined,
          mainImageUrl: prodImageUrl.trim() || undefined,
          isActive: prodIsActive,
        });
        setStatusBanner({
          type: 'success',
          message: `Producto #${editingProductId} actualizado correctamente.`,
        });
        setIsProductModalOpen(false);
        await loadProducts();
      }
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message: error instanceof HttpError ? error.message : 'Error al guardar el producto.',
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeactivateProduct = async (product: CatalogProductSummary) => {
    setStatusBanner(null);
    try {
      await catalogApi.deactivateProduct(product.IDProduct);
      setStatusBanner({
        type: 'success',
        message: `Producto "${product.ProductName}" (#${product.IDProduct}) desactivado lógicamente con registro en bitácora de auditoría.`,
      });
      await loadProducts();
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message: error instanceof HttpError ? error.message : 'No se pudo desactivar el producto.',
      });
    }
  };

  // ==========================================
  // Variants & Prices Management Handlers
  // ==========================================
  const resetVariantForm = () => {
    setEditingVariantId(null);
    setVarSku('');
    setVarPrice('');
    setVarInitialStock('10');
    setVarIsActive(true);
    setVarAttributes([{ key: 'Modelo', value: 'Estándar' }]);
  };

  const handleOpenVariantsModal = async (idProduct: number) => {
    setVariantsProductId(idProduct);
    setVariantsProductDetail(null);
    resetVariantForm();
    setIsLoadingVariants(true);

    try {
      const detail = await catalogApi.getProductById(idProduct);
      setVariantsProductDetail(detail);
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message:
          error instanceof HttpError ? error.message : 'Error al consultar las variantes del producto.',
      });
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const handleSelectVariantForEdit = (variant: ProductVariant) => {
    setEditingVariantId(variant.IDVariant);
    setVarSku(variant.SKU);
    setVarPrice(String(variant.Price));
    setVarIsActive(Boolean(variant.IsActive));
    const parsed = parseVariantAttributes(variant);
    const pairs = Object.entries(parsed).map(([key, value]) => ({ key, value }));
    setVarAttributes(pairs.length > 0 ? pairs : [{ key: 'Atributo', value: 'Valor' }]);
  };

  const handleSaveVariant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!variantsProductId) return;

    const attributesRecord: Record<string, string> = {};
    for (const pair of varAttributes) {
      if (pair.key.trim() && pair.value.trim()) {
        attributesRecord[pair.key.trim()] = pair.value.trim();
      }
    }

    if (Object.keys(attributesRecord).length === 0) {
      setStatusBanner({
        type: 'error',
        message: 'Debes definir al menos un atributo clave-valor para la variante (ej. Color, Talla).',
      });
      return;
    }

    const numericPrice = Number.parseFloat(varPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setStatusBanner({
        type: 'error',
        message: 'El precio debe ser un monto válido mayor o igual a Q0.00.',
      });
      return;
    }

    setIsSavingVariant(true);
    setStatusBanner(null);

    try {
      if (editingVariantId === null) {
        const initialStock = Math.max(0, Number.parseInt(varInitialStock, 10) || 0);
        await catalogApi.createVariant(variantsProductId, {
          sku: varSku.trim().toUpperCase(),
          attributes: attributesRecord,
          price: numericPrice,
          initialStock,
        });
        setStatusBanner({
          type: 'success',
          message: `Variante SKU "${varSku.toUpperCase()}" creada con precio ${formatGTQ(numericPrice)} y stock inicial ${initialStock}.`,
        });
      } else {
        await catalogApi.updateVariant(editingVariantId, {
          attributes: attributesRecord,
          price: numericPrice,
          isActive: varIsActive,
        });
        setStatusBanner({
          type: 'success',
          message: `Variante #${editingVariantId} actualizada a ${formatGTQ(numericPrice)} (registrado en AuditLog).`,
        });
      }

      const refreshed = await catalogApi.getProductById(variantsProductId);
      setVariantsProductDetail(refreshed);
      resetVariantForm();
      await loadProducts();
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message: error instanceof HttpError ? error.message : 'Error al guardar la variante.',
      });
    } finally {
      setIsSavingVariant(false);
    }
  };

  // ==========================================
  // Category Create / Edit Handlers
  // ==========================================
  const handleOpenCreateCategory = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatDescription('');
    setCatParentId(undefined);
    setCatIsActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategoryId(cat.IDCategory);
    setCatName(cat.Name);
    setCatDescription(cat.Description || '');
    setCatParentId(cat.IDParentCategory ?? undefined);
    setCatIsActive(Boolean(cat.IsActive));
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingCategory(true);
    setStatusBanner(null);

    try {
      if (editingCategoryId === null) {
        await catalogApi.createCategory({
          name: catName.trim(),
          description: catDescription.trim() || undefined,
          parentCategoryId: catParentId,
        });
        setStatusBanner({
          type: 'success',
          message: `Categoría "${catName}" creada exitosamente.`,
        });
      } else {
        await catalogApi.updateCategory(editingCategoryId, {
          name: catName.trim(),
          description: catDescription.trim() || undefined,
          parentCategoryId: catParentId,
          isActive: catIsActive,
        });
        setStatusBanner({
          type: 'success',
          message: `Categoría "${catName}" actualizada exitosamente.`,
        });
      }

      setIsCategoryModalOpen(false);
      await loadCategories();
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message: error instanceof HttpError ? error.message : 'Error al guardar la categoría.',
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      {/* Header Banner */}
      <section className="pentandra-cover-card rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="pentandra-tag text-xs font-semibold">
              // RF-02 CONSOLA ADMINISTRATIVA DE CATÁLOGO Y PRECIOS
            </p>
            <h1 className="mt-1 text-[clamp(1.4rem,1.1rem+1.6vw,2.1rem)] font-bold text-white">
              Gestión de Productos, Variantes SKU y Categorías
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Administra productos, configura variantes con atributos JSON dinámicos, actualiza
              precios con auditoría automática y desactiva productos preservando el historial de
              ventas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreateCategory}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-400/40 bg-navy-950 px-4 py-2.5 text-xs font-semibold text-brand-400 transition hover:bg-brand-900 hover:text-white"
            >
              <FolderPlus className="h-4 w-4" />
              Nueva Categoría
            </button>
            <button
              type="button"
              onClick={handleOpenCreateProduct}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-400 hover:text-navy-950"
            >
              <PackagePlus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </div>
        </div>
      </section>

      {/* Feedback Banner */}
      {statusBanner && (
        <div
          role="status"
          className={`mt-5 flex items-center justify-between gap-3 rounded-xl border p-4 text-xs sm:text-sm ${
            statusBanner.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
              : 'border-crimson-600/40 bg-crimson-600/10 text-crimson-600'
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Module Tabs */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              activeTab === 'PRODUCTS'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            Productos y Variantes ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CATEGORIES')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              activeTab === 'CATEGORIES'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Tag className="h-4 w-4" />
            Categorías ({categories.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadCategories();
            void loadProducts();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar datos
        </button>
      </div>

      {/* TAB 1: PRODUCTS & VARIANTS */}
      {activeTab === 'PRODUCTS' && (
        <section className="mt-5 space-y-4">
          {/* Quick Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-surface p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filtrar productos por nombre..."
                aria-label="Filtrar productos en tabla administrativa"
                className="w-full rounded-lg border border-[var(--border-strong)] bg-canvas py-2 pr-3 pl-9 text-xs text-[var(--text-primary)] sm:text-sm"
              />
            </div>

            <select
              value={categoryFilter ?? ''}
              onChange={(e) =>
                setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              aria-label="Filtrar por categoría"
              className="rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-2 text-xs text-[var(--text-primary)] sm:text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.IDCategory} value={cat.IDCategory}>
                  {cat.Name}
                </option>
              ))}
            </select>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">
                Cargando listado de productos...
              </span>
            </div>
          ) : (
            /* Responsive Table Wrapper (Sticky on Desktop, Stacked Cards on <640px) */
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="admin-products-caption"
              className="responsive-table-wrapper shadow-xs"
            >
              <table className="responsive-table text-left text-xs sm:text-sm">
                <caption id="admin-products-caption" className="sr-only">
                  Directorio administrativo de productos, rangos de precios y existencias
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Rango Precio (GTQ)</th>
                    <th className="px-4 py-3">Stock Físico / Disp.</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {products.map((prod) => (
                    <tr key={prod.IDProduct} className="transition hover:bg-elevated/40">
                      <th className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center justify-between gap-2 sm:justify-start">
                          <span>{prod.ProductName}</span>
                          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                            #{prod.IDProduct}
                          </span>
                        </div>
                      </th>
                      <td data-label="Categoría" className="px-4 py-3 text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border-strong)] bg-canvas px-2 py-0.5 text-xs">
                          {prod.CategoryName}
                        </span>
                      </td>
                      <td
                        data-label="Precio Vigente"
                        className="px-4 py-3 font-mono font-bold text-[var(--text-primary)]"
                      >
                        {formatPriceRangeGTQ(prod.MinPrice, prod.MaxPrice)}
                      </td>
                      <td data-label="Stock" className="px-4 py-3 font-mono text-xs">
                        <span className="text-[var(--text-secondary)]">
                          Físico: {prod.TotalPhysicalStock}
                        </span>{' '}
                        ·{' '}
                        <span
                          className={
                            prod.TotalAvailableStock > 0
                              ? 'font-bold text-emerald-600'
                              : 'font-bold text-crimson-600'
                          }
                        >
                          Disp: {prod.TotalAvailableStock}
                        </span>
                      </td>
                      <td data-label="Acciones" className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenVariantsModal(prod.IDProduct)}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-900"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Variantes / Precios
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOpenEditProduct(prod)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-canvas px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-primary"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeactivateProduct(prod)}
                            title="Desactivar lógicamente (preserva historial de ventas)"
                            className="inline-flex items-center gap-1 rounded-lg border border-crimson-600/40 bg-crimson-600/10 px-2.5 py-1.5 text-xs font-semibold text-crimson-600 hover:bg-crimson-600 hover:text-white"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Desactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'CATEGORIES' && (
        <section className="mt-5">
          {isLoadingCategories ? (
            <div className="flex items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-surface py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">
                Cargando categorías...
              </span>
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="admin-categories-caption"
              className="responsive-table-wrapper shadow-xs"
            >
              <table className="responsive-table text-left text-xs sm:text-sm">
                <caption id="admin-categories-caption" className="sr-only">
                  Listado de categorías del catálogo
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Productos Activos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {categories.map((cat) => (
                    <tr key={cat.IDCategory} className="transition hover:bg-elevated/40">
                      <th className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">
                        {cat.Name}{' '}
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          (#{cat.IDCategory})
                        </span>
                      </th>
                      <td
                        data-label="Descripción"
                        className="px-4 py-3 text-[var(--text-secondary)]"
                      >
                        {cat.Description || '—'}
                      </td>
                      <td
                        data-label="Productos Activos"
                        className="px-4 py-3 font-mono font-semibold"
                      >
                        {cat.ActiveProductsCount ?? 0}
                      </td>
                      <td data-label="Estado" className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                            cat.IsActive
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-crimson-600/15 text-crimson-600'
                          }`}
                        >
                          {cat.IsActive ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </td>
                      <td data-label="Acciones" className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-canvas px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: Create / Edit Product */}
      <ModalDialog
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={
          editingProductId === null
            ? 'Crear Nuevo Producto en Catálogo'
            : `Editar Producto #${editingProductId}`
        }
        subtitle="Todos los cambios quedan registrados en AuditLog (módulo CATALOG)"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label
              htmlFor="prod-category"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Categoría
            </label>
            <select
              id="prod-category"
              required
              value={prodCategoryId}
              onChange={(e) => setProdCategoryId(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
            >
              {categories
                .filter((c) => c.IsActive)
                .map((cat) => (
                  <option key={cat.IDCategory} value={cat.IDCategory}>
                    {cat.Name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prod-name"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Nombre del producto
            </label>
            <input
              id="prod-name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Ej. Monitor Curvo UltraWide 34 pulgadas"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="prod-desc"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Descripción detallada
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={prodDescription}
              onChange={(e) => setProdDescription(e.target.value)}
              placeholder="Especificaciones técnicas, garantía y características principales..."
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="prod-image"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              URL de imagen principal (Opcional)
            </label>
            <input
              id="prod-image"
              type="url"
              value={prodImageUrl}
              onChange={(e) => setProdImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>

          {editingProductId !== null && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={prodIsActive}
                onChange={(e) => setProdIsActive(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-600"
              />
              Producto activo y visible en el catálogo
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="rounded-xl border border-[var(--border-strong)] bg-canvas px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingProduct}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
            >
              {isSavingProduct && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingProductId === null ? 'Crear Producto' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 2: Variants & Price Management */}
      <ModalDialog
        isOpen={variantsProductId !== null}
        onClose={() => {
          setVariantsProductId(null);
          setVariantsProductDetail(null);
        }}
        title={
          variantsProductDetail
            ? `Variantes y Precios: ${variantsProductDetail.ProductName}`
            : 'Gestión de Variantes y Precios'
        }
        subtitle="Cada variante posee su propio SKU, atributos JSON, precio en GTQ y saldo en Kardex"
      >
        {isLoadingVariants ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-[var(--text-secondary)]">
              Cargando variantes del producto...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing Variants List */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">
                  Variantes Registradas ({variantsProductDetail?.Variants?.length ?? 0})
                </h3>
                {editingVariantId !== null && (
                  <button
                    type="button"
                    onClick={resetVariantForm}
                    className="text-xs font-semibold text-primary underline"
                  >
                    + Cambiar a modo Nueva Variante
                  </button>
                )}
              </div>

              {variantsProductDetail?.Variants && variantsProductDetail.Variants.length > 0 ? (
                <div className="mt-2.5 space-y-2">
                  {variantsProductDetail.Variants.map((variant) => {
                    const attrs = parseVariantAttributes(variant);
                    return (
                      <div
                        key={variant.IDVariant}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-canvas p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {variant.SKU}
                            </span>
                            <span className="font-mono text-sm font-extrabold text-[var(--text-primary)]">
                              {formatGTQ(variant.Price)}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                variant.IsActive
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : 'bg-crimson-600/15 text-crimson-600'
                              }`}
                            >
                              {variant.IsActive ? 'ACTIVA' : 'INACTIVA'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(attrs).map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded border border-[var(--border-strong)] bg-surface px-2 py-0.5 text-[11px]"
                              >
                                <strong>{k}:</strong> {v}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 font-mono text-[11px] text-[var(--text-muted)]">
                            Stock Físico: {variant.PhysicalStock} · Reservado:{' '}
                            {variant.ReservedQuantity} · Disponible: {variant.AvailableStock}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectVariantForEdit(variant)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar Precio / Atributos
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-center text-xs text-[var(--text-muted)]">
                  Este producto aún no tiene variantes registradas. Crea la primera variante abajo
                  para que aparezca en el catálogo público.
                </p>
              )}
            </div>

            {/* Create / Edit Variant Form */}
            <form
              onSubmit={handleSaveVariant}
              className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-elevated/40 p-4"
            >
              <h4 className="text-xs font-bold tracking-wider uppercase text-primary">
                {editingVariantId === null
                  ? 'Agregar Nueva Variante SKU'
                  : `Editando Variante #${editingVariantId} (${varSku})`}
              </h4>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="var-sku"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Código SKU Único
                  </label>
                  <input
                    id="var-sku"
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    disabled={editingVariantId !== null}
                    value={varSku}
                    onChange={(e) => setVarSku(e.target.value)}
                    placeholder="EJ. TECH-MON-34"
                    className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-2 font-mono text-xs uppercase text-[var(--text-primary)] disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="var-price"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Precio Vigente (GTQ)
                  </label>
                  <input
                    id="var-price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={varPrice}
                    onChange={(e) => setVarPrice(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                  />
                </div>

                {editingVariantId === null ? (
                  <div>
                    <label
                      htmlFor="var-stock"
                      className="block text-xs font-semibold text-[var(--text-primary)]"
                    >
                      Stock Inicial (Kardex)
                    </label>
                    <input
                      id="var-stock"
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={varInitialStock}
                      onChange={(e) => setVarInitialStock(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
                    />
                  </div>
                ) : (
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={varIsActive}
                        onChange={(e) => setVarIsActive(e.target.checked)}
                        className="h-4 w-4 rounded accent-brand-600"
                      />
                      Variante Activa
                    </label>
                  </div>
                )}
              </div>

              {/* Dynamic Key-Value Attributes Editor */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Atributos de la Variante (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVarAttributes((prev) => [...prev, { key: '', value: '' }])
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir atributo
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {varAttributes.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={pair.key}
                        onChange={(e) =>
                          setVarAttributes((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p))
                          )
                        }
                        placeholder="Atributo (ej. Color, Capacidad)"
                        aria-label="Nombre del atributo"
                        className="w-1/2 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                      <input
                        type="text"
                        required
                        value={pair.value}
                        onChange={(e) =>
                          setVarAttributes((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p))
                          )
                        }
                        placeholder="Valor (ej. Negro Mate, 512GB)"
                        aria-label="Valor del atributo"
                        className="w-1/2 rounded-lg border border-[var(--border-strong)] bg-surface px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                      {varAttributes.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setVarAttributes((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Eliminar atributo"
                          className="rounded-lg p-1.5 text-crimson-600 hover:bg-crimson-600/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingVariantId !== null && (
                  <button
                    type="button"
                    onClick={resetVariantForm}
                    className="rounded-xl border border-[var(--border-strong)] bg-surface px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Cancelar edición
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingVariant}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
                >
                  {isSavingVariant && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingVariantId === null
                    ? 'Registrar Variante SKU'
                    : 'Actualizar Precio y Atributos'}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalDialog>

      {/* MODAL 3: Create / Edit Category */}
      <ModalDialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={
          editingCategoryId === null
            ? 'Nueva Categoría de Catálogo'
            : `Editar Categoría #${editingCategoryId}`
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label
              htmlFor="cat-name"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Nombre de la categoría
            </label>
            <input
              id="cat-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ej. Audio y Sonido Profesional"
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="cat-desc"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Descripción
            </label>
            <textarea
              id="cat-desc"
              rows={2}
              maxLength={255}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              placeholder="Breve descripción de la línea de productos..."
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="cat-parent"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Categoría Padre (Opcional)
            </label>
            <select
              id="cat-parent"
              value={catParentId ?? ''}
              onChange={(e) =>
                setCatParentId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Ninguna (Categoría Raíz)</option>
              {categories
                .filter((c) => c.IDCategory !== editingCategoryId)
                .map((cat) => (
                  <option key={cat.IDCategory} value={cat.IDCategory}>
                    {cat.Name}
                  </option>
                ))}
            </select>
          </div>

          {editingCategoryId !== null && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={catIsActive}
                onChange={(e) => setCatIsActive(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-600"
              />
              Categoría activa
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-xl border border-[var(--border-strong)] bg-canvas px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingCategory}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
            >
              {isSavingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCategoryId === null ? 'Crear Categoría' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
