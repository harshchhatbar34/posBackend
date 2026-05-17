import prisma from "@/lib/prisma";

// ============ Reports Service ============

export class ReportsService {
  // Sales report
  async getSalesReport(startDate?: string, endDate?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: Record<string, unknown> = {
      paymentStatus: "PAID",
      ...(Object.keys(dateFilter).length > 0 ? { paidAt: dateFilter } : {}),
    };

    const [totalSales, orderCount, paymentBreakdown, topProducts, sectionWiseSales] =
      await Promise.all([
        // Total sales
        prisma.order.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        // Order count
        prisma.order.count({ where }),
        // Payment method breakdown
        prisma.order.groupBy({
          by: ["paymentMethod"],
          where,
          _sum: { totalAmount: true },
          _count: true,
        }),
        // Top selling products
        prisma.$queryRawUnsafe<
          Array<{
            product_name: string;
            total_quantity: number;
            total_revenue: number;
          }>
        >(`
          SELECT 
            p.name as product_name,
            SUM(oi.quantity)::int as total_quantity,
            SUM(oi.quantity * oi.price) as total_revenue
          FROM order_items oi
          JOIN orders o ON oi."orderId" = o.id
          JOIN products p ON oi."productId" = p.id
          WHERE o."paymentStatus" = 'PAID'
            ${startDate ? `AND o."paidAt" >= '${startDate}'` : ""}
            ${endDate ? `AND o."paidAt" <= '${endDate}'` : ""}
          GROUP BY p.id, p.name
          ORDER BY total_revenue DESC
          LIMIT 20
        `),
        // Section-wise sales
        prisma.$queryRawUnsafe<
          Array<{
            section_name: string;
            order_count: number;
            total_revenue: number;
          }>
        >(`
          SELECT 
            s.name as section_name,
            COUNT(DISTINCT o.id)::int as order_count,
            SUM(o."totalAmount") as total_revenue
          FROM orders o
          JOIN tables t ON o."tableId" = t.id
          JOIN sections s ON t."sectionId" = s.id
          WHERE o."paymentStatus" = 'PAID'
            ${startDate ? `AND o."paidAt" >= '${startDate}'` : ""}
            ${endDate ? `AND o."paidAt" <= '${endDate}'` : ""}
          GROUP BY s.id, s.name
          ORDER BY total_revenue DESC
        `),
      ]);

    return {
      totalSales: totalSales._sum.totalAmount || 0,
      orderCount,
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.paymentMethod,
        total: p._sum.totalAmount || 0,
        count: p._count,
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

  // Order report
  async getOrderReport(startDate?: string, endDate?: string) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: Record<string, unknown> = {
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };

    const [statusBreakdown, dailyOrders] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.$queryRawUnsafe<
        Array<{
          date: string;
          order_count: number;
          total_amount: number;
        }>
      >(`
        SELECT 
          DATE(o."createdAt") as date,
          COUNT(*)::int as order_count,
          COALESCE(SUM(o."totalAmount"), 0) as total_amount
        FROM orders o
        WHERE 1=1
          ${startDate ? `AND o."createdAt" >= '${startDate}'` : ""}
          ${endDate ? `AND o."createdAt" <= '${endDate}'` : ""}
        GROUP BY DATE(o."createdAt")
        ORDER BY date DESC
        LIMIT 30
      `),
    ]);

    return {
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.totalAmount || 0,
      })),
      dailyOrders: dailyOrders.map((d) => ({
        date: d.date,
        orderCount: d.order_count,
        totalAmount: d.total_amount,
      })),
    };
  }

  // Inventory report
  async getInventoryReport() {
    const [items, totalValue, lowStockItems, recentUsage] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { quantity: true, pricePerUnit: true },
      }),
      prisma.inventoryItem.findMany({
        where: {
          isActive: true,
          quantity: { lte: prisma.inventoryItem.fields.minStock as unknown as number },
        },
      }),
      prisma.inventoryUsageLog.findMany({
        include: {
          inventoryItem: { select: { name: true, unit: true } },
          takenBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const totalInventoryValue = totalValue.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );

    return {
      totalItems: items.length,
      totalInventoryValue,
      items: items.map((item) => ({
        ...item,
        totalPrice: item.quantity * item.pricePerUnit,
        isLowStock: item.quantity <= item.minStock,
      })),
      lowStockCount: items.filter((i) => i.quantity <= i.minStock).length,
      recentUsage,
    };
  }
}

export const reportsService = new ReportsService();
