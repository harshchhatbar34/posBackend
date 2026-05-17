import prisma from "@/lib/prisma";
import { logger } from "@/utils/logger";

// ============ Kitchen Service ============

export class KitchenService {
  // Get all active kitchen orders (sorted by creation time ASC)
  async getKitchenOrders(sectionId?: string) {
    const where: Record<string, unknown> = {
      status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
    };

    if (sectionId) {
      where.table = { sectionId };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: {
          include: { section: { select: { id: true, name: true } } },
        },
        takenBy: { select: { id: true, name: true } },
        chef: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return orders;
  }

  // Get aggregated summary (SQL GROUP BY) for kitchen top section
  async getKitchenSummary(sectionId?: string) {
    // Use raw SQL for aggregation queries
    const sectionFilter = sectionId
      ? `AND t."sectionId" = '${sectionId}'`
      : "";

    const summary = await prisma.$queryRawUnsafe<
      Array<{
        product_name: string;
        product_price: number;
        total_quantity: number;
        total_amount: number;
      }>
    >(`
      SELECT 
        p.name as product_name,
        p.price as product_price,
        SUM(oi.quantity)::int as total_quantity,
        SUM(oi.quantity * oi.price) as total_amount
      FROM order_items oi
      JOIN orders o ON oi."orderId" = o.id
      JOIN products p ON oi."productId" = p.id
      JOIN tables t ON o."tableId" = t.id
      WHERE o.status IN ('PENDING', 'IN_PROGRESS')
        AND oi.status IN ('PENDING', 'UNDER_COOK')
        ${sectionFilter}
      GROUP BY p.id, p.name, p.price
      ORDER BY total_quantity DESC
    `);

    return summary.map((item) => ({
      name: item.product_name,
      price: item.product_price,
      quantity: item.total_quantity,
      totalAmount: item.total_amount,
    }));
  }

  // Get kitchen stats
  async getKitchenStats() {
    const [pending, inProgress, completed, todayOrders] = await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "IN_PROGRESS" } }),
      prisma.order.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return { pending, inProgress, completed, todayOrders };
  }
}

export const kitchenService = new KitchenService();
