import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryStockLog extends Document {
  inventoryItemId: mongoose.Types.ObjectId;
  quantityAdded: number;
  note?: string;
  addedById: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryStockLogSchema: Schema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantityAdded: { type: Number, required: true },
    note: { type: String },
    addedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.InventoryStockLog || mongoose.model<IInventoryStockLog>('InventoryStockLog', InventoryStockLogSchema);
