import mongoose, { Schema, Document } from 'mongoose';

export enum InventoryUnit {
  KG = 'KG',
  GRAM = 'GRAM',
  LITER = 'LITER',
  ML = 'ML',
  PIECE = 'PIECE',
  PACKET = 'PACKET',
  BOX = 'BOX',
}

export interface IInventoryItem extends Document {
  name: string;
  quantity: number;
  unit: InventoryUnit;
  location?: string;
  pricePerUnit: number;
  minStock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, enum: Object.values(InventoryUnit), default: InventoryUnit.PIECE },
    location: { type: String },
    pricePerUnit: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.InventoryItem || mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
