import prisma from "@/lib/prisma";
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
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: true } } },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "name"]: sortOrder === "desc" ? "desc" : "asc" },
      }),
      prisma.category.count({ where }),
    ]);

    return { categories, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) throw new NotFoundError("Category");
    return category;
  }

  async create(input: CreateCategoryInput) {
    const validated = createCategorySchema.parse(input);
    const category = await prisma.category.create({ data: validated });
    logger.info(`Category created: ${category.name}`);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput) {
    const validated = updateCategorySchema.parse(input);
    await this.findById(id);
    const category = await prisma.category.update({ where: { id }, data: validated });
    logger.info(`Category updated: ${category.name}`);
    return category;
  }

  async delete(id: string) {
    await this.findById(id);
    await prisma.category.update({ where: { id }, data: { isActive: false } });
    logger.info(`Category deactivated: ${id}`);
    return { message: "Category deactivated successfully" };
  }
}

export const categoryService = new CategoryService();
