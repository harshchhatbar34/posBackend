import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  categoryId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  isAvailable: boolean;
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
    isAvailable: { type: Boolean, default: true },
    image: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
