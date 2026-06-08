import mongoose from "mongoose";
import Product, { ProductAvailability } from "@/models/Product";
import Category from "@/models/Category";
import Section from "@/models/Section";
import ProductLog from "@/models/ProductLog";
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

// ─────────────────────────────────────────────
// Helpers: convert between boolean (frontend) ↔ enum (DB)
// ─────────────────────────────────────────────

/** Frontend sends true/false → store as ACTIVE/INACTIVE */
function toAvailabilityEnum(isAvailable: boolean): ProductAvailability {
  return isAvailable ? ProductAvailability.ACTIVE : ProductAvailability.INACTIVE;
}

/** DB stores ACTIVE/INACTIVE → frontend receives true/false */
function toIsAvailableBoolean(availability: ProductAvailability): boolean {
  return availability === ProductAvailability.ACTIVE;
}

/** Shape every product document for the API response */
function formatProduct(p: any) {
  return {
    ...p,
    id: p._id.toString(),
    // Convert enum back to boolean so frontend requires zero changes
    isAvailable: toIsAvailableBoolean(p.availability),
    availability: p.availability, // also expose raw enum if needed
    category: p.categoryId
      ? { ...(p.categoryId as any), id: (p.categoryId as any)._id.toString() }
      : null,
    section: p.sectionId
      ? { ...(p.sectionId as any), id: (p.sectionId as any)._id.toString() }
      : null,
  };
}

// ─────────────────────────────────────────────

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

    // Always exclude DELETED products from every list query
    const where: any = { availability: { $ne: ProductAvailability.DELETED } };

    if (params.sectionId) where.sectionId = new mongoose.Types.ObjectId(params.sectionId);
    if (params.categoryId) where.categoryId = new mongoose.Types.ObjectId(params.categoryId);

    if (params.category) {
      const cat = await Category.findOne({ name: { $regex: params.category, $options: "i" } }).select("_id").lean();
      where.categoryId = cat ? cat._id : new mongoose.Types.ObjectId();
    }

    if (params.section) {
      const sec = await Section.findOne({ name: { $regex: params.section, $options: "i" } }).select("_id").lean();
      where.sectionId = sec ? sec._id : new mongoose.Types.ObjectId();
    }

    // isAvailable filter: "true" → ACTIVE only, "false" → INACTIVE only
    if (params.isAvailable !== undefined) {
      where.availability =
        params.isAvailable === "true"
          ? ProductAvailability.ACTIVE
          : ProductAvailability.INACTIVE;
    }

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

    return {
      products: products.map(formatProduct),
      meta: paginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const product = await Product.findOne({
      _id: id,
      availability: { $ne: ProductAvailability.DELETED },
    })
      .populate("categoryId", "name")
      .populate("sectionId", "name")
      .lean();

    if (!product) throw new NotFoundError("Product");
    return formatProduct(product);
  }

  async create(input: CreateProductInput, userId: string) {
    const validated = createProductSchema.parse(input);

    const product = await Product.create({
      name: validated.name,
      price: validated.price,
      categoryId: validated.categoryId,
      sectionId: validated.sectionId,
      image: validated.image,
      // Convert frontend boolean → enum
      availability: toAvailabilityEnum(validated.isAvailable),
    });

    logger.info(`Product created: ${product.name}`);

    await ProductLog.create({
      productId: product._id,
      action: "PRODUCT_CREATED",
      details: `Product "${product.name}" created with price ₹${product.price}`,
      userId,
    });

    return this.findById(product._id.toString());
  }

  async update(id: string, input: UpdateProductInput, userId: string) {
    const validated = updateProductSchema.parse(input);

    const original = await Product.findOne({
      _id: id,
      availability: { $ne: ProductAvailability.DELETED },
    }).lean();
    if (!original) throw new NotFoundError("Product");

    // Build DB update: convert isAvailable boolean → enum if provided
    const dbUpdate: any = { ...validated };
    if (typeof validated.isAvailable === "boolean") {
      dbUpdate.availability = toAvailabilityEnum(validated.isAvailable);
      delete dbUpdate.isAvailable; // remove boolean field; DB uses availability
    }

    const product = await Product.findByIdAndUpdate(id, dbUpdate, { new: true });
    if (!product) throw new NotFoundError("Product");

    logger.info(`Product updated: ${product.name}`);

    // Build change log
    const changes: string[] = [];
    if (original.name !== product.name)
      changes.push(`name: "${original.name}" → "${product.name}"`);
    if (original.price !== product.price)
      changes.push(`price: ₹${original.price} → ₹${product.price}`);
    if (original.categoryId?.toString() !== product.categoryId?.toString())
      changes.push(`category updated`);
    if (original.sectionId?.toString() !== product.sectionId?.toString())
      changes.push(`section updated`);
    if (original.availability !== product.availability)
      changes.push(`availability: ${original.availability} → ${product.availability}`);

    const details =
      changes.length > 0
        ? `Updated fields: ${changes.join(", ")}`
        : "Product updated with no changes in visible fields";

    await ProductLog.create({
      productId: product._id,
      action: "PRODUCT_UPDATED",
      details,
      userId,
    });

    return this.findById(id);
  }

  async delete(id: string, userId: string) {
    // Find ensuring it is not already deleted
    const product = await Product.findOne({
      _id: id,
      availability: { $ne: ProductAvailability.DELETED },
    });
    if (!product) throw new NotFoundError("Product");

    // Soft-delete: mark as DELETED — never removed from DB
    product.availability = ProductAvailability.DELETED;
    await product.save();

    logger.info(`Product soft-deleted (DELETED): ${id}`);

    await ProductLog.create({
      productId: product._id,
      action: "PRODUCT_DEACTIVATED",
      details: `Product "${product.name}" permanently soft-deleted (availability → DELETED)`,
      userId,
    });

    return { message: "Product deleted successfully" };
  }
}

export const productService = new ProductService();


