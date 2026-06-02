import { z } from "zod";
import { InventoryUnit } from "@/models/InventoryItem";

export const createInventoryItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  quantity: z.number().min(0).default(0),
  unit: z.nativeEnum(InventoryUnit).default(InventoryUnit.PIECE),
  location: z.string().optional(),
  pricePerUnit: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(2).optional(),
  unit: z.nativeEnum(InventoryUnit).optional(),
  location: z.string().optional(),
  pricePerUnit: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const addStockSchema = z.object({
  quantityAdded: z.number().positive("Quantity must be positive"),
  note: z.string().optional(),
});

export const recordUsageSchema = z.object({
  quantityUsed: z.number().positive("Quantity must be positive"),
  note: z.string().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type RecordUsageInput = z.infer<typeof recordUsageSchema>;
