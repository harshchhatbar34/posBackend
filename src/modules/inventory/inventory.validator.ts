import { z } from "zod";
import { InventoryUnit } from "@/models/InventoryItem";

export const createInventoryItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  initialQuantity: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().min(0).default(0),
  unit: z.nativeEnum(InventoryUnit).default(InventoryUnit.PIECE),
  location: z.string().optional(),
  pricePerUnit: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(2).optional(),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.nativeEnum(InventoryUnit).optional(),
  location: z.string().optional(),
  pricePerUnit: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const addStockSchema = z.object({
  quantityAdded: z.coerce.number().positive("Quantity must be positive"),
  note: z.string().optional(),
});

export const recordUsageSchema = z.object({
  quantityUsed: z.coerce.number().positive("Quantity must be positive"),
  note: z.string().min(1, "Note is required"),
});

export const updateUsageLogSchema = z.object({
  quantityUsed: z.coerce.number().positive("Quantity must be positive").optional(),
  note: z.string().min(1, "Note cannot be empty").optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type RecordUsageInput = z.infer<typeof recordUsageSchema>;
export type UpdateUsageLogInput = z.infer<typeof updateUsageLogSchema>;
