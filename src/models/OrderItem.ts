import mongoose, { Schema, Document } from 'mongoose';

export enum OrderItemStatus {
  PENDING = 'PENDING',
  UNDER_COOK = 'UNDER_COOK',
  COOKED = 'COOKED',
}

export interface IOrderItem extends Document {
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  status: OrderItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: Object.values(OrderItemStatus), default: OrderItemStatus.PENDING },
  },
  { timestamps: true }
);

export default mongoose.models.OrderItem || mongoose.model<IOrderItem>('OrderItem', OrderItemSchema);
