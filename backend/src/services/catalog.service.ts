import { CatalogDal } from '../dal/catalog.dal.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  SearchProductsQueryDto,
} from '../dtos/catalog.dto.js';
import { NotFoundError } from '../errors/app-error.js';

export class CatalogService {
  private dal = new CatalogDal();

  // ==========================================
  // Categories
  // ==========================================
  async createCategory(dto: CreateCategoryDto, userId: number) {
    const idCategory = await this.dal.createCategory(
      dto.parentCategoryId,
      dto.name,
      dto.description,
      userId
    );
    return { idCategory, message: 'Category created successfully' };
  }

  async updateCategory(idCategory: number, dto: UpdateCategoryDto, userId: number) {
    await this.dal.updateCategory(
      idCategory,
      dto.parentCategoryId,
      dto.name,
      dto.description,
      dto.isActive,
      userId
    );
    return { idCategory, message: 'Category updated successfully' };
  }

  async listCategories(onlyActive = true) {
    return this.dal.listCategories(onlyActive);
  }

  // ==========================================
  // Products
  // ==========================================
  async createProduct(dto: CreateProductDto, userId: number) {
    const idProduct = await this.dal.createProduct(
      dto.categoryId,
      dto.name,
      dto.description,
      dto.mainImageUrl,
      userId
    );
    return { idProduct, message: 'Product created successfully' };
  }

  async updateProduct(idProduct: number, dto: UpdateProductDto, userId: number) {
    await this.dal.updateProduct(
      idProduct,
      dto.categoryId,
      dto.name,
      dto.description,
      dto.mainImageUrl,
      dto.isActive,
      userId
    );
    return { idProduct, message: 'Product updated successfully' };
  }

  async deactivateProduct(idProduct: number, userId: number) {
    await this.dal.deactivateProduct(idProduct, userId);
    return { idProduct, message: 'Product deactivated successfully' };
  }

  async getProductByID(idProduct: number) {
    const data = await this.dal.getProductByID(idProduct);
    if (!data) {
      throw new NotFoundError(`Product with ID ${idProduct} not found`);
    }

    // Parse variant attributes JSON strings to objects
    const variants = data.variants.map((v) => ({
      ...v,
      Attributes: typeof v.AttributesJson === 'string' ? JSON.parse(v.AttributesJson) : v.AttributesJson,
    }));

    return {
      ...data.product,
      Variants: variants,
    };
  }

  async searchProducts(query: SearchProductsQueryDto) {
    const { total, data } = await this.dal.searchProducts(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
      data,
    };
  }

  // ==========================================
  // Variants
  // ==========================================
  async createVariant(idProduct: number, dto: CreateVariantDto, userId: number) {
    const attributesJson = JSON.stringify(dto.attributes);
    const idVariant = await this.dal.createVariant(
      idProduct,
      dto.sku,
      attributesJson,
      dto.price,
      dto.initialStock,
      userId
    );
    return { idVariant, idProduct, message: 'Product variant created successfully' };
  }

  async updateVariant(idVariant: number, dto: UpdateVariantDto, userId: number) {
    const attributesJson = JSON.stringify(dto.attributes);
    await this.dal.updateVariant(idVariant, attributesJson, dto.price, dto.isActive, userId);
    return { idVariant, message: 'Product variant updated successfully' };
  }
}
