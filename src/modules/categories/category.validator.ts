import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  sectionId: z.string().min(1, "Section is required"),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  sectionId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

