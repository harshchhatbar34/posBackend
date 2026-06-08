import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryUsageLog extends Document {
  inventoryItemId: mongoose.Types.ObjectId;
  quantityUsed: number;
  note: string;
  takenById: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryUsageLogSchema: Schema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantityUsed: { type: Number, required: true },
    note: { type: String, required: true },
    takenById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.InventoryUsageLog || mongoose.model<IInventoryUsageLog>('InventoryUsageLog', InventoryUsageLogSchema);
