import mongoose, { Schema, Document } from 'mongoose';

// 3-state availability enum
// ACTIVE   → product is live and available
// INACTIVE → product exists but is temporarily unavailable (not shown as available)
// DELETED  → soft-deleted, completely hidden from all API responses
export enum ProductAvailability {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED  = 'DELETED',
}

export interface IProduct extends Document {
  name: string;
  price: number;
  categoryId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  availability: ProductAvailability;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    availability: {
      type: String,
      enum: Object.values(ProductAvailability),
      default: ProductAvailability.ACTIVE,
    },
    image: { type: String },
  },
  { timestamps: true }
);

// Index to speed up the common "exclude deleted" query
ProductSchema.index({ availability: 1 });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
