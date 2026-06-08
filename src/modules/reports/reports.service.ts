import mongoose from "mongoose";
import Order, { PaymentStatus } from "@/models/Order";
import OrderItem from "@/models/OrderItem";
import InventoryItem from "@/models/InventoryItem";
import InventoryUsageLog from "@/models/InventoryUsageLog";
import Table from "@/models/Table";

export class ReportsService {
  async getSalesReport(startDate?: string, endDate?: string, sectionId?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchObj: any = { paymentStatus: PaymentStatus.PAID };
    if (Object.keys(dateFilter).length > 0) {
      matchObj.paidAt = dateFilter;
    }

    let tableIds: mongoose.Types.ObjectId[] = [];
    if (sectionId) {
      const tables = await Table.find({ sectionId: new mongoose.Types.ObjectId(sectionId) }).select("_id").lean();
      tableIds = tables.map((t) => t._id as mongoose.Types.ObjectId);
      matchObj.tableId = { $in: tableIds };
    }

    const [totalSalesAgg, orderCount, paymentBreakdownAgg, topProducts, sectionWiseSales] =
      await Promise.all([
        Order.aggregate([{ $match: matchObj }, { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } }]),
        Order.countDocuments(matchObj),
        Order.aggregate([
          { $match: matchObj },
          { $group: { _id: "$paymentMethod", totalAmount: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]),
        OrderItem.aggregate([
          {
            $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" }
          },
          { $unwind: "$order" },
          {
            $match: {
              "order.paymentStatus": PaymentStatus.PAID,
              ...(Object.keys(dateFilter).length > 0 ? { "order.paidAt": dateFilter } : {}),
              ...(sectionId ? { "order.tableId": { $in: tableIds } } : {}),
            },
          },
          {
            $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" }
          },
          { $unwind: "$product" },
          {
            $group: {
              _id: "$product._id",
              product_name: { $first: "$product.name" },
              total_quantity: { $sum: "$quantity" },
              total_revenue: { $sum: { $multiply: ["$quantity", "$price"] } }
            }
          },
          { $sort: { total_revenue: -1 } },
          { $limit: 20 }
        ]),
        Order.aggregate([
          { $match: matchObj },
          {
            $lookup: { from: "tables", localField: "tableId", foreignField: "_id", as: "table" }
          },
          { $unwind: "$table" },
          {
            $lookup: { from: "sections", localField: "table.sectionId", foreignField: "_id", as: "section" }
          },
          { $unwind: "$section" },
          {
            $group: {
              _id: "$section._id",
              section_name: { $first: "$section.name" },
              order_count: { $sum: 1 },
              total_revenue: { $sum: "$totalAmount" }
            }
          },
          { $sort: { total_revenue: -1 } }
        ])
      ]);

    const totalSales = totalSalesAgg[0]?.totalAmount || 0;

    return {
      totalSales,
      orderCount,
      paymentBreakdown: paymentBreakdownAgg.map((p) => ({
        method: p._id,
        total: p.totalAmount || 0,
        count: p.count,
      })),
      topProducts: topProducts.map((p) => ({
        name: p.product_name,
        quantity: p.total_quantity,
        revenue: p.total_revenue,
      })),
      sectionWiseSales: sectionWiseSales.map((s) => ({
        section: s.section_name,
        orderCount: s.order_count,
        revenue: s.total_revenue,
      })),
    };
  }

  async getOrderReport(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchObj: any = {};
    if (Object.keys(dateFilter).length > 0) {
      matchObj.createdAt = dateFilter;
    }

    const [statusBreakdownAgg, dailyOrdersAgg] = await Promise.all([
      Order.aggregate([
        { $match: matchObj },
        { $group: { _id: "$status", totalAmount: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: matchObj },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            order_count: { $sum: 1 },
            total_amount: { $sum: "$totalAmount" }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);

    return {
      statusBreakdown: statusBreakdownAgg.map((s) => ({
        status: s._id,
        count: s.count,
        totalAmount: s.totalAmount || 0,
      })),
      dailyOrders: dailyOrdersAgg.map((d) => ({
        date: d._id,
        orderCount: d.order_count,
        totalAmount: d.total_amount,
      })),
    };
  }

  async getInventoryReport() {
    const [items, totalValue, recentUsage] = await Promise.all([
      InventoryItem.find({ isActive: true }).sort({ name: 1 }).lean(),
      InventoryItem.find({ isActive: true }).select('quantity pricePerUnit').lean(),
      InventoryUsageLog.find()
        .populate('inventoryItemId', 'name unit')
        .populate('takenById', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    const totalInventoryValue = totalValue.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );

    const enrichedItems = items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.pricePerUnit,
      isLowStock: item.quantity <= item.minStock,
    }));

    return {
      totalItems: items.length,
      totalInventoryValue,
      items: enrichedItems,
      lowStockCount: enrichedItems.filter((i) => i.isLowStock).length,
      recentUsage: recentUsage.map(r => {
        const itemDoc: any = r.inventoryItemId;
        const userDoc: any = r.takenById;
        return {
          ...r,
          inventoryItem: itemDoc ? { name: itemDoc.name, unit: itemDoc.unit } : null,
          takenBy: userDoc ? { name: userDoc.name } : null
        };
      }),
    };
  }
}

export const reportsService = new ReportsService();
