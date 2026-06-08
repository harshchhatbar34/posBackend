import mongoose from "mongoose";
import Order, { OrderStatus } from "@/models/Order";
import OrderItem, { OrderItemStatus } from "@/models/OrderItem";
import Table from "@/models/Table";
import { AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";

// ============ Kitchen Service ============

export class KitchenService {
  // Get all active kitchen orders (sorted by creation time ASC)
  async getKitchenOrders(sectionId?: string) {
    const match: any = {
      status: { $in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
    };

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "tables",
          localField: "tableId",
          foreignField: "_id",
          as: "table",
        },
      },
      { $unwind: "$table" },
    ];

    if (sectionId) {
      pipeline.push({
        $match: { "table.sectionId": new mongoose.Types.ObjectId(sectionId) },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "sections",
          localField: "table.sectionId",
          foreignField: "_id",
          as: "table.section",
        },
      },
      { $unwind: { path: "$table.section", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "takenById",
          foreignField: "_id",
          as: "takenBy",
        },
      },
      { $unwind: { path: "$takenBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "chefId",
          foreignField: "_id",
          as: "chef",
        },
      },
      { $unwind: { path: "$chef", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "orderId",
          as: "items",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDocs",
        },
      },
      { $sort: { createdAt: 1 } }
    );

    const orders = await Order.aggregate(pipeline);

    // Map products to items manually
    return orders.map((o) => {
      const mappedItems = o.items.map((item: any) => {
        const product = o.productDocs.find((p: any) => p._id.toString() === item.productId.toString());
        return {
          ...item,
          id: item._id.toString(),
          product: product ? { id: product._id.toString(), name: product.name, price: product.price } : null,
        };
      });

      return {
        ...o,
        id: o._id.toString(),
        table: {
          ...o.table,
          id: o.table._id.toString(),
          section: o.table.section ? { id: o.table.section._id.toString(), name: o.table.section.name } : null,
        },
        takenBy: o.takenBy ? { id: o.takenBy._id.toString(), name: o.takenBy.name } : null,
        chef: o.chef ? { id: o.chef._id.toString(), name: o.chef.name } : null,
        items: mappedItems,
      };
    });
  }

  // Get aggregated summary for kitchen top section
  async getKitchenSummary(sectionId?: string) {
    const pipeline: any[] = [
      {
        $match: {
          status: { $in: [OrderItemStatus.PENDING, OrderItemStatus.UNDER_COOK] },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $match: {
          "order.status": { $in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        },
      },
      {
        $lookup: {
          from: "tables",
          localField: "order.tableId",
          foreignField: "_id",
          as: "table",
        },
      },
      { $unwind: "$table" },
    ];

    if (sectionId) {
      pipeline.push({
        $match: { "table.sectionId": new mongoose.Types.ObjectId(sectionId) },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product._id",
          product_name: { $first: "$product.name" },
          product_price: { $first: "$product.price" },
          total_quantity: { $sum: "$quantity" },
          total_amount: { $sum: { $multiply: ["$quantity", "$price"] } },
        },
      },
      { $sort: { total_quantity: -1 } }
    );

    const summary = await OrderItem.aggregate(pipeline);

    return summary.map((item) => ({
      name: item.product_name,
      price: item.product_price,
      quantity: item.total_quantity,
      totalAmount: item.total_amount,
    }));
  }

  // Get kitchen stats
  async getKitchenStats(sectionId?: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const query: any = {};
    if (sectionId) {
      const tables = await Table.find({ sectionId: new mongoose.Types.ObjectId(sectionId) }).select("_id").lean();
      query.tableId = { $in: tables.map((t: any) => t._id) };
    }

    const [pending, inProgress, completed, todayOrders] = await Promise.all([
      Order.countDocuments({ ...query, status: OrderStatus.PENDING }),
      Order.countDocuments({ ...query, status: OrderStatus.IN_PROGRESS }),
      Order.countDocuments({
        ...query,
        status: OrderStatus.COMPLETED,
        updatedAt: { $gte: startOfToday },
      }),
      Order.countDocuments({
        ...query,
        createdAt: { $gte: startOfToday },
      }),
    ]);

    return { pending, inProgress, completed, todayOrders };
  }
}

export const kitchenService = new KitchenService();
