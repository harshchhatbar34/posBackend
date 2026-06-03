import { z } from "zod";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@/models/Order";
import { OrderItemStatus } from "@/models/OrderItem";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  tableId: z.string().min(1, "Table is required"),
  items: z.array(orderItemInputSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export const updateOrderItemStatusSchema = z.object({
  status: z.nativeEnum(OrderItemStatus),
});

export const recordPaymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const addOrderItemsSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "At least one item is required"),
});

export const removeOrderItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
});

export type AddOrderItemsInput = z.infer<typeof addOrderItemsSchema>;
export type RemoveOrderItemInput = z.infer<typeof removeOrderItemSchema>;
