import prisma from "@/lib/prisma";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  addStockSchema,
  recordUsageSchema,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type AddStockInput,
  type RecordUsageInput,
} from "./inventory.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError, AppError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class InventoryService {
  async findAll(params: PaginationParams & { location?: string }) {
    const { page, pageSize, search, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.location) where.location = { contains: params.location, mode: "insensitive" };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy || "name"]: sortOrder === "desc" ? "desc" : "asc" },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Add computed totalPrice
    const enrichedItems = items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.pricePerUnit,
      isLowStock: item.quantity <= item.minStock,
    }));

    return { items: enrichedItems, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        stockLogs: {
          include: { addedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        usageLogs: {
          include: { takenBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!item) throw new NotFoundError("Inventory item");
    return {
      ...item,
      totalPrice: item.quantity * item.pricePerUnit,
      isLowStock: item.quantity <= item.minStock,
    };
  }

  async create(input: CreateInventoryItemInput) {
    const validated = createInventoryItemSchema.parse(input);
    const item = await prisma.inventoryItem.create({ data: validated });
    logger.info(`Inventory item created: ${item.name}`);
    return item;
  }

  async update(id: string, input: UpdateInventoryItemInput) {
    const validated = updateInventoryItemSchema.parse(input);
    await this.findById(id);
    const item = await prisma.inventoryItem.update({ where: { id }, data: validated });
    logger.info(`Inventory item updated: ${item.name}`);
    return item;
  }

  async addStock(id: string, input: AddStockInput, userId: string) {
    const validated = addStockSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundError("Inventory item");

      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: { quantity: { increment: validated.quantityAdded } },
      });

      await tx.inventoryStockLog.create({
        data: {
          inventoryItemId: id,
          quantityAdded: validated.quantityAdded,
          note: validated.note,
          addedById: userId,
        },
      });

      logger.info(`Stock added: ${validated.quantityAdded} ${item.unit} of ${item.name}`);
      return {
        ...updatedItem,
        totalPrice: updatedItem.quantity * updatedItem.pricePerUnit,
      };
    });
  }

  async recordUsage(id: string, input: RecordUsageInput, userId: string) {
    const validated = recordUsageSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundError("Inventory item");

      if (item.quantity < validated.quantityUsed) {
        throw new AppError(
          `Insufficient stock. Available: ${item.quantity} ${item.unit}`
        );
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: { quantity: { decrement: validated.quantityUsed } },
      });

      await tx.inventoryUsageLog.create({
        data: {
          inventoryItemId: id,
          quantityUsed: validated.quantityUsed,
          note: validated.note,
          takenById: userId,
        },
      });

      logger.info(`Stock used: ${validated.quantityUsed} ${item.unit} of ${item.name}`);
      return {
        ...updatedItem,
        totalPrice: updatedItem.quantity * updatedItem.pricePerUnit,
      };
    });
  }

  // Calculate total inventory value
  async getTotalValue() {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { quantity: true, pricePerUnit: true },
    });

    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );

    return { totalValue, itemCount: items.length };
  }
}

export const inventoryService = new InventoryService();
