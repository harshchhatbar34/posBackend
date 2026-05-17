import { z } from "zod";

export const createSectionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
});

export const updateSectionSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
