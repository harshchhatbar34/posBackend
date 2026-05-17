import prisma from "@/lib/prisma";
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
      isAvailable?: string;
    }
  ) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.sectionId) where.sectionId = params.sectionId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.isAvailable !== undefined)
      where.isAvailable = params.isAvailable === "true";
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "name"]: sortOrder === "desc" ? "desc" : "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundError("Product");
    return product;
  }

  async create(input: CreateProductInput) {
    const validated = createProductSchema.parse(input);
    const product = await prisma.product.create({
      data: validated,
      include: {
        category: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
    logger.info(`Product created: ${product.name}`);
    return product;
  }

  async update(id: string, input: UpdateProductInput) {
    const validated = updateProductSchema.parse(input);
    await this.findById(id);
    const product = await prisma.product.update({
      where: { id },
      data: validated,
      include: {
        category: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });
    logger.info(`Product updated: ${product.name}`);
    return product;
  }

  async delete(id: string) {
    await this.findById(id);
    await prisma.product.update({ where: { id }, data: { isAvailable: false } });
    logger.info(`Product deactivated: ${id}`);
    return { message: "Product deactivated successfully" };
  }
}

export const productService = new ProductService();
