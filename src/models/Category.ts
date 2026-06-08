import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  sectionId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for fast section-filtered queries
CategorySchema.index({ sectionId: 1, isActive: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

