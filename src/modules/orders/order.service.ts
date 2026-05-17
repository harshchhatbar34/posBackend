import prisma from "@/lib/prisma";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderItemStatusSchema,
  recordPaymentSchema,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type UpdateOrderItemStatusInput,
  type RecordPaymentInput,
} from "./order.validator";
import { paginationSchema, type PaginationParams } from "@/validators/common";
import { NotFoundError, AppError, ForbiddenError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

// ============ Order Service ============

export class OrderService {
  // ---- List Orders ----
  async findAll(
    params: PaginationParams & {
      status?: string;
      tableId?: string;
      paymentStatus?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const { page, pageSize, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.tableId) where.tableId = params.tableId;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate)
        (where.createdAt as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate)
        (where.createdAt as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: {
            include: { section: { select: { id: true, name: true } } },
          },
          takenBy: { select: { id: true, name: true } },
          chef: { select: { id: true, name: true } },
          servedBy: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, price: true } } },
          },
          _count: { select: { items: true } },
        },
        skip,
        take: pageSize,
        orderBy: { [sortBy || "createdAt"]: sortOrder },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, meta: paginationMeta(page, pageSize, total) };
  }

  // ---- Get Order By ID ----
  async findById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: {
          include: { section: { select: { id: true, name: true } } },
        },
        takenBy: { select: { id: true, name: true } },
        chef: { select: { id: true, name: true } },
        servedBy: { select: { id: true, name: true } },
        items: {
          include: { product: true },
        },
        logs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!order) throw new NotFoundError("Order");
    return order;
  }

  // ---- Create Order (Helper flow) ----
  async create(input: CreateOrderInput, userId: string) {
    const validated = createOrderSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // Get product prices
      const productIds = validated.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isAvailable: true },
      });

      if (products.length !== productIds.length) {
        throw new AppError("Some products are unavailable or not found");
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = validated.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        };
      });

      // Create order with items
      const order = await tx.order.create({
        data: {
          tableId: validated.tableId,
          takenById: userId,
          totalAmount,
          notes: validated.notes,
          items: {
            create: orderItems,
          },
        },
        include: {
          table: {
            include: { section: { select: { id: true, name: true } } },
          },
          takenBy: { select: { id: true, name: true } },
          items: {
            include: { product: true },
          },
        },
      });

      // Mark table as occupied
      await tx.table.update({
        where: { id: validated.tableId },
        data: { status: "OCCUPIED" },
      });

      // Create order log
      await tx.orderLog.create({
        data: {
          orderId: order.id,
          action: "ORDER_CREATED",
          details: `Order created with ${orderItems.length} items. Total: ₹${totalAmount}`,
          userId,
        },
      });

      logger.info(`Order created: ${order.id} by user ${userId}`);
      return order;
    });
  }

  // ---- Update Order Status ----
  async updateStatus(orderId: string, input: UpdateOrderStatusInput, userId: string) {
    const validated = updateOrderStatusSchema.parse(input);
    const order = await this.findById(orderId);

    // Business rules for status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: ["SERVED"],
      SERVED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(validated.status)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${validated.status}`
      );
    }

    const updateData: Record<string, unknown> = { status: validated.status };

    // If served, record who served
    if (validated.status === "SERVED") {
      updateData.servedById = userId;
    }

    // If cancelled and was pending, free the table
    if (validated.status === "CANCELLED") {
      // Check if there are other active orders on this table
      const otherOrders = await prisma.order.count({
        where: {
          tableId: order.tableId,
          id: { not: orderId },
          status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
        },
      });

      if (otherOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        table: { include: { section: { select: { id: true, name: true } } } },
        takenBy: { select: { id: true, name: true } },
        chef: { select: { id: true, name: true } },
        servedBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    // Log the action
    await prisma.orderLog.create({
      data: {
        orderId,
        action: `STATUS_CHANGED_TO_${validated.status}`,
        details: `Order status changed from ${order.status} to ${validated.status}`,
        userId,
      },
    });

    logger.info(`Order ${orderId} status changed to ${validated.status}`);
    return updated;
  }

  // ---- Update Order Item Status (Chef) ----
  async updateItemStatus(
    itemId: string,
    input: UpdateOrderItemStatusInput,
    userId: string
  ) {
    const validated = updateOrderItemStatusSchema.parse(input);

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item) throw new NotFoundError("Order item");

    // Validate transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ["UNDER_COOK"],
      UNDER_COOK: ["COOKED"],
      COOKED: [],
    };

    if (!validTransitions[item.status]?.includes(validated.status)) {
      throw new AppError(
        `Cannot transition item from ${item.status} to ${validated.status}`
      );
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: validated.status },
      include: { product: true, order: true },
    });

    // If first item goes to UNDER_COOK, assign chef to order
    if (validated.status === "UNDER_COOK" && !item.order.chefId) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { chefId: userId, status: "IN_PROGRESS" },
      });
    }

    // Check if all items are cooked -> mark order as COMPLETED
    if (validated.status === "COOKED") {
      const allItems = await prisma.orderItem.findMany({
        where: { orderId: item.orderId },
      });
      const allCooked = allItems.every(
        (i) => i.id === itemId || i.status === "COOKED"
      );
      if (allCooked) {
        await prisma.order.update({
          where: { id: item.orderId },
          data: { status: "COMPLETED" },
        });
      }
    }

    // Log the action
    await prisma.orderLog.create({
      data: {
        orderId: item.orderId,
        action: `ITEM_STATUS_${validated.status}`,
        details: `Item "${updatedItem.product.name}" status changed to ${validated.status}`,
        userId,
      },
    });

    logger.info(`Order item ${itemId} status changed to ${validated.status}`);
    return updatedItem;
  }

  // ---- Record Payment ----
  async recordPayment(orderId: string, input: RecordPaymentInput, userId: string) {
    const validated = recordPaymentSchema.parse(input);
    const order = await this.findById(orderId);

    if (order.paymentStatus === "PAID") {
      throw new AppError("Order is already paid");
    }

    if (order.status !== "SERVED") {
      throw new AppError("Order must be served before recording payment");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: validated.paymentMethod,
          paymentStatus: "PAID",
          paidAt: new Date(),
        },
        include: {
          table: { include: { section: { select: { id: true, name: true } } } },
          takenBy: { select: { id: true, name: true } },
          items: { include: { product: true } },
        },
      });

      // Check if all orders on this table are paid, then free the table
      const unpaidOrders = await tx.order.count({
        where: {
          tableId: order.tableId,
          paymentStatus: "UNPAID",
          status: { not: "CANCELLED" },
        },
      });

      if (unpaidOrders === 0) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE" },
        });
      }

      // Log the action
      await tx.orderLog.create({
        data: {
          orderId,
          action: "PAYMENT_RECEIVED",
          details: `Payment received via ${validated.paymentMethod}. Amount: ₹${order.totalAmount}`,
          userId,
        },
      });

      return updatedOrder;
    });

    logger.info(`Payment recorded for order ${orderId}`);
    return updated;
  }
}

export const orderService = new OrderService();
