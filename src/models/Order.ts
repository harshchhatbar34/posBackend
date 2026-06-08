import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COOKED = 'COOKED',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

export interface IOrder extends Document {
  tableId: mongoose.Types.ObjectId;
  status: OrderStatus;
  takenById: mongoose.Types.ObjectId;
  chefId?: mongoose.Types.ObjectId;
  servedById?: mongoose.Types.ObjectId;
  receivedById?: mongoose.Types.ObjectId;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: Date;
  cookedAt?: Date;
  servedAt?: Date;
  notes?: string;
  customerName?: string;
  customerNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    takenById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chefId: { type: Schema.Types.ObjectId, ref: 'User' },
    servedById: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedById: { type: Schema.Types.ObjectId, ref: 'User' },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.UNPAID },
    paidAt: { type: Date },
    cookedAt: { type: Date },
    servedAt: { type: Date },
    notes: { type: String },
    customerName: { type: String },
    customerNumber: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
