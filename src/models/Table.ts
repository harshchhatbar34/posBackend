import mongoose, { Schema, Document } from 'mongoose';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

export interface ITable extends Document {
  tableNumber: number;
  sectionId: mongoose.Types.ObjectId;
  status: TableStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema: Schema = new Schema(
  {
    tableNumber: { type: Number, required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    status: { type: String, enum: Object.values(TableStatus), default: TableStatus.AVAILABLE },
  },
  { timestamps: true }
);

TableSchema.index({ tableNumber: 1, sectionId: 1 }, { unique: true });

export default mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);
