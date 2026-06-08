import mongoose, { Schema, Document } from 'mongoose';

export interface IProductLog extends Document {
  productId: mongoose.Types.ObjectId;
  action: string;
  details?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProductLogSchema: Schema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    action: { type: String, required: true },
    details: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.ProductLog || mongoose.model<IProductLog>('ProductLog', ProductLogSchema);
