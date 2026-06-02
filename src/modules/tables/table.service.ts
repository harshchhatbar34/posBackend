import mongoose from "mongoose";
import Table from "@/models/Table";
import Order, { OrderStatus } from "@/models/Order";
import OrderItem from "@/models/OrderItem";
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

    const where: any = {};
    if (params.sectionId) where.sectionId = new mongoose.Types.ObjectId(params.sectionId);
    if (params.status) where.status = params.status;

    const sortOpt: any = { [sortBy || "tableNumber"]: sortOrder === "desc" ? -1 : 1 };

    const [tables, total] = await Promise.all([
      Table.find(where)
        .populate('sectionId', 'name')
        .sort(sortOpt)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Table.countDocuments(where),
    ]);

    const tableIds = tables.map(t => t._id);
    const ordersCounts = await Order.aggregate([
      { $match: { tableId: { $in: tableIds } } },
      { $group: { _id: "$tableId", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(ordersCounts.map(c => [c._id.toString(), c.count]));

    const enrichedTables = tables.map(t => ({
      ...t,
      id: t._id.toString(),
      section: t.sectionId ? { ...(t.sectionId as any), id: (t.sectionId as any)._id.toString() } : null,
      _count: { orders: countMap.get(t._id.toString()) || 0 }
    }));

    return { tables: enrichedTables, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const table = await Table.findById(id).populate('sectionId', 'name').lean();
    if (!table) throw new NotFoundError("Table");

    const activeOrders = await Order.find({
      tableId: id,
      status: { $in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
    }).lean();

    const orderIds = activeOrders.map(o => o._id);
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } }).populate('productId').lean();

    const orders = activeOrders.map(o => {
      const items = orderItems.filter(i => i.orderId.toString() === o._id.toString());
      return {
        ...o,
        id: o._id.toString(),
        items: items.map(i => {
          const prodDoc: any = i.productId;
          return {
            ...i,
            id: i._id.toString(),
            product: prodDoc ? { ...prodDoc, id: prodDoc._id.toString() } : null
          };
        })
      };
    });

    return {
      ...table,
      id: table._id.toString(),
      section: table.sectionId ? { ...(table.sectionId as any), id: (table.sectionId as any)._id.toString() } : null,
      orders
    };
  }

  async create(input: CreateTableInput) {
    const validated = createTableSchema.parse(input);
    const table = await Table.create(validated);
    logger.info(`Table created: #${table.tableNumber}`);
    return this.findById(table._id.toString());
  }

  async update(id: string, input: UpdateTableInput) {
    const validated = updateTableSchema.parse(input);
    const table = await Table.findByIdAndUpdate(id, validated, { new: true });
    if (!table) throw new NotFoundError("Table");
    logger.info(`Table updated: #${table.tableNumber}`);
    return this.findById(id);
  }

  async delete(id: string) {
    const table = await Table.findByIdAndDelete(id);
    if (!table) throw new NotFoundError("Table");
    logger.info(`Table deleted: ${id}`);
    return { message: "Table deleted successfully" };
  }
}

export const tableService = new TableService();
