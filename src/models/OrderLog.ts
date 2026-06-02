import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderLog extends Document {
  orderId: mongoose.Types.ObjectId;
  action: string;
  details?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const OrderLogSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    action: { type: String, required: true },
    details: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.OrderLog || mongoose.model<IOrderLog>('OrderLog', OrderLogSchema);
