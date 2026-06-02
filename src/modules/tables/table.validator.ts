import { z } from "zod";
import { TableStatus } from "@/models/Table";

export const createTableSchema = z.object({
  tableNumber: z.number().int().positive("Table number must be positive"),
  sectionId: z.string().min(1, "Section is required"),
});

export const updateTableSchema = z.object({
  tableNumber: z.number().int().positive().optional(),
  sectionId: z.string().optional(),
  status: z.nativeEnum(TableStatus).optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
