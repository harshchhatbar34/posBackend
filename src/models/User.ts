import mongoose, { Schema, Document } from 'mongoose';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CHEF = 'CHEF',
  HELPER = 'HELPER',
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: Role;
  isActive: boolean;
  resetOtp?: string;
  resetOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), default: Role.HELPER },
    isActive: { type: Boolean, default: true },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
