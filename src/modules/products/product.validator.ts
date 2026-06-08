import { z } from "zod";

// Note: validators use boolean isAvailable (what frontend sends).
// The service layer converts: true → "ACTIVE", false → "INACTIVE".
// "DELETED" is set only by the delete() method, never via user input.

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  price: z.coerce.number().positive("Price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  sectionId: z.string().min(1, "Section is required"),
  isAvailable: z.boolean().default(true),
  image: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  price: z.coerce.number().positive().optional(),
  categoryId: z.string().optional(),
  sectionId: z.string().optional(),
  isAvailable: z.boolean().optional(),
  image: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

