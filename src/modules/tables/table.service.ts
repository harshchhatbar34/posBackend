import prisma from "@/lib/prisma";
import {
  createTableSchema,
  updateTableSchema,
  type CreateTableInput,
  type UpdateTableInput,
} from "./table.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class TableService {
  async findAll(params: PaginationParams & { sectionId?: string; status?: string }) {
    const { page, pageSize, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.sectionId) where.sectionId = params.sectionId;
    if (params.status) where.status = params.status;

    const [tables, total] = await Promise.all([
      prisma.table.findMany({
        where,
        include: {
          section: { select: { id: true, name: true } },
          _count: { select: { orders: true } },
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "tableNumber"]: sortOrder === "desc" ? "desc" : "asc" },
      }),
      prisma.table.count({ where }),
    ]);

    return { tables, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        section: { select: { id: true, name: true } },
        orders: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!table) throw new NotFoundError("Table");
    return table;
  }

  async create(input: CreateTableInput) {
    const validated = createTableSchema.parse(input);
    const table = await prisma.table.create({
      data: validated,
      include: { section: { select: { id: true, name: true } } },
    });
    logger.info(`Table created: #${table.tableNumber} in section ${table.section.name}`);
    return table;
  }

  async update(id: string, input: UpdateTableInput) {
    const validated = updateTableSchema.parse(input);
    await this.findById(id);
    const table = await prisma.table.update({
      where: { id },
      data: validated,
      include: { section: { select: { id: true, name: true } } },
    });
    logger.info(`Table updated: #${table.tableNumber}`);
    return table;
  }

  async delete(id: string) {
    await this.findById(id);
    await prisma.table.delete({ where: { id } });
    logger.info(`Table deleted: ${id}`);
    return { message: "Table deleted successfully" };
  }
}

export const tableService = new TableService();
