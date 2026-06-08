import Category from "@/models/Category";
import Product from "@/models/Product";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./category.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class CategoryService {
  async findAll(params: PaginationParams) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where = {
      isActive: { $ne: false },
      ...(search ? { name: { $regex: search, $options: "i" } } : {}),
    };

    const [categories, total] = await Promise.all([
      Category.aggregate([
        { $match: where },
        { $sort: { [sortBy || "name"]: sortOrder === "desc" ? -1 : 1 } },
        { $skip: skip },
        { $limit: pageSize },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "categoryId",
            as: "products",
          },
        },
        {
          $addFields: {
            _count: { products: { $size: "$products" } },
            id: { $toString: "$_id" },
          },
        },
        { $project: { products: 0 } },
      ]),
      Category.countDocuments(where),
    ]);

    return { categories, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const category = await Category.findById(id).lean();
    if (!category) throw new NotFoundError("Category");

    const products = await Product.find({ categoryId: id }).lean();
    return { ...category, id: category._id.toString(), products: products.map(p => ({ ...p, id: p._id.toString() })) };
  }

  async create(input: CreateCategoryInput) {
    const validated = createCategorySchema.parse(input);
    const category = await Category.create(validated);
    logger.info(`Category created: ${category.name}`);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput) {
    const validated = updateCategorySchema.parse(input);
    const category = await Category.findByIdAndUpdate(id, validated, { new: true });
    if (!category) throw new NotFoundError("Category");
    logger.info(`Category updated: ${category.name}`);
    return category;
  }

  async delete(id: string) {
    const category = await Category.findByIdAndUpdate(id, { isActive: false });
    if (!category) throw new NotFoundError("Category");
    logger.info(`Category deactivated: ${id}`);
    return { message: "Category deactivated successfully" };
  }
}

export const categoryService = new CategoryService();
