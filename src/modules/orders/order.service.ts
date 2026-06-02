import mongoose from "mongoose";
import Order, { OrderStatus, PaymentStatus } from "@/models/Order";
import OrderItem, { OrderItemStatus } from "@/models/OrderItem";
import OrderLog from "@/models/OrderLog";
import Product from "@/models/Product";
import Table, { TableStatus } from "@/models/Table";
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
import { NotFoundError, AppError } from "@/utils/errors";
import { paginationMeta } from "@/utils/api-response";
import { logger } from "@/utils/logger";

export class OrderService {
  async findAll(params: PaginationParams & { status?: string; tableId?: string; paymentStatus?: string; startDate?: string; endDate?: string; }) {
    const { page, pageSize, sortBy, sortOrder } = paginationSchema.parse(params);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.tableId) where.tableId = new mongoose.Types.ObjectId(params.tableId);
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.$gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.$lte = new Date(params.endDate);
    }

    const sortOpt: any = { [sortBy || "createdAt"]: sortOrder === "desc" ? -1 : 1 };

    const [orders, total] = await Promise.all([
      Order.find(where)
        .populate({ path: 'tableId', populate: { path: 'sectionId', select: 'name' } })
        .populate('takenById', 'name')
        .populate('chefId', 'name')
        .populate('servedById', 'name')
        .sort(sortOpt)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Order.countDocuments(where),
    ]);

    const orderIds = orders.map(o => o._id);
    const allItems = await OrderItem.find({ orderId: { $in: orderIds } }).populate('productId', 'name price').lean();
    
    const enrichedOrders = orders.map(order => {
      const items = allItems.filter(i => i.orderId.toString() === order._id.toString());
      
      const tableDoc: any = order.tableId;
      const takenByDoc: any = order.takenById;
      const chefDoc: any = order.chefId;
      const servedByDoc: any = order.servedById;

      return {
        ...order,
        id: order._id.toString(),
        table: tableDoc ? { ...tableDoc, id: tableDoc._id.toString(), section: tableDoc.sectionId ? { id: tableDoc.sectionId._id.toString(), name: tableDoc.sectionId.name } : null } : null,
        takenBy: takenByDoc ? { ...takenByDoc, id: takenByDoc._id.toString() } : null,
        chef: chefDoc ? { ...chefDoc, id: chefDoc._id.toString() } : null,
        servedBy: servedByDoc ? { ...servedByDoc, id: servedByDoc._id.toString() } : null,
        items: items.map(i => {
          const prodDoc: any = i.productId;
          return {
            ...i,
            id: i._id.toString(),
            product: prodDoc ? { ...prodDoc, id: prodDoc._id.toString() } : null
          };
        }),
        _count: { items: items.length }
      };
    });

    return { orders: enrichedOrders, meta: paginationMeta(page, pageSize, total) };
  }

  async findById(id: string) {
    const order = await Order.findById(id)
      .populate({ path: 'tableId', populate: { path: 'sectionId', select: 'name' } })
      .populate('takenById', 'name')
      .populate('chefId', 'name')
      .populate('servedById', 'name')
      .lean();
      
    if (!order) throw new NotFoundError("Order");

    const items = await OrderItem.find({ orderId: id }).populate('productId').lean();
    const logs = await OrderLog.find({ orderId: id }).populate('userId', 'name').sort({ createdAt: 1 }).lean();

    const tableDoc: any = order.tableId;
    const takenByDoc: any = order.takenById;
    const chefDoc: any = order.chefId;
    const servedByDoc: any = order.servedById;

    return {
      ...order,
      id: order._id.toString(),
      table: tableDoc ? { ...tableDoc, id: tableDoc._id.toString(), section: tableDoc.sectionId ? { id: tableDoc.sectionId._id.toString(), name: tableDoc.sectionId.name } : null } : null,
      takenBy: takenByDoc ? { ...takenByDoc, id: takenByDoc._id.toString() } : null,
      chef: chefDoc ? { ...chefDoc, id: chefDoc._id.toString() } : null,
      servedBy: servedByDoc ? { ...servedByDoc, id: servedByDoc._id.toString() } : null,
      items: items.map(i => {
        const prodDoc: any = i.productId;
        return { ...i, id: i._id.toString(), product: prodDoc ? { ...prodDoc, id: prodDoc._id.toString() } : null };
      }),
      logs: logs.map(l => {
        const userDoc: any = l.userId;
        return { ...l, id: l._id.toString(), user: userDoc ? { ...userDoc, id: userDoc._id.toString() } : null };
      })
    };
  }

  async create(input: CreateOrderInput, userId: string) {
    const validated = createOrderSchema.parse(input);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const productIds = validated.items.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds }, isAvailable: true }).session(session);

      if (products.length !== productIds.length) {
        throw new AppError("Some products are unavailable or not found");
      }

      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      let totalAmount = 0;
      const orderItemsData = validated.items.map((item) => {
        const product = productMap.get(item.productId)!;
        totalAmount += product.price * item.quantity;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        };
      });

      const orderArr = await Order.create([{
        tableId: validated.tableId,
        takenById: userId,
        totalAmount,
        notes: validated.notes,
      }], { session });
      const order = orderArr[0];

      const mappedItems = orderItemsData.map(i => ({ ...i, orderId: order._id }));
      await OrderItem.create(mappedItems, { session });

      await Table.findByIdAndUpdate(validated.tableId, { status: TableStatus.OCCUPIED }, { session });

      await OrderLog.create([{
        orderId: order._id,
        action: "ORDER_CREATED",
        details: `Order created with ${orderItemsData.length} items. Total: ₹${totalAmount}`,
        userId,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`Order created: ${order._id} by user ${userId}`);
      return this.findById(order._id.toString());
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async updateStatus(orderId: string, input: UpdateOrderStatusInput, userId: string) {
    const validated = updateOrderStatusSchema.parse(input);
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order");

    const validTransitions: Record<string, string[]> = {
      PENDING: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: ["SERVED"],
      SERVED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(validated.status)) {
      throw new AppError(`Cannot transition from ${order.status} to ${validated.status}`);
    }

    const updateData: any = { status: validated.status };
    if (validated.status === "SERVED") updateData.servedById = userId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (validated.status === "CANCELLED") {
        const otherOrders = await Order.countDocuments({
          tableId: order.tableId,
          _id: { $ne: orderId },
          status: { $in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] },
        }).session(session);

        if (otherOrders === 0) {
          await Table.findByIdAndUpdate(order.tableId, { status: TableStatus.AVAILABLE }, { session });
        }
      }

      await Order.findByIdAndUpdate(orderId, updateData, { session });

      await OrderLog.create([{
        orderId,
        action: `STATUS_CHANGED_TO_${validated.status}`,
        details: `Order status changed from ${order.status} to ${validated.status}`,
        userId,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`Order ${orderId} status changed to ${validated.status}`);
      return this.findById(orderId);
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async updateItemStatus(itemId: string, input: UpdateOrderItemStatusInput, userId: string) {
    const validated = updateOrderItemStatusSchema.parse(input);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const item = await OrderItem.findById(itemId).populate('productId').session(session);
      if (!item) throw new NotFoundError("Order item");

      const validTransitions: Record<string, string[]> = {
        PENDING: ["UNDER_COOK"],
        UNDER_COOK: ["COOKED"],
        COOKED: [],
      };

      if (!validTransitions[item.status]?.includes(validated.status)) {
        throw new AppError(`Cannot transition item from ${item.status} to ${validated.status}`);
      }

      item.status = validated.status as any;
      await item.save({ session });

      const order = await Order.findById(item.orderId).session(session);

      if (validated.status === "UNDER_COOK" && (!order || !order.chefId)) {
        await Order.findByIdAndUpdate(item.orderId, { chefId: userId, status: OrderStatus.IN_PROGRESS }, { session });
      }

      if (validated.status === "COOKED") {
        const allItems = await OrderItem.find({ orderId: item.orderId }).session(session);
        const allCooked = allItems.every((i) => i.id === itemId || i.status === "COOKED");
        if (allCooked) {
          await Order.findByIdAndUpdate(item.orderId, { status: OrderStatus.COMPLETED }, { session });
        }
      }

      const prodName = (item.productId as any).name || "Item";
      await OrderLog.create([{
        orderId: item.orderId,
        action: `ITEM_STATUS_${validated.status}`,
        details: `Item "${prodName}" status changed to ${validated.status}`,
        userId,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`Order item ${itemId} status changed to ${validated.status}`);
      return item;
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async recordPayment(orderId: string, input: RecordPaymentInput, userId: string) {
    const validated = recordPaymentSchema.parse(input);
    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError("Order");

    if (order.paymentStatus === "PAID") {
      throw new AppError("Order is already paid");
    }

    if (order.status !== "SERVED") {
      throw new AppError("Order must be served before recording payment");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentMethod: validated.paymentMethod,
        paymentStatus: "PAID",
        paidAt: new Date(),
      }, { session });

      const unpaidOrders = await Order.countDocuments({
        tableId: order.tableId,
        paymentStatus: PaymentStatus.UNPAID,
        status: { $ne: OrderStatus.CANCELLED },
      }).session(session);

      if (unpaidOrders === 0) {
        await Table.findByIdAndUpdate(order.tableId, { status: TableStatus.AVAILABLE }, { session });
      }

      await OrderLog.create([{
        orderId,
        action: "PAYMENT_RECEIVED",
        details: `Payment received via ${validated.paymentMethod}. Amount: ₹${order.totalAmount}`,
        userId,
      }], { session });

      await session.commitTransaction();
      session.endSession();

      logger.info(`Payment recorded for order ${orderId}`);
      return this.findById(orderId);
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }
}

export const orderService = new OrderService();
