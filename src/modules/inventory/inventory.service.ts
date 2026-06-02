import mongoose from "mongoose";
import InventoryItem from "@/models/InventoryItem";
import InventoryStockLog from "@/models/InventoryStockLog";
import InventoryUsageLog from "@/models/InventoryUsageLog";
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

    const where: any = { isActive: true };
    if (params.location) where.location = { $regex: params.location, $options: "i" };
    if (search) where.name = { $regex: search, $options: "i" };

    const sortOpt: any = { [sortBy || "name"]: sortOrder === "desc" ? -1 : 1 };

    const [items, total] = await Promise.all([
      InventoryItem.find(where).sort(sortOpt).skip(skip).limit(pageSize).lean(),
      InventoryItem.countDocuments(where),
    ]);

    // Add computed totalPrice
    const enrichedItems = items.map((item) => ({
      ...item,
      id: item._id.toString(),
      totalPrice: item.quantity * item.pricePerUnit,
      isLowStock: item.quantity <= item.minStock,
    }));

    return { items: enrichedItems, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const item = await InventoryItem.findById(id).lean();
    if (!item) throw new NotFoundError("Inventory item");

    const stockLogs = await InventoryStockLog.find({ inventoryItemId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('addedBy', 'name id')
      .lean();

    const usageLogs = await InventoryUsageLog.find({ inventoryItemId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('takenBy', 'name id')
      .lean();

    return {
      ...item,
      id: item._id.toString(),
      stockLogs: stockLogs.map(l => ({ ...l, id: l._id.toString() })),
      usageLogs: usageLogs.map(l => ({ ...l, id: l._id.toString() })),
      totalPrice: item.quantity * item.pricePerUnit,
      isLowStock: item.quantity <= item.minStock,
    };
  }

  async create(input: CreateInventoryItemInput) {
    const validated = createInventoryItemSchema.parse(input);
    const item = await InventoryItem.create(validated);
    logger.info(`Inventory item created: ${item.name}`);
    return item;
  }

  async update(id: string, input: UpdateInventoryItemInput) {
    const validated = updateInventoryItemSchema.parse(input);
    const item = await InventoryItem.findByIdAndUpdate(id, validated, { new: true });
    if (!item) throw new NotFoundError("Inventory item");
    logger.info(`Inventory item updated: ${item.name}`);
    return item;
  }

  async addStock(id: string, input: AddStockInput, userId: string) {
    const validated = addStockSchema.parse(input);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const item = await InventoryItem.findById(id).session(session);
      if (!item) throw new NotFoundError("Inventory item");

      item.quantity += validated.quantityAdded;
      await item.save({ session });

      await InventoryStockLog.create(
        [{
          inventoryItemId: id,
          quantityAdded: validated.quantityAdded,
          note: validated.note,
          addedById: userId,
        }],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(`Stock added: ${validated.quantityAdded} ${item.unit} of ${item.name}`);
      return {
        ...item.toObject(),
        id: item._id.toString(),
        totalPrice: item.quantity * item.pricePerUnit,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async recordUsage(id: string, input: RecordUsageInput, userId: string) {
    const validated = recordUsageSchema.parse(input);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const item = await InventoryItem.findById(id).session(session);
      if (!item) throw new NotFoundError("Inventory item");

      if (item.quantity < validated.quantityUsed) {
        throw new AppError(`Insufficient stock. Available: ${item.quantity} ${item.unit}`);
      }

      item.quantity -= validated.quantityUsed;
      await item.save({ session });

      await InventoryUsageLog.create(
        [{
          inventoryItemId: id,
          quantityUsed: validated.quantityUsed,
          note: validated.note,
          takenById: userId,
        }],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(`Stock used: ${validated.quantityUsed} ${item.unit} of ${item.name}`);
      return {
        ...item.toObject(),
        id: item._id.toString(),
        totalPrice: item.quantity * item.pricePerUnit,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Calculate total inventory value
  async getTotalValue() {
    const items = await InventoryItem.find({ isActive: true }).select('quantity pricePerUnit').lean();

    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );

    return { totalValue, itemCount: items.length };
  }
}

export const inventoryService = new InventoryService();
