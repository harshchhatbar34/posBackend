import mongoose from "mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Section from "@/models/Section";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "./product.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class ProductService {
  async findAll(
    params: PaginationParams & {
      sectionId?: string;
      categoryId?: string;
      section?: string;
      category?: string;
      isAvailable?: string;
      name?: string;
    }
  ) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.sectionId) where.sectionId = new mongoose.Types.ObjectId(params.sectionId);
    if (params.categoryId) where.categoryId = new mongoose.Types.ObjectId(params.categoryId);

    if (params.category) {
      const cat = await Category.findOne({ name: { $regex: params.category, $options: "i" } }).select("_id").lean();
      if (cat) {
        where.categoryId = cat._id;
      } else {
        where.categoryId = new mongoose.Types.ObjectId(); // Ensure query returns no results if name mismatch
      }
    }

    if (params.section) {
      const sec = await Section.findOne({ name: { $regex: params.section, $options: "i" } }).select("_id").lean();
      if (sec) {
        where.sectionId = sec._id;
      } else {
        where.sectionId = new mongoose.Types.ObjectId(); // Ensure query returns no results if name mismatch
      }
    }

    if (params.isAvailable !== undefined)
      where.isAvailable = params.isAvailable === "true";
    
    const nameQuery = params.name || search;
    if (nameQuery) {
      where.name = { $regex: nameQuery, $options: "i" };
    }

    const sortOpt: any = { [sortBy || "name"]: sortOrder === "desc" ? -1 : 1 };

    const [products, total] = await Promise.all([
      Product.find(where)
        .populate("categoryId", "name")
        .populate("sectionId", "name")
        .sort(sortOpt)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(where),
    ]);

    const enrichedProducts = products.map(p => ({
      ...p,
      id: p._id.toString(),
      category: p.categoryId ? { ...(p.categoryId as any), id: (p.categoryId as any)._id.toString() } : null,
      section: p.sectionId ? { ...(p.sectionId as any), id: (p.sectionId as any)._id.toString() } : null,
    }));

    return { products: enrichedProducts, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const product = await Product.findById(id)
      .populate("categoryId", "name")
      .populate("sectionId", "name")
      .lean();
    if (!product) throw new NotFoundError("Product");
    return {
      ...product,
      id: product._id.toString(),
      category: product.categoryId ? { ...(product.categoryId as any), id: (product.categoryId as any)._id.toString() } : null,
      section: product.sectionId ? { ...(product.sectionId as any), id: (product.sectionId as any)._id.toString() } : null,
    };
  }

  async create(input: CreateProductInput) {
    const validated = createProductSchema.parse(input);
    const product = await Product.create(validated);
    logger.info(`Product created: ${product.name}`);
    return this.findById(product._id.toString());
  }

  async update(id: string, input: UpdateProductInput) {
    const validated = updateProductSchema.parse(input);
    const product = await Product.findByIdAndUpdate(id, validated, { new: true });
    if (!product) throw new NotFoundError("Product");
    logger.info(`Product updated: ${product.name}`);
    return this.findById(id);
  }

  async delete(id: string) {
    const product = await Product.findByIdAndUpdate(id, { isAvailable: false });
    if (!product) throw new NotFoundError("Product");
    logger.info(`Product deactivated: ${id}`);
    return { message: "Product deactivated successfully" };
  }
}

export const productService = new ProductService();
