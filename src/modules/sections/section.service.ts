import prisma from "@/lib/prisma";
import {
  createSectionSchema,
  updateSectionSchema,
  type CreateSectionInput,
  type UpdateSectionInput,
} from "./section.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class SectionService {
  async findAll(params: PaginationParams) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where,
        include: {
          _count: { select: { tables: true, products: true } },
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "createdAt"]: sortOrder },
      }),
      prisma.section.count({ where }),
    ]);

    return {
      sections,
      meta: paginationMeta(page, pageSize, total),
    };
  }

  async findById(id: string) {
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        tables: true,
        _count: { select: { products: true } },
      },
    });
    if (!section) throw new NotFoundError("Section");
    return section;
  }

  async create(input: CreateSectionInput) {
    const validated = createSectionSchema.parse(input);
    const section = await prisma.section.create({ data: validated });
    logger.info(`Section created: ${section.name}`);
    return section;
  }

  async update(id: string, input: UpdateSectionInput) {
    const validated = updateSectionSchema.parse(input);
    await this.findById(id);
    const section = await prisma.section.update({ where: { id }, data: validated });
    logger.info(`Section updated: ${section.name}`);
    return section;
  }

  async delete(id: string) {
    await this.findById(id);
    await prisma.section.update({ where: { id }, data: { isActive: false } });
    logger.info(`Section deactivated: ${id}`);
    return { message: "Section deactivated successfully" };
  }
}

export const sectionService = new SectionService();
