import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  SearchProductsQueryDto,
} from '../dtos/catalog.dto.js';

export class CatalogController {
  private service = new CatalogService();

  // ==========================================
  // Categories
  // ==========================================
  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const onlyActive = req.query.onlyActive !== 'false';
      const categories = await this.service.listCategories(onlyActive);
      res.status(200).json({ statusCode: 200, data: categories });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateCategoryDto;
      const userId = req.user!.idUser;
      const result = await this.service.createCategory(dto, userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idCategory = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateCategoryDto;
      const userId = req.user!.idUser;
      const result = await this.service.updateCategory(idCategory, dto, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Products
  // ==========================================
  searchProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SearchProductsQueryDto;
      const result = await this.service.searchProducts(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };

  getProductByID = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idProduct = parseInt(req.params.id as string, 10);
      const product = await this.service.getProductByID(idProduct);
      res.status(200).json({ statusCode: 200, data: product });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateProductDto;
      const userId = req.user!.idUser;
      const result = await this.service.createProduct(dto, userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idProduct = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateProductDto;
      const userId = req.user!.idUser;
      const result = await this.service.updateProduct(idProduct, dto, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  deactivateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idProduct = parseInt(req.params.id as string, 10);
      const userId = req.user!.idUser;
      const result = await this.service.deactivateProduct(idProduct, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // Variants
  // ==========================================
  createVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idProduct = parseInt(req.params.id as string, 10);
      const dto = req.body as CreateVariantDto;
      const userId = req.user!.idUser;
      const result = await this.service.createVariant(idProduct, dto, userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idVariant = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateVariantDto;
      const userId = req.user!.idUser;
      const result = await this.service.updateVariant(idVariant, dto, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}
